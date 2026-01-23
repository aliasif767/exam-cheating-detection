import cv2
import os
import json
import math
import numpy as np
from ultralytics import YOLO
import mediapipe as mp
from datetime import datetime
import glob
import sys
import torch
import contextlib

# --- AUDIO IMPORTS ---
import speech_recognition as sr
from pydub import AudioSegment
from pydub.silence import split_on_silence

# Safe Import for MoviePy (Handles v1.x and v2.x)
try:
    from moviepy.editor import VideoFileClip
except ImportError:
    from moviepy import VideoFileClip

# --- UTILS TO SUPPRESS NOISE ---
@contextlib.contextmanager
def suppress_stdout_stderr():
    """A context manager that redirects stdout and stderr to devnull"""
    with open(os.devnull, 'w') as fnull:
        with contextlib.redirect_stdout(fnull), contextlib.redirect_stderr(fnull):
            yield

class PersonFacePhoneDetector:
    def __init__(self, yolo_model="yolo11n.pt", confidence_threshold=0.35):
        # Hardware acceleration check
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"🚀 Initializing on device: {self.device}")

        # Initialize YOLO
        self.model = YOLO(yolo_model).to(self.device)
        self.conf_threshold = confidence_threshold
        
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=5,
            refine_landmarks=True,
            min_detection_confidence=0.3,
            min_tracking_confidence=0.3
        )
        
        # Parameters (these don't change)
        self.params = {
            'imgsz': 1088,                
            'phone_class_id': 67,         
            'person_class_id': 0,         
            'horizontal_threshold_multiplier': 10.0,
            'vertical_threshold_multiplier': 13.0,
            'consecutive_suspicious_frames': 10,
            'cheating_reset_frames': 30,
            'min_movement_for_detection': 40,
            'movement_window_frames': 30,
            'recalibration_enabled': True,
            'recalibration_frames': 90
        }
        self.debug_mode = True
        
        # Initialize state
        self._reset_state()

    def _reset_state(self):
        """Reset all tracking and detection state for new video processing"""
        # Tracking State
        self.person_registry = {}
        self.stable_id_counter = 1
        self.missing_persons = {}
        self.max_missing_frames = 30
        self.position_similarity_threshold = 300
        self.size_similarity_threshold = 0.8
        self.yolo_to_stable_mapping = {}
        
        # Movement Analysis State
        self.initial_face_sums = {}
        self.face_history = {}
        self.movement_history = {}
        self.cheating_detection = {}

    # --- Geometry Utilities ---
    def calculate_box_center(self, box):
        x1, y1, x2, y2 = box
        return ((x1 + x2) / 2, (y1 + y2) / 2)

    def calculate_box_area(self, box):
        x1, y1, x2, y2 = box
        return (x2 - x1) * (y2 - y1)

    def calculate_distance(self, point1, point2):
        return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

    def check_phone_proximity(self, person_box, phone_boxes):
        p_x1, p_y1, p_x2, p_y2 = person_box
        p_center = self.calculate_box_center(person_box)
        proximity_threshold = (p_y2 - p_y1) * 0.6 
        
        for ph_box in phone_boxes:
            ph_center = self.calculate_box_center(ph_box)
            distance = self.calculate_distance(p_center, ph_center)
            is_inside = (ph_center[0] > p_x1 and ph_center[0] < p_x2 and 
                         ph_center[1] > p_y1 and ph_center[1] < p_y2)
            
            if distance < proximity_threshold or is_inside:
                return True
        return False

    # --- Tracking Logic ---
    def find_best_stable_match(self, yolo_id, box):
        current_center = self.calculate_box_center(box)
        current_area = self.calculate_box_area(box)
        
        if yolo_id in self.yolo_to_stable_mapping:
            stable_id = self.yolo_to_stable_mapping[yolo_id]
            if stable_id in self.person_registry:
                last_box = self.person_registry[stable_id]['last_box']
                last_center = self.calculate_box_center(last_box)
                distance = self.calculate_distance(current_center, last_center)
                if distance < self.position_similarity_threshold:
                    return stable_id
                else:
                    del self.yolo_to_stable_mapping[yolo_id]
        
        best_match = None
        best_score = float('inf')
        
        for stable_id, missing_info in list(self.missing_persons.items()):
            last_box = missing_info['last_box']
            dist = self.calculate_distance(current_center, self.calculate_box_center(last_box))
            size_ratio = abs(current_area - self.calculate_box_area(last_box)) / max(current_area, 1)
            
            if dist < self.position_similarity_threshold * 2 and size_ratio < self.size_similarity_threshold:
                score = dist + (size_ratio * 100)
                if score < best_score:
                    best_score = score
                    best_match = stable_id
        
        return best_match

    def update_registry(self, yolo_id, box, landmark_sum, frame_count):
        stable_id = self.find_best_stable_match(yolo_id, box)
        
        if stable_id is not None:
            if stable_id in self.missing_persons:
                del self.missing_persons[stable_id]
            
            self.person_registry[stable_id].update({
                'current_yolo_id': yolo_id,
                'last_box': box,
                'last_seen_frame': frame_count
            })
            self.yolo_to_stable_mapping[yolo_id] = stable_id
        else:
            stable_id = self.stable_id_counter
            self.stable_id_counter += 1
            self.person_registry[stable_id] = {
                'current_yolo_id': yolo_id,
                'last_box': box,
                'first_seen_frame': frame_count,
                'last_seen_frame': frame_count
            }
            self.yolo_to_stable_mapping[yolo_id] = stable_id
            
            if landmark_sum:
                self.initial_face_sums[stable_id] = landmark_sum
            
            self.face_history[stable_id] = []
            self.movement_history[stable_id] = []
            self.cheating_detection[stable_id] = {
                'suspicious_frames': 0,
                'is_cheating': False,
                'cheating_incidents': [],
                'last_reset_frame': frame_count,
                'phone_detected_count': 0
            }
            
        return stable_id

    # --- Face Logic ---
    def get_face_landmarks(self, image, person_box):
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        x1, y1, x2, y2 = map(int, person_box)
        h = y2 - y1
        head_y2 = min(y2, y1 + int(h * 0.40)) 
        roi = rgb[y1:head_y2, x1:x2]
        
        if roi.size == 0: return None, None
        
        results = self.face_mesh.process(roi)
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0]
            roi_h, roi_w = roi.shape[:2]
            sum_x, sum_y = 0, 0
            x_coords = []
            for lm in landmarks.landmark:
                abs_x = int(lm.x * roi_w) + x1
                abs_y = int(lm.y * roi_h) + y1
                sum_x += abs_x
                sum_y += abs_y
                x_coords.append(abs_x)
            face_width = max(x_coords) - min(x_coords) if x_coords else 0
            return (sum_x, sum_y), face_width
        return None, None

    def analyze_movement(self, stable_id, current_sum, face_width, frame_count):
        if stable_id not in self.initial_face_sums:
            self.initial_face_sums[stable_id] = current_sum
            return False, {}

        initial = self.initial_face_sums[stable_id]
        diff_h = abs(current_sum[0] - initial[0])
        diff_v = abs(current_sum[1] - initial[1])
        
        thresh_h = face_width * self.params['horizontal_threshold_multiplier'] * 100
        thresh_v = face_width * self.params['vertical_threshold_multiplier'] * 80
        min_move = self.params['min_movement_for_detection']
        
        is_suspicious = (diff_h > thresh_h and diff_h > min_move) or \
                        (diff_v > thresh_v and diff_v > min_move)
        
        cheating_info = self.cheating_detection[stable_id]
        
        if is_suspicious:
            cheating_info['suspicious_frames'] += 1
        else:
            cheating_info['suspicious_frames'] = max(0, cheating_info['suspicious_frames'] - 0.5)
            
        is_cheating_movement = False
        if cheating_info['suspicious_frames'] >= self.params['consecutive_suspicious_frames']:
            is_cheating_movement = True
            
        return is_cheating_movement, {
            'diff_h': diff_h, 'diff_v': diff_v, 
            'suspicious': is_suspicious
        }

    # --- UPDATED AUDIO PROCESSING (SILENT & ROBUST) ---
    def process_audio(self, video_path, output_dir):
        """Extracts audio and transcribes it, suppressing console noise."""
        print(f"\n🎤 Processing Audio (silently)...")
        audio_filename = "temp_audio.wav"
        audio_path = os.path.join(output_dir, audio_filename)
        transcription_lines = []
        video = None

        try:
            # Use suppress_stdout_stderr to hide MoviePy logs from Server.py
            with suppress_stdout_stderr():
                video = VideoFileClip(video_path)
                
                if video.audio is None:
                    return ["No audio detected in video file."]
                
                # logger=None suppresses progress bar in MoviePy v2
                video.audio.write_audiofile(audio_path, codec='pcm_s16le', logger=None)
                
                video.close()
                video = None

            # Transcribe
            recognizer = sr.Recognizer()
            audio_segment = AudioSegment.from_wav(audio_path)
            
            chunks = split_on_silence(
                audio_segment,
                min_silence_len=500,
                silence_thresh=audio_segment.dBFS - 14,
                keep_silence=500
            )
            
            for i, chunk in enumerate(chunks):
                chunk_filename = os.path.join(output_dir, f"chunk_{i}.wav")
                chunk.export(chunk_filename, format="wav")
                
                with sr.AudioFile(chunk_filename) as source:
                    audio_listened = recognizer.record(source)
                    try:
                        text = recognizer.recognize_google(audio_listened)
                        transcription_lines.append(f"[Chunk {i+1}]: {text}")
                    except sr.UnknownValueError:
                        pass 
                    except sr.RequestError:
                        pass
                
                if os.path.exists(chunk_filename):
                    os.remove(chunk_filename)

            if os.path.exists(audio_path):
                os.remove(audio_path)
                
            if not transcription_lines:
                return ["No speech detected."]
                
            return transcription_lines

        except Exception as e:
            # Return error as string instead of crashing
            return [f"Audio Error: {str(e)}"]
        
        finally:
            if video is not None:
                try: video.close()
                except: pass

    # --- Main Processing Loop ---
    def process_video(self, video_path, output_dir="output_final", fps=30):
        # RESET STATE AT THE START OF EACH VIDEO
        print("\n🔄 Resetting detector state for new video...")
        self._reset_state()
        
        if not os.path.exists(video_path):
            print(f"Error: Video {video_path} not found.")
            return None

        # Setup Output
        os.makedirs(f"{output_dir}/frames", exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        video_out_path = f"{output_dir}/cheating_detected.mp4"
        out = cv2.VideoWriter(video_out_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))
        
        frame_count = 0
        print(f"🎥 Processing video: {video_path}")

        while True:
            ret, frame = cap.read()
            if not ret: break
            
            # 1. Track
            results = self.model.track(
                frame,
                persist=True,
                conf=self.conf_threshold,
                imgsz=self.params['imgsz'],  
                classes=[0, 67],             
                verbose=False,
                device=self.device
            )
            
            person_detections = []
            phone_boxes = []
            
            if results and results[0].boxes:
                boxes = results[0].boxes.xyxy.cpu().tolist()
                classes = results[0].boxes.cls.cpu().tolist()
                track_ids = results[0].boxes.id.int().cpu().tolist() if results[0].boxes.id is not None else [-1] * len(boxes)
                
                for box, cls_id, trk_id in zip(boxes, classes, track_ids):
                    if int(cls_id) == 0 and trk_id != -1:
                        person_detections.append({'box': box, 'yolo_id': trk_id})
                    elif int(cls_id) == 67:
                        phone_boxes.append(box)

            # 2. Process
            active_yolo_ids = [p['yolo_id'] for p in person_detections]
            for yid in list(self.yolo_to_stable_mapping.keys()):
                if yid not in active_yolo_ids:
                    del self.yolo_to_stable_mapping[yid]

            for person in person_detections:
                box = person['box']
                yolo_id = person['yolo_id']
                
                landmark_sum, face_width = self.get_face_landmarks(frame, box)
                stable_id = self.update_registry(yolo_id, box, landmark_sum, frame_count)
                
                has_phone = self.check_phone_proximity(box, phone_boxes)
                
                is_cheating_move = False
                move_data = {}
                if landmark_sum and face_width:
                    is_cheating_move, move_data = self.analyze_movement(
                        stable_id, landmark_sum, face_width, frame_count
                    )
                
                is_cheating = has_phone or is_cheating_move
                
                if has_phone:
                    self.cheating_detection[stable_id]['phone_detected_count'] += 1
                if is_cheating:
                    self.cheating_detection[stable_id]['is_cheating'] = True
                    incident = {'frame': frame_count, 'reason': []}
                    if has_phone: incident['reason'].append('PHONE_DETECTED')
                    if is_cheating_move: incident['reason'].append('SUSPICIOUS_MOVEMENT')
                    self.cheating_detection[stable_id]['cheating_incidents'].append(incident)

                # Draw
                x1, y1, x2, y2 = map(int, box)
                color = (0, 0, 255) if is_cheating else (0, 255, 0)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                status_text = f"ID:{stable_id} | "
                if is_cheating:
                    reasons = []
                    if has_phone: reasons.append("PHONE")
                    if is_cheating_move: reasons.append("MVMT")
                    status_text += f"CHEAT: {'+'.join(reasons)}"
                else:
                    status_text += "NORMAL"
                
                cv2.putText(frame, status_text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            for ph_box in phone_boxes:
                px1, py1, px2, py2 = map(int, ph_box)
                cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 0, 255), 2)
                cv2.putText(frame, "📱 PHONE", (px1, py1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            out.write(frame)
            frame_count += 1
            if frame_count % 30 == 0:
                print(f"Processed {frame_count} frames...")

        cap.release()
        out.release()
        print(f"\n✅ Video Processing Complete.")
        
        # --- AUDIO TRIGGER ---
        transcription_text = self.process_audio(video_path, output_dir)

        # --- SUMMARY GENERATION (FIXED COUNTING) ---
        print("📊 Generating structured summary...")
        
        # Count unique violations per person (not frame-by-frame)
        total_movement_violations = 0
        total_phone_violations = 0
        persons_with_movement = 0
        persons_with_phone = 0
        
        for stable_id, data in self.cheating_detection.items():
            # Count if person had ANY movement violations
            has_movement = any('SUSPICIOUS_MOVEMENT' in inc['reason'] 
                             for inc in data['cheating_incidents'])
            if has_movement:
                persons_with_movement += 1
                total_movement_violations += 1  # Count as 1 violation per person
            
            # Count if person had ANY phone detections
            if data['phone_detected_count'] > 0:
                persons_with_phone += 1
                total_phone_violations += 1  # Count as 1 violation per person
        
        # Total unique violations (persons who violated, not frame count)
        total_violations = total_movement_violations + total_phone_violations

        final_summary = {
            "cheating_detection_results": {
                "total_movement_incidents": total_movement_violations,
                "total_phone_incidents": total_phone_violations,
                "total_violations_reported": total_violations,
                "audio_transcription": transcription_text,
                "detected_persons": self.cheating_detection,
                "total_stable_persons_created": len(self.cheating_detection),
                "persons_with_movement_incident": persons_with_movement,
                "persons_with_phone_incident": persons_with_phone,
                "counting_method": "unique_violations_per_person"
            }
        }

        # Ensure path is absolute
        summary_path = os.path.abspath(os.path.join(output_dir, "summary.json"))
        
        try:
            with open(summary_path, 'w') as f:
                json.dump(final_summary, f, indent=4)
            print(f"   ✓ Summary saved to: {summary_path}")
            print(f"   ✓ Summary file exists: {os.path.exists(summary_path)}")
            print(f"   ✓ File size: {os.path.getsize(summary_path)} bytes")
        except Exception as e:
            print(f"   ✗ Error saving summary: {e}")
            import traceback
            traceback.print_exc()
        
        # Don't return the summary - it will be read from disk by server.py
        return None

if __name__ == "__main__":
    detector = PersonFacePhoneDetector(yolo_model="yolo11n.pt") 
    if len(sys.argv) > 1:
        video_input = sys.argv[1]
        output_folder = sys.argv[2] if len(sys.argv) > 2 else "output_results"
        detector.process_video(video_input, output_dir=output_folder)
    else:
        print("Please provide a video path.")