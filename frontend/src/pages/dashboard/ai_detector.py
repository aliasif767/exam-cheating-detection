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

# --- Class containing the core detection logic ---
# Renamed from EnhancedFaceTracker to satisfy the import 'PersonFacePhoneDetector'
class PersonFacePhoneDetector:
    def __init__(self, yolo_model="yolov8l.pt", confidence_threshold=0.40):
        """
        Initialize the enhanced face tracker with multiple AI models.
        The system is configured for person tracking with YOLO and
        face landmark-based movement analysis with MediaPipe for cheating detection.
        """
        # Initialize YOLO for person and phone detection
        self.person_model = YOLO(yolo_model)
        self.conf_threshold = confidence_threshold
        
        # Initialize MediaPipe Face Mesh for detailed face landmarks
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=5,
            refine_landmarks=True,
            min_detection_confidence=0.3,
            min_tracking_confidence=0.3
        )
        
        # Internal state for tracking and analysis
        self.initial_face_sums = {}
        self.face_history = {}
        self.person_registry = {}
        self.stable_id_counter = 1
        self.missing_persons = {}
        self.max_missing_frames = 30
        self.position_similarity_threshold = 300
        self.size_similarity_threshold = 0.8
        self.yolo_to_stable_mapping = {}
        self.cheating_detection = {}
        
        # CHEATING DETECTION PARAMETERS
        self.movement_thresholds = {
            'horizontal_threshold_multiplier': 4.8,
            'vertical_threshold_multiplier': 3.0,
            'consecutive_suspicious_frames': 5,
            'cheating_reset_frames': 30
        }
        self.debug_mode = True

    # --- Utility Methods (Copied from Integrated Verification Logic) ---

    def calculate_box_center(self, box):
        x1, y1, x2, y2 = box
        return ((x1 + x2) / 2, (y1 + y2) / 2)

    def calculate_box_area(self, box):
        x1, y1, x2, y2 = box
        return (x2 - x1) * (y2 - y1)

    def calculate_distance(self, point1, point2):
        return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

    def check_for_phone_proximity(self, person_box, phone_detections):
        p_x1, p_y1, p_x2, p_y2 = person_box
        p_center = self.calculate_box_center(person_box)
        proximity_threshold = (p_y2 - p_y1) * 0.4 
        
        for phone_box in phone_detections:
            ph_center = self.calculate_box_center(phone_box)
            distance = self.calculate_distance(p_center, ph_center)
            if distance < proximity_threshold:
                return True
        return False

    def find_best_stable_match(self, yolo_id, box, landmark_sum):
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
                    if self.debug_mode:
                        print(f"  → Invalid YOLO mapping removed: YOLO {yolo_id} -> Stable {stable_id} (distance: {distance:.1f})")
                    del self.yolo_to_stable_mapping[yolo_id]
        
        best_match = None
        best_score = float('inf')
        
        for stable_id, missing_info in list(self.missing_persons.items()):
            last_box = missing_info['last_box']
            last_center = self.calculate_box_center(last_box)
            last_area = self.calculate_box_area(last_box)
            position_distance = self.calculate_distance(current_center, last_center)
            size_ratio = abs(current_area - last_area) / max(current_area, last_area, 1)
            score = position_distance + (size_ratio * 50)
            
            if (position_distance < self.position_similarity_threshold * 2 and
                size_ratio < self.size_similarity_threshold and
                score < best_score):
                best_score = score
                best_match = stable_id
        
        if best_match is not None:
            return best_match
        
        for stable_id, person_info in list(self.person_registry.items()):
            if stable_id not in self.missing_persons:
                current_yolo_id = person_info.get('current_yolo_id')
                if current_yolo_id != yolo_id:
                    last_box = person_info['last_box']
                    last_center = self.calculate_box_center(last_box)
                    last_area = self.calculate_box_area(last_box)
                    position_distance = self.calculate_distance(current_center, last_center)
                    size_ratio = abs(current_area - last_area) / max(current_area, last_area, 1)
                    score = position_distance + (size_ratio * 100)
                    
                    if (position_distance < self.position_similarity_threshold and
                        size_ratio < self.size_similarity_threshold and
                        score < best_score):
                        best_score = score
                        best_match = stable_id
        
        return best_match

    def update_person_registry(self, yolo_id, box, landmark_sum, frame_count):
        stable_id = self.find_best_stable_match(yolo_id, box, landmark_sum)
        
        if stable_id is not None:
            if stable_id in self.missing_persons:
                del self.missing_persons[stable_id]
            
            self.person_registry[stable_id].update({
                'current_yolo_id': yolo_id,
                'last_box': box,
                'last_landmark_sum': landmark_sum,
                'last_seen_frame': frame_count
            })
            self.yolo_to_stable_mapping[yolo_id] = stable_id
            
        else:
            stable_id = self.stable_id_counter
            self.stable_id_counter += 1
            
            self.person_registry[stable_id] = {
                'current_yolo_id': yolo_id,
                'last_box': box,
                'last_landmark_sum': landmark_sum,
                'last_seen_frame': frame_count,
                'first_seen_frame': frame_count
            }
            self.yolo_to_stable_mapping[yolo_id] = stable_id
            
            if landmark_sum is not None:
                self.initial_face_sums[stable_id] = landmark_sum
                self.face_history[stable_id] = []
            
            self.cheating_detection[stable_id] = {
                'suspicious_frames': 0,
                'is_cheating': False,
                'cheating_incidents': [],
                'last_reset_frame': frame_count
            }
        
        return stable_id

    def handle_missing_persons(self, detected_yolo_ids, frame_count):
        registry_snapshot = dict(self.person_registry)
        missing_snapshot = dict(self.missing_persons)
        currently_active_stable_ids = set()
        for stable_id, person_info in registry_snapshot.items():
            if person_info['current_yolo_id'] in detected_yolo_ids:
                currently_active_stable_ids.add(stable_id)
        
        persons_to_remove = []
        
        for stable_id, person_info in registry_snapshot.items():
            if stable_id not in currently_active_stable_ids:
                if stable_id not in missing_snapshot:
                    self.missing_persons[stable_id] = {
                        'missing_since_frame': frame_count,
                        'last_box': person_info['last_box'],
                        'last_landmark_sum': person_info.get('last_landmark_sum')
                    }
                else:
                    missing_duration = frame_count - missing_snapshot[stable_id]['missing_since_frame']
                    if missing_duration > self.max_missing_frames:
                        persons_to_remove.append(stable_id)
        
        for stable_id in persons_to_remove:
            if stable_id in self.missing_persons:
                del self.missing_persons[stable_id]
            if stable_id in self.person_registry:
                yolo_id = self.person_registry[stable_id].get('current_yolo_id')
                if yolo_id is not None and yolo_id in self.yolo_to_stable_mapping:
                    del self.yolo_to_stable_mapping[yolo_id]
                del self.person_registry[stable_id]
            if stable_id in self.initial_face_sums:
                del self.initial_face_sums[stable_id]
            if stable_id in self.face_history:
                del self.face_history[stable_id]
            if stable_id in self.cheating_detection:
                del self.cheating_detection[stable_id]

    def cleanup_invalid_yolo_mappings(self, detected_yolo_ids):
        invalid_mappings = []
        for yolo_id in list(self.yolo_to_stable_mapping.keys()):
            if yolo_id not in detected_yolo_ids:
                invalid_mappings.append(yolo_id)
        
        for yolo_id in invalid_mappings:
            del self.yolo_to_stable_mapping[yolo_id]

    def get_face_landmarks_and_sum(self, image, person_roi):
        landmarks_data = []
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        x1, y1, x2, y2 = person_roi
        roi_image = rgb_image[y1:y2, x1:x2]
        results = self.face_mesh.process(roi_image)
        
        if results.multi_face_landmarks:
            h, w = roi_image.shape[:2]
            for face_landmarks in results.multi_face_landmarks:
                sum_x, sum_y, all_landmarks = 0, 0, []
                for landmark in face_landmarks.landmark:
                    abs_x = int(landmark.x * w) + x1
                    abs_y = int(landmark.y * h) + y1
                    sum_x += abs_x
                    sum_y += abs_y
                    all_landmarks.append((abs_x, abs_y))
                
                landmarks_data.append({
                    'landmark_sum': (sum_x, sum_y),
                    'raw_landmarks': all_landmarks,
                })
        return landmarks_data

    def smooth_position(self, stable_id, current_sum, frame_num):
        if stable_id not in self.face_history:
            self.face_history[stable_id] = []
        self.face_history[stable_id].append({'position': current_sum, 'frame': frame_num})
        self.face_history[stable_id] = self.face_history[stable_id][-5:]
        
        if len(self.face_history[stable_id]) == 1:
            return current_sum
        
        total_weight, weighted_x, weighted_y = 0, 0, 0
        
        for i, entry in enumerate(self.face_history[stable_id]):
            weight = i + 1
            weighted_x += entry['position'][0] * weight
            weighted_y += entry['position'][1] * weight
            total_weight += weight
        
        smoothed_x = int(weighted_x / total_weight)
        smoothed_y = int(weighted_y / total_weight)
        return (smoothed_x, smoothed_y)

    def calculate_enhanced_movement(self, stable_id, current_sum, face_width_pixels):
        if stable_id not in self.initial_face_sums:
            return {
                'horizontal_difference': 0, 'vertical_difference': 0, 'horizontal_direction': "none", 
                'vertical_direction': "none", 'is_suspicious_horizontal': False, 'is_suspicious_vertical': False,
                'is_cheating_detected': False
            }
        
        initial_sum = self.initial_face_sums[stable_id]
        horizontal_difference = abs(current_sum[0] - initial_sum[0])
        vertical_difference = abs(current_sum[1] - initial_sum[1])
        horizontal_direction = "right" if current_sum[0] > initial_sum[0] else ("left" if current_sum[0] < initial_sum[0] else "none")
        vertical_direction = "down" if current_sum[1] > initial_sum[1] else ("up" if current_sum[1] < initial_sum[1] else "none")

        horizontal_threshold = face_width_pixels * self.movement_thresholds['horizontal_threshold_multiplier'] * 100
        vertical_threshold = face_width_pixels * self.movement_thresholds['vertical_threshold_multiplier'] * 80
        
        is_suspicious_horizontal = horizontal_difference > horizontal_threshold
        is_suspicious_vertical = vertical_difference > vertical_threshold
        is_suspicious = is_suspicious_horizontal or is_suspicious_vertical
        
        cheating_info = self.cheating_detection.get(stable_id, {'suspicious_frames': 0, 'is_cheating': False, 'cheating_incidents': [], 'last_reset_frame': 0})
        
        if is_suspicious:
            cheating_info['suspicious_frames'] += 1
        else:
            cheating_info['suspicious_frames'] = max(0, cheating_info['suspicious_frames'] - 1)
        
        if (cheating_info['suspicious_frames'] >= self.movement_thresholds['consecutive_suspicious_frames'] 
            and not cheating_info['is_cheating']):
            cheating_info['is_cheating'] = True
            cheating_info['cheating_incidents'].append({
                'detected_at_frame': len(self.face_history.get(stable_id, [])),
                'horizontal_movement': horizontal_difference,
                'vertical_movement': vertical_difference,
                'directions': f"{horizontal_direction}-{vertical_direction}"
            })
            if self.debug_mode:
                print(f"🚨 CHEATING DETECTED for Person {stable_id} (Movement)")
        
        current_frame = len(self.face_history.get(stable_id, []))
        if (cheating_info['is_cheating'] and 
            cheating_info['suspicious_frames'] == 0 and 
            current_frame - cheating_info['last_reset_frame'] > self.movement_thresholds['cheating_reset_frames']):
            cheating_info['is_cheating'] = False
            cheating_info['last_reset_frame'] = current_frame
            if self.debug_mode:
                print(f"✅ Person {stable_id} cheating status reset")
        
        self.cheating_detection[stable_id] = cheating_info
        
        return {
            'horizontal_difference': horizontal_difference, 'vertical_difference': vertical_difference,
            'horizontal_direction': horizontal_direction, 'vertical_direction': vertical_direction,
            'is_suspicious_horizontal': is_suspicious_horizontal, 'is_suspicious_vertical': is_suspicious_vertical,
            'is_cheating_detected': cheating_info['is_cheating'],
            'suspicious_frame_count': cheating_info['suspicious_frames'],
            'total_cheating_incidents': len(cheating_info['cheating_incidents'])
        }

    def create_video_from_frames(self, frames_dir, output_video_path, fps):
        print(f"\nCreating video from frames in '{frames_dir}'...")
        image_files = sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))
        if not image_files: return

        first_frame = cv2.imread(image_files[0])
        height, width, layers = first_frame.shape

        fourcc = cv2.VideoWriter_fourcc(*'mp4v') 
        video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
        
        for image_file in image_files:
            frame = cv2.imread(image_file)
            video_writer.write(frame)
            
        video_writer.release()
        print(f"Video created successfully at '{output_video_path}'")

    # --- Renamed Core Processing Method for Frontend Integration ---

    def process_video(self, video_path, output_dir="output_enhanced", fps=30):
        """
        Main method to process a video, designed as the integration point.
        Saves all frame data and returns a comprehensive JSON summary.
        """
        if not os.path.exists(video_path):
            print(f"Error: Video file not found at: {video_path}")
            # Exit the process gracefully if the video is missing
            sys.exit(1)

        frames_dir = os.path.join(output_dir, "frames")
        data_dir = os.path.join(output_dir, "data")
        os.makedirs(frames_dir, exist_ok=True)
        os.makedirs(data_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print("Error: Could not open video file.")
            sys.exit(1)
        
        frame_count = 0
        processing_times = []
        
        print("Starting Enhanced Cheating Detection System...")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            start_time = cv2.getTickCount()
            
            # Use lower confidence for real-time tracking (faster)
            results = self.person_model.track(frame, conf=0.4, persist=True, verbose=False)
            person_data = []
            detected_yolo_ids = []
            
            all_boxes = []
            all_class_ids = []
            if results and results[0].boxes:
                all_boxes = results[0].boxes.xyxy.cpu().tolist()
                all_class_ids = results[0].boxes.cls.cpu().tolist()

            person_detections = []
            phone_boxes = []
            
            for box, class_id in zip(all_boxes, all_class_ids):
                class_name = self.person_model.names[int(class_id)]
                if class_name == 'person' and results[0].boxes.id is not None:
                    track_ids = results[0].boxes.id.int().cpu().tolist()
                    try:
                        index = results[0].boxes.xyxy.cpu().tolist().index(box)
                        yolo_id = track_ids[index]
                        person_detections.append({'box': box, 'yolo_id': yolo_id})
                        detected_yolo_ids.append(yolo_id)
                    except ValueError:
                        pass
                elif class_name == 'cell phone':
                    phone_boxes.append(box)

            self.cleanup_invalid_yolo_mappings(detected_yolo_ids)
            temp_detections = []
            
            for det in person_detections:
                box = det['box']
                yolo_id = det['yolo_id']
                x1, y1, x2, y2 = map(int, box)
                person_height = y2 - y1
                head_height = max(int(person_height * 0.25), 40)
                head_region = (x1, y1, x2, y1 + head_height)
                landmarks_list = self.get_face_landmarks_and_sum(frame, head_region)
                landmark_sum = landmarks_list[0]['landmark_sum'] if landmarks_list else None
                phone_detected = self.check_for_phone_proximity(box, phone_boxes)
                
                temp_detections.append({
                    'yolo_id': yolo_id, 'box': (x1, y1, x2, y2), 'landmark_sum': landmark_sum,
                    'has_landmarks': bool(landmarks_list), 'landmarks_list': landmarks_list,
                    'phone_detected': phone_detected
                })
            
            self.handle_missing_persons(detected_yolo_ids, frame_count)
            
            for detection in temp_detections:
                yolo_id = detection['yolo_id']
                box = detection['box']
                landmark_sum = detection['landmark_sum']
                has_landmarks = detection['has_landmarks']
                landmarks_list = detection['landmarks_list']
                phone_detected = detection['phone_detected']
                x1, y1, x2, y2 = box
                
                stable_id = self.update_person_registry(yolo_id, box, landmark_sum, frame_count)
                
                if stable_id not in self.initial_face_sums and landmark_sum is not None:
                    self.initial_face_sums[stable_id] = landmark_sum

                movement_data = {'is_cheating_detected': False, 'horizontal_difference': 0, 'vertical_difference': 0, 
                                 'horizontal_direction': "none", 'vertical_direction': "none", 
                                 'is_suspicious_horizontal': False, 'is_suspicious_vertical': False}
                
                box_color = (0, 255, 0)  
                is_cheating_or_phone = False
                
                if has_landmarks:
                    smoothed_sum = self.smooth_position(stable_id, landmark_sum, frame_count)
                    raw_landmarks = landmarks_list[0]['raw_landmarks']
                    face_width_in_pixels = max(lm[0] for lm in raw_landmarks) - min(lm[0] for lm in raw_landmarks)
                    
                    if stable_id in self.initial_face_sums:
                        movement_data = self.calculate_enhanced_movement(stable_id, smoothed_sum, face_width_in_pixels)

                if movement_data['is_cheating_detected'] or phone_detected:
                     is_cheating_or_phone = True
                     box_color = (0, 0, 255) # Red for cheating or phone
                
                # Create person info for JSON output
                person_info = {
                    "stable_id": stable_id, "yolo_id": yolo_id, "frame_number": frame_count,
                    "body_detection": {"bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}},
                    "enhanced_face_tracking": {
                        "detected": has_landmarks, "phone_detected": phone_detected,
                        "horizontal_movement": {"difference": round(movement_data['horizontal_difference'], 2), "direction": movement_data['horizontal_direction'], "is_suspicious": movement_data['is_suspicious_horizontal']},
                        "vertical_movement": {"difference": round(movement_data['vertical_difference'], 2), "direction": movement_data['vertical_direction'], "is_suspicious": movement_data['is_suspicious_vertical']},
                        "cheating_detection": {"is_cheating_movement": movement_data['is_cheating_detected'], "is_cheating_overall": is_cheating_or_phone}
                    }
                }
                person_data.append(person_info)
                
                # Drawing Logic (for output video)
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                
                if is_cheating_or_phone:
                    cheating_label = "🚨 CHEATING DETECTED! 🚨"
                    cv2.putText(frame, cheating_label, (x1, y1 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                
                status = "CHEATING/PHONE" if is_cheating_or_phone else "NORMAL"
                label = f"S-ID:{stable_id} Y-ID:{yolo_id} | {status}"
                cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, box_color, 1)

            # Draw red rectangles for detected phones (object only)
            for ph_box in phone_boxes:
                px1, py1, px2, py2 = map(int, ph_box)
                cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 0, 255), 2)
                cv2.putText(frame, "Phone", (px1, py1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            
            else:
                self.cleanup_invalid_yolo_mappings([])
                self.handle_missing_persons([], frame_count)

            # Save frame and data (The DB/Integration Logic)
            frame_filename = os.path.join(frames_dir, f"frame_{frame_count:04d}.jpg")
            cv2.imwrite(frame_filename, frame)
            if person_data:
                json_filename = os.path.join(data_dir, f"frame_{frame_count:04d}.json")
                with open(json_filename, 'w') as f:
                    json.dump(person_data, f, indent=4)
            
            end_time = cv2.getTickCount()
            processing_times.append((end_time - start_time) / cv2.getTickFrequency())
            frame_count += 1
        
        cap.release()
        cv2.destroyAllWindows()
        
        output_video_path = os.path.join(output_dir, "cheating_detection_video.mp4")
        self.create_video_from_frames(frames_dir, output_video_path, fps)

        # Generate and return the comprehensive summary for frontend integration
        total_cheating_incidents = sum(len(info.get('cheating_incidents', [])) for info in self.cheating_detection.values())
        persons_with_cheating = sum(1 for info in self.cheating_detection.values() if len(info.get('cheating_incidents', [])) > 0)
        
        summary = {
            "processing_info": {
                "total_frames": frame_count, "video_path": video_path, "output_directory": output_dir, 
                "output_video_path": output_video_path, "processing_date": datetime.now().isoformat(),
                "average_processing_time": round(np.mean(processing_times) if processing_times else 0, 4),
                "total_processing_time": round(sum(processing_times) if processing_times else 0, 2)
            },
            "cheating_detection_results": {
                "total_stable_persons_created": self.stable_id_counter - 1,
                "total_movement_incidents": total_cheating_incidents,
                "persons_with_movement_incident": persons_with_cheating,
                "cheating_summary": []
            }
        }
        
        for stable_id, cheating_info in self.cheating_detection.items():
            person_info = self.person_registry.get(stable_id, {})
            person_summary = {
                "stable_id": stable_id,
                "frames_tracked": len([h for h in self.face_history.get(stable_id, [])]),
                "last_seen_frame": person_info.get('last_seen_frame', 'unknown'),
                "cheating_status_movement_only": {
                    "currently_cheating": cheating_info.get('is_cheating', False),
                    "total_incidents": len(cheating_info.get('cheating_incidents', [])),
                    "incidents_details": cheating_info.get('cheating_incidents', [])
                }
            }
            summary["cheating_detection_results"]["cheating_summary"].append(person_summary)
        
        summary_filename = os.path.join(data_dir, "cheating_detection_summary.json")
        with open(summary_filename, 'w') as f:
            json.dump(summary, f, indent=4)
        
        return summary