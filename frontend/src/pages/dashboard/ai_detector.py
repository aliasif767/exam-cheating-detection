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

# --- Class containing the core detection logic (Simplified) ---
class PersonFacePhoneDetector:
    def __init__(self, yolo_model="yolov8l.pt", confidence_threshold=0.40):
        """
        Initialize the detector for person, face, and phone detection.
        This version focuses on presence and phone proximity, without face movement analysis.
        """
        # Initialize YOLO for person and phone detection
        self.person_model = YOLO(yolo_model)
        self.conf_threshold = confidence_threshold
        
        # Initialize MediaPipe Face Mesh for detailed face landmarks (only for presence check)
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
        # Simplified tracking state: removed face history and movement-related initial sums/detection
        self.person_registry = {}
        self.stable_id_counter = 1
        self.missing_persons = {}
        self.max_missing_frames = 30
        self.position_similarity_threshold = 300
        self.size_similarity_threshold = 0.8
        self.yolo_to_stable_mapping = {}
        self.debug_mode = False # Keep debug mode flag, but logic is simplified

    # --- Utility Methods (Kept for tracking and proximity) ---

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
        # Proximity defined as 40% of the person's bounding box height
        proximity_threshold = (p_y2 - p_y1) * 0.4 
        
        for phone_box in phone_detections:
            ph_center = self.calculate_box_center(phone_box)
            distance = self.calculate_distance(p_center, ph_center)
            if distance < proximity_threshold:
                return True
        return False

    def find_best_stable_match(self, yolo_id, box):
        """
        Finds the best matching stable ID for a new YOLO detection.
        Movement analysis is removed from the matching process.
        """
        current_center = self.calculate_box_center(box)
        current_area = self.calculate_box_area(box)
        
        # 1. Check current YOLO ID mapping
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
        
        # 2. Check missing persons (re-entry)
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
        
        # 3. Check currently active persons not linked to a YOLO ID (e.g., YOLO ID change)
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

    def update_person_registry(self, yolo_id, box, frame_count):
        """
        Updates the registry without requiring a landmark_sum.
        """
        # Landmark sum argument removed as it's not needed for matching in this simplified version
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
                'last_seen_frame': frame_count,
                'first_seen_frame': frame_count
            }
            self.yolo_to_stable_mapping[yolo_id] = stable_id
        
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

    def cleanup_invalid_yolo_mappings(self, detected_yolo_ids):
        invalid_mappings = []
        for yolo_id in list(self.yolo_to_stable_mapping.keys()):
            if yolo_id not in detected_yolo_ids:
                invalid_mappings.append(yolo_id)
        
        for yolo_id in invalid_mappings:
            del self.yolo_to_stable_mapping[yolo_id]

    def get_face_landmarks_and_sum(self, image, person_roi):
        """
        Kept to detect face presence, but the 'sum' is no longer used for movement.
        """
        landmarks_data = []
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        x1, y1, x2, y2 = person_roi
        roi_image = rgb_image[y1:y2, x1:x2]
        results = self.face_mesh.process(roi_image)
        
        if results.multi_face_landmarks:
            h, w = roi_image.shape[:2]
            for face_landmarks in results.multi_face_landmarks:
                sum_x, sum_y, all_landmarks = 0, 0, [] # sum_x/y not used, but keeping structure
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

    # --- Movement/Cheating Detection Logic Removed (smooth_position, calculate_enhanced_movement) ---
    # The complexity related to initial_face_sums, face_history, and cheating_detection dictionaries is gone.

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
        Main method to process a video, focusing on person presence, face presence, and phone proximity.
        """
        if not os.path.exists(video_path):
            print(f"Error: Video file not found at: {video_path}")
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
        
        print("Starting Simplified Person/Face/Phone Detection System...")
        
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
            
            # 1. Identify all person and phone detections
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
            
            # 2. Process each person detection
            for det in person_detections:
                box = det['box']
                yolo_id = det['yolo_id']
                x1, y1, x2, y2 = map(int, box)
                person_height = y2 - y1
                # Focus face detection on the upper part of the person's bounding box (head/face region)
                head_height = max(int(person_height * 0.25), 40)
                head_region = (x1, y1, x2, y1 + head_height)
                
                # Get face landmarks (for face presence check only)
                landmarks_list = self.get_face_landmarks_and_sum(frame, head_region)
                
                # Check for phone proximity
                phone_detected = self.check_for_phone_proximity(box, phone_boxes)
                
                temp_detections.append({
                    'yolo_id': yolo_id, 'box': (x1, y1, x2, y2), 
                    'has_landmarks': bool(landmarks_list), 
                    'phone_detected': phone_detected
                })
            
            # 3. Handle person tracking (missing/new persons)
            self.handle_missing_persons(detected_yolo_ids, frame_count)
            
            # 4. Finalize tracking and data
            for detection in temp_detections:
                yolo_id = detection['yolo_id']
                box = detection['box']
                has_landmarks = detection['has_landmarks']
                phone_detected = detection['phone_detected']
                x1, y1, x2, y2 = box
                
                # Update stable ID
                stable_id = self.update_person_registry(yolo_id, box, frame_count)
                
                # Simple status: Phone proximity is the only 'cheating' flag now
                is_cheating_or_phone = phone_detected 
                box_color = (0, 255, 0) # Green for normal
                
                if is_cheating_or_phone:
                     box_color = (0, 0, 255) # Red for phone
                
                # Create person info for JSON output
                person_info = {
                    "stable_id": stable_id, "yolo_id": yolo_id, "frame_number": frame_count,
                    "body_detection": {"bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}},
                    "detection_results": {
                        "face_detected": has_landmarks, 
                        "phone_in_proximity": phone_detected,
                        "flagged_overall": is_cheating_or_phone
                    }
                }
                person_data.append(person_info)
                
                # Drawing Logic (for output video)
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                
                if is_cheating_or_phone:
                    phone_label = "🚨 PHONE DETECTED! 🚨"
                    cv2.putText(frame, phone_label, (x1, y1 - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                
                face_status = "FACE" if has_landmarks else "NO FACE"
                status = "PHONE" if is_cheating_or_phone else "NORMAL"
                label = f"S-ID:{stable_id} Y-ID:{yolo_id} | {face_status} | {status}"
                cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, box_color, 1)

            # Draw red rectangles for detected phones (object only)
            for ph_box in phone_boxes:
                px1, py1, px2, py2 = map(int, ph_box)
                cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 0, 255), 2)
                cv2.putText(frame, "Phone", (px1, py1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            
            else:
                self.cleanup_invalid_yolo_mappings([])
                self.handle_missing_persons([], frame_count)

            # Save frame and data
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
        
        output_video_path = os.path.join(output_dir, "detection_video.mp4")
        self.create_video_from_frames(frames_dir, output_video_path, fps)

        # Generate and return the comprehensive summary for frontend integration (Simplified)
        summary = {
            "processing_info": {
                "total_frames": frame_count, "video_path": video_path, "output_directory": output_dir, 
                "output_video_path": output_video_path, "processing_date": datetime.now().isoformat(),
                "average_processing_time": round(np.mean(processing_times) if processing_times else 0, 4),
                "total_processing_time": round(sum(processing_times) if processing_times else 0, 2)
            },
            "detection_results": {
                "total_stable_persons_created": self.stable_id_counter - 1,
                "person_summary": []
            }
        }
        
        # Note: A true summary would require accumulating 'phone_in_proximity' events
        # across frames, but for simplicity, we just list the tracked persons.
        for stable_id, person_info in self.person_registry.items():
            person_summary = {
                "stable_id": stable_id,
                "first_seen_frame": person_info.get('first_seen_frame', 'unknown'),
                "last_seen_frame": person_info.get('last_seen_frame', 'unknown'),
                # Add placehoder for phone incidents (requires full frame data processing for a count)
                "phone_proximity_incidents_count": "Requires frame data aggregation" 
            }
            summary["detection_results"]["person_summary"].append(person_summary)
        
        summary_filename = os.path.join(data_dir, "detection_summary.json")
        with open(summary_filename, 'w') as f:
            json.dump(summary, f, indent=4)
        
        return summary