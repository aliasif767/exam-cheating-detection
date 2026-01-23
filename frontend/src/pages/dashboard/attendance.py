# attendance.py - ADVANCED UNKNOWN PERSON DETECTION WITH FALSE POSITIVE FILTERING
# FIXES APPLIED: TIGHTER THRESHOLDS, IMPROVED TRACKING, HIGHER FRAME RATE
import cv2
import numpy as np
import os
from datetime import datetime
import json
import base64
import io
from PIL import Image
from deepface import DeepFace
import traceback
import warnings
from concurrent.futures import ThreadPoolExecutor
import multiprocessing
import time 
from collections import defaultdict

warnings.filterwarnings('ignore')


def convert_to_serializable(obj):
    """
    Convert NumPy and other non-serializable types to JSON-serializable types.
    """
    if isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_to_serializable(item) for item in obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    else:
        return obj

DB_PIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db_pic')
UNKNOWN_FACES_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'unknown_faces')
VIDEO_OUTPUT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'processed_videos')
ABSENT_PIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'absent_pics')


class OptimizedAttendanceSystem:
    def __init__(self, mongodb_manager, attendance_log="attendance.json"): 
        """
        Initialize the attendance system with ADVANCED unknown person detection.
        """
        self.mongodb_manager = mongodb_manager
        self.attendance_log = attendance_log
        self.attendance_marked = {}
        self.all_students = set()
        
        self.filename_to_fullname = {}
        self.fullname_to_filepath = {}
        
        # ADVANCED: Unknown person tracking with multi-stage verification
        self.unknown_persons = []
        self.unknown_face_tracker = {}  # Track unknown faces across frames
        self.unknown_verification_frames = 3  # Require N frames to confirm unknown
        self.unknown_face_embeddings = []  # Store embeddings of detected unknowns
        
        # UPDATED: Increased min size to filter small background noise
        self.min_face_size = 80  
        
        # Create necessary folders
        os.makedirs(UNKNOWN_FACES_FOLDER, exist_ok=True)
        os.makedirs(VIDEO_OUTPUT_FOLDER, exist_ok=True)
        os.makedirs(ABSENT_PIC_FOLDER, exist_ok=True)
        
        # DeepFace Configuration - OPTIMIZED FOR UNKNOWN DETECTION
        self.model_name = 'Facenet'  # Good balance of speed and accuracy
        self.detector_backend = 'opencv'  # Fast detector
        self.distance_metric = 'cosine'
        
        # CRITICAL THRESHOLDS FOR UNKNOWN DETECTION
        self.deepface_threshold = 0.40  # DeepFace matching threshold
        self.unknown_distance_threshold = 0.55  # If distance > this, likely unknown
        self.present_distance_threshold = 0.35  # If distance < this, mark present
        
        # Performance optimization
        self.recognition_cooldown = {}
        self.cooldown_seconds = 5
        
        # --- FIX 2: Increased processing frequency ---
        # Changed from 15 to 6 to ensure better tracking continuity
        self.process_every_n_frames = 6  
        self.max_workers = min(4, multiprocessing.cpu_count())
        
        # Face detector for initial detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        print(f"\n{'='*60}")
        print(f"Initializing ADVANCED Unknown Person Detection System (FIXED VERSION)")
        print(f"Model: {self.model_name} | Metric: {self.distance_metric}")
        print(f"DeepFace Threshold: {self.deepface_threshold:.2f}")
        print(f"Unknown Distance Threshold: >{self.unknown_distance_threshold:.2f}")
        print(f"Present Distance Threshold: <{self.present_distance_threshold:.2f}")
        print(f"Verification Frames Required: {self.unknown_verification_frames}")
        print(f"Frame Processing Rate: Every {self.process_every_n_frames}th frame")
        print(f"{'='*60}\n")
        
        self._build_database()

    def _annotate_absent_image(self, student_name, student_filepath):
        """
        Loads the student's reference image, draws a large red circle/cross on it,
        saves the annotated image, and returns the base64 string.
        """
        try:
            img = cv2.imread(student_filepath)
            if img is None:
                print(f"⚠️ Could not load image for absent student: {student_name}")
                return None
            
            h, w, _ = img.shape
            center = (w // 2, h // 2)
            radius = min(w, h) // 3
            
            cv2.circle(img, center, radius, (0, 0, 255), 10) 
            
            text = "ABSENT"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = w / 400 
            font_thickness = 2
            text_size = cv2.getTextSize(text, font, font_scale, font_thickness)[0]
            text_x = center[0] - text_size[0] // 2
            text_y = center[1] + text_size[1] // 2
            
            cv2.rectangle(img, 
                          (text_x - 5, text_y - text_size[1] - 5), 
                          (text_x + text_size[0] + 5, text_y + 5), 
                          (0, 0, 255), -1)
            
            cv2.putText(img, text, (text_x, text_y), font, font_scale, (255, 255, 255), font_thickness, cv2.LINE_AA)
            
            safe_name = student_name.replace(' ', '_').replace('/', '-')
            annotated_filename = f"absent_{safe_name}.jpg"
            annotated_filepath = os.path.join(ABSENT_PIC_FOLDER, annotated_filename)
            cv2.imwrite(annotated_filepath, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            _, buffer = cv2.imencode('.jpg', img)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return img_base64
        except Exception as e:
            print(f"❌ Error annotating image for {student_name}: {e}")
            return None

    def _build_database(self):
        """
        Fast database building with full name mapping.
        """
        print("Initializing face database from MongoDB...")

        if self.mongodb_manager is None or self.mongodb_manager.db is None:
            print("❌ Database connection failed. Cannot load student templates.")
            return False

        if os.path.exists(DB_PIC_FOLDER):
            import shutil
            shutil.rmtree(DB_PIC_FOLDER)
        os.makedirs(DB_PIC_FOLDER, exist_ok=True)
        
        print(f"Local images folder: {DB_PIC_FOLDER}")

        self.filename_to_fullname = {}
        self.fullname_to_filepath = {}

        try:
            collection = self.mongodb_manager.db['attendances']
            query = {"type": "FaceTemplate", "studentPic": {"$exists": True, "$ne": None}}
            student_templates = collection.find(query)
            student_list = list(student_templates)

            if not student_list:
                print(f"❌ No FaceTemplate records found in database.")
                return False

            student_count = 0
            failed_count = 0
            
            print(f"Found {len(student_list)} FaceTemplate record(s)")
            print(f"\nProcessing images...")

            for record in student_list:
                full_student_name = record.get('studentName', 'Unknown Student').strip()
                safe_name = full_student_name.replace(' ', '_').replace('/', '-')
                mongo_id = str(record.get('_id', 'unknown'))
                base64_pic = record.get('studentPic')
                
                self.all_students.add(full_student_name)

                if not base64_pic or base64_pic == "":
                    print(f"⚠️  {full_student_name}: Missing image")
                    failed_count += 1
                    continue
                
                try:
                    if isinstance(base64_pic, str):
                        if ',' in base64_pic:
                            _, encoded_data = base64_pic.split(",", 1)
                        else:
                            encoded_data = base64_pic
                            
                        encoded_data = encoded_data.strip()
                        missing_padding = len(encoded_data) % 4
                        if missing_padding:
                            encoded_data += '=' * (4 - missing_padding)
                        
                        image_bytes = base64.b64decode(encoded_data)
                    else:
                        print(f"⚠️  {full_student_name}: Invalid format")
                        failed_count += 1
                        continue
                    
                    image_pil = Image.open(io.BytesIO(image_bytes))
                    
                    if image_pil.mode != 'RGB':
                        image_pil = image_pil.convert('RGB')
                    
                    reference_img_array = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
                    
                    image_filename = f"{safe_name}_{mongo_id[:8]}.jpg"
                    save_path = os.path.join(DB_PIC_FOLDER, image_filename)
                    
                    cv2.imwrite(save_path, reference_img_array, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    
                    self.filename_to_fullname[image_filename] = full_student_name
                    self.filename_to_fullname[save_path] = full_student_name
                    self.fullname_to_filepath[full_student_name] = save_path
                    
                    student_count += 1
                    print(f"  ✓ {full_student_name} → {image_filename}")
                    
                except Exception as e:
                    print(f"❌ {full_student_name}: {str(e)[:50]}")
                    failed_count += 1
                    continue
            
            print(f"\n{'='*60}")
            print(f"Database Initialization Complete:")
            print(f"  ✓ Successfully saved: {student_count}")
            print(f"  ✗ Failed: {failed_count}")
            print(f"  → Total students: {len(self.all_students)}")
            print(f"  → Name mappings created: {len(self.filename_to_fullname)}")
            print(f"{'='*60}\n")
            
            if student_count > 0:
                print("Warming up face recognition engine...")
                try:
                    dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)
                    DeepFace.find(
                        img_path=dummy_img,
                        db_path=DB_PIC_FOLDER,
                        model_name=self.model_name,
                        detector_backend=self.detector_backend,
                        distance_metric=self.distance_metric,
                        enforce_detection=False,
                        silent=True
                    )
                    print("✓ Engine ready\n")
                except:
                    pass
            
            return student_count > 0

        except Exception as e:
            print(f"❌ Database error: {e}")
            traceback.print_exc()
            return False

    def _can_recognize_student(self, name):
        """Check if cooldown period has passed."""
        if name == "Unknown":
            return True  # Allow unknown faces to be tracked
            
        current_time = datetime.now()
        if name in self.recognition_cooldown:
            time_diff = (current_time - self.recognition_cooldown[name]).total_seconds()
            if time_diff < self.cooldown_seconds:
                return False
        
        self.recognition_cooldown[name] = current_time
        return True

    def _detect_all_faces(self, frame):
        """
        STEP 1: Detect ALL faces in the frame using Haar Cascade.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(self.min_face_size, self.min_face_size),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        return faces

    def _extract_face_embedding(self, face_img):
        """
        Extract face embedding for comparison.
        """
        try:
            embedding_objs = DeepFace.represent(
                img_path=face_img,
                model_name=self.model_name,
                enforce_detection=False,
                detector_backend=self.detector_backend
            )
            
            if embedding_objs and len(embedding_objs) > 0:
                return np.array(embedding_objs[0]["embedding"])
        except:
            pass
        return None

    def _is_similar_to_known_unknown(self, embedding):
        """
        Check if this face embedding is similar to already detected unknowns.
        """
        if embedding is None or len(self.unknown_face_embeddings) == 0:
            return False
        
        for known_unknown_emb in self.unknown_face_embeddings:
            # Calculate cosine similarity
            similarity = np.dot(embedding, known_unknown_emb) / (
                np.linalg.norm(embedding) * np.linalg.norm(known_unknown_emb)
            )
            
            distance = 1 - similarity
            
            # --- FIX 1: Tightened similarity threshold ---
            # Changed from 0.25 to 0.15. This makes the system stricter about 
            # attempting to merge two unknown faces into one identity.
            if distance < 0.15:
                return True
        
        return False
        
    def _is_real_face(self, face_img):
        """
        NEW: Filters out false positives (blobs, walls, noise) using variance and blur checks.
        """
        try:
            # 1. Size Check
            if face_img.shape[0] < self.min_face_size or face_img.shape[1] < self.min_face_size:
                return False

            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)

            # 2. Variance Check (Detects flat blobs like walls)
            # Real faces have high contrast (eyes, nose, shadows). 
            # Flat gray images usually have variance < 500.
            variance = cv2.meanStdDev(gray)[1] ** 2
            if variance < 1500: 
                # print(f"Rejected: Low Variance ({variance})") 
                return False

            # 3. Blur Check (Laplacian Variance)
            # Very blurry images are usually false positives.
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            if blur_score < 100: 
                # print(f"Rejected: Too Blurry ({blur_score})")
                return False

            # 4. Secondary DeepFace Verification (Strict Mode)
            # Haar detected it, but can a modern AI confirm it?
            try:
                # We turn enforce_detection=True here specifically to filter garbage
                DeepFace.extract_faces(
                    img_path=face_img, 
                    detector_backend='opencv', 
                    enforce_detection=True,
                    align=False
                )
            except:
                # If DeepFace explicitly says "no face detected", believe it.
                return False

            return True

        except Exception as e:
            return False

    def _track_unknown_face(self, face_rect, frame_count):
        """
        ADVANCED: Track unknown faces across multiple frames for verification.
        """
        x, y, w, h = face_rect
        center_x = x + w // 2
        center_y = y + h // 2
        
        # --- FIX 3: Robust tracking with stale data removal ---
        # Clean up stale trackers (haven't been seen in 30 frames)
        # This prevents a new person entering an old location from being mistakenly matched.
        stale_keys = []
        for key, data in self.unknown_face_tracker.items():
            if frame_count - data['last_seen'] > 30:
                 stale_keys.append(key)
        for key in stale_keys:
            del self.unknown_face_tracker[key]

        # Find if this face matches any remaining tracked unknown
        matched_key = None
        for key, data in self.unknown_face_tracker.items():
            prev_x, prev_y = data['center']
            distance = np.sqrt((center_x - prev_x)**2 + (center_y - prev_y)**2)
            
            # If within 80 pixels, consider it the same face spatial area
            if distance < 80:
                matched_key = key
                break
        
        if matched_key:
            # Update existing tracked face
            self.unknown_face_tracker[matched_key]['frames'].append(frame_count)
            self.unknown_face_tracker[matched_key]['last_seen'] = frame_count
            self.unknown_face_tracker[matched_key]['center'] = (center_x, center_y)
            return matched_key, len(self.unknown_face_tracker[matched_key]['frames'])
        else:
            # New unknown face tracker
            key = f"unknown_{len(self.unknown_face_tracker)}_{frame_count}"
            self.unknown_face_tracker[key] = {
                'center': (center_x, center_y),
                'rect': face_rect,
                'frames': [frame_count],
                'first_seen': frame_count,
                'last_seen': frame_count,
                'verified': False
            }
            return key, 1

    def _capture_unknown_face(self, frame, face_rect, frame_count, distance):
        """
        Capture and save verified unknown person's face.
        """
        x, y, w, h = face_rect
        
        # Convert to native Python int
        x, y, w, h = int(x), int(y), int(w), int(h)
        
        padding = 20
        y1 = max(0, y - padding)
        y2 = min(frame.shape[0], y + h + padding)
        x1 = max(0, x - padding)
        x2 = min(frame.shape[1], x + w + padding)
        
        face_img = frame[y1:y2, x1:x2]
        
        if face_img.size == 0:
            return None
        
        # --- NEW FILTERING LOGIC ---
        # Before we process or save, check if it's actually a face (reject blobs/walls)
        if not self._is_real_face(face_img):
            return None
        # --- END NEW FILTERING ---
        
        # Extract embedding to avoid duplicates
        embedding = self._extract_face_embedding(face_img)
        
        # This is where the duplicate check happens
        if embedding is not None and self._is_similar_to_known_unknown(embedding):
            print(f" → Face at frame {frame_count} matched an existing unknown, skipping capture.")
            return None  # Already captured this unknown person
        
        # Save the embedding
        if embedding is not None:
            self.unknown_face_embeddings.append(embedding)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unknown_id = len(self.unknown_persons) + 1
        filename = f"unknown_{unknown_id}_{timestamp}_frame{frame_count}.jpg"
        filepath = os.path.join(UNKNOWN_FACES_FOLDER, filename)
        
        cv2.imwrite(filepath, face_img)
        
        _, buffer = cv2.imencode('.jpg', face_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        unknown_data = {
            'id': int(unknown_id),
            'frame': int(frame_count),
            'time': datetime.now().strftime("%H:%M:%S"),
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'distance': float(distance),
            'rect': (int(x), int(y), int(w), int(h)),
            'filename': filename,
            'filepath': filepath,
            'image_base64': img_base64
        }
        
        self.unknown_persons.append(unknown_data)
        
        print(f"\n🔴 UNKNOWN PERSON DETECTED & VERIFIED: Frame {frame_count} | ID: {unknown_id} | Distance: {distance:.3f}")
        
        return unknown_data

    def recognize_faces(self, frame, frame_count=0):
        """
        ADVANCED MULTI-STAGE UNKNOWN DETECTION
        """
        recognized_faces = []
        
        if not os.path.exists(DB_PIC_FOLDER) or not os.listdir(DB_PIC_FOLDER):
            return []
        
        # STEP 1: Detect ALL faces in frame
        all_detected_faces = self._detect_all_faces(frame)
        
        if len(all_detected_faces) == 0:
            return []
        
        print(f"\n[Frame {frame_count}] Detected {len(all_detected_faces)} face(s) in frame", end='')
        
        # STEP 2: Try to recognize each detected face
        for idx, (x, y, w, h) in enumerate(all_detected_faces):
            # Skip very small faces
            if w < self.min_face_size or h < self.min_face_size:
                continue
            
            # Extract face region with padding
            padding = 20
            y1 = max(0, y - padding)
            y2 = min(frame.shape[0], y + h + padding)
            x1 = max(0, x - padding)
            x2 = min(frame.shape[1], x + w + padding)
            
            face_img = frame[y1:y2, x1:x2]
            
            if face_img.size == 0:
                continue
            
            # Try DeepFace recognition
            try:
                results = DeepFace.find(
                    img_path=face_img,
                    db_path=DB_PIC_FOLDER,
                    model_name=self.model_name,
                    detector_backend=self.detector_backend,
                    distance_metric=self.distance_metric,
                    enforce_detection=False,
                    silent=True,
                    threshold=self.deepface_threshold
                )
                
                if results and len(results) > 0 and not results[0].empty:
                    # Found a match in database
                    best_match = results[0].iloc[0]
                    
                    try:
                        distance = best_match['distance']
                    except KeyError:
                        distance = best_match.get(f'{self.distance_metric}', 1.0)
                    
                    identity_path = best_match['identity']
                    filename = os.path.basename(identity_path)
                    full_name = self.filename_to_fullname.get(identity_path) or self.filename_to_fullname.get(filename)
                    
                    if not full_name:
                        full_name = filename.split('_')[0].replace('-', '/').replace('_', ' ')
                    
                    # Convert coordinates to native Python int
                    x, y, w, h = int(x), int(y), int(w), int(h)
                    
                    # CRITICAL: Check if match is reliable
                    if distance > self.unknown_distance_threshold:
                        # Distance too high, classify as UNKNOWN
                        print(f" → Face #{idx+1}: UNKNOWN (poor match: {distance:.3f})", end='')
                        
                        # Track this unknown face
                        track_key, verification_count = self._track_unknown_face((x, y, w, h), frame_count)
                        
                        if verification_count >= self.unknown_verification_frames and not self.unknown_face_tracker[track_key]['verified']:
                            # Verified across multiple frames, capture it
                            self.unknown_face_tracker[track_key]['verified'] = True
                            unknown_data = self._capture_unknown_face(frame, (x, y, w, h), frame_count, float(distance))
                            
                            if unknown_data:
                                recognized_faces.append({
                                    'name': "Unknown",
                                    'confidence': float(1.0 - distance),
                                    'rect': (int(x), int(y), int(w), int(h)),
                                    'distance': float(distance),
                                    'verified': True
                                })
                        else:
                            # Still tracking, not verified yet
                            recognized_faces.append({
                                'name': "Unknown (Tracking)",
                                'confidence': float(1.0 - distance),
                                'rect': (int(x), int(y), int(w), int(h)),
                                'distance': float(distance),
                                'verified': False
                            })
                    else:
                        # Good match with a known student
                        print(f" → Face #{idx+1}: {full_name} (dist: {distance:.3f})", end='')
                        recognized_faces.append({
                            'name': full_name,
                            'confidence': float(1.0 - distance),
                            'rect': (int(x), int(y), int(w), int(h)),
                            'distance': float(distance)
                        })
                else:
                    # No match found in database at all
                    print(f" → Face #{idx+1}: NO MATCH", end='')
                    
                    # Convert coordinates to native Python int
                    x, y, w, h = int(x), int(y), int(w), int(h)
                    
                    # Track and verify as unknown
                    track_key, verification_count = self._track_unknown_face((x, y, w, h), frame_count)
                    
                    if verification_count >= self.unknown_verification_frames and not self.unknown_face_tracker[track_key]['verified']:
                        self.unknown_face_tracker[track_key]['verified'] = True
                        unknown_data = self._capture_unknown_face(frame, (x, y, w, h), frame_count, 1.0)
                        
                        if unknown_data:
                            recognized_faces.append({
                                'name': "Unknown",
                                'confidence': 0.0,
                                'rect': (int(x), int(y), int(w), int(h)),
                                'distance': 1.0,
                                'verified': True
                            })
                    else:
                        recognized_faces.append({
                            'name': "Unknown (Tracking)",
                            'confidence': 0.0,
                            'rect': (int(x), int(y), int(w), int(h)),
                            'distance': 1.0,
                            'verified': False
                        })
                        
            except Exception as e:
                # Recognition failed, treat as potential unknown
                print(f" → Face #{idx+1}: ERROR ({str(e)[:30]})", end='')
                
                # Convert coordinates to native Python int
                x, y, w, h = int(x), int(y), int(w), int(h)
                
                track_key, verification_count = self._track_unknown_face((x, y, w, h), frame_count)
                
                if verification_count >= self.unknown_verification_frames and not self.unknown_face_tracker[track_key]['verified']:
                    self.unknown_face_tracker[track_key]['verified'] = True
                    unknown_data = self._capture_unknown_face(frame, (x, y, w, h), frame_count, 1.0)
                    
                    if unknown_data:
                        recognized_faces.append({
                            'name': "Unknown",
                            'confidence': 0.0,
                            'rect': (int(x), int(y), int(w), int(h)),
                            'distance': 1.0,
                            'verified': True
                        })

        return recognized_faces

    def mark_attendance(self, name, confidence, distance):
        """Mark attendance with validation."""
        if name == "Unknown" or "Tracking" in name:
            return False
        
        # Only mark if distance is below threshold
        if distance > self.present_distance_threshold:
            return False
        
        if not self._can_recognize_student(name):
            return False
        
        if name not in self.attendance_marked:
            self.attendance_marked[name] = {
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "Present",
                "confidence": f"{confidence:.2f}",
                "distance": f"{distance:.3f}"
            }
            print(f"\n✅ ATTENDANCE MARKED: {name} (distance: {distance:.3f}, conf: {confidence:.2f})")
            return True
        
        return False
    
    def process_video_file(self, video_path):
        """
        Video processing with advanced unknown detection.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_seconds = total_frames / fps if fps > 0 else 0
        
        # Video Writer Setup
        video_filename = os.path.basename(video_path)
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"processed_{timestamp_str}_{video_filename}"
        output_path = os.path.join(VIDEO_OUTPUT_FOLDER, output_filename)
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            print(f"❌ Warning: Could not open video writer for {output_path}.")

        print(f"\n{'='*60}")
        print(f"Processing Video: {video_filename}")
        print(f"Output Video Path: {output_path}")
        print(f"Total frames: {total_frames} | FPS: {fps:.1f} | Duration: {duration_seconds:.1f}s")
        print(f"Students in database: {len(self.all_students)}")
        print(f"ADVANCED MODE: Processing every {self.process_every_n_frames}th frame")
        print(f"UNKNOWN DETECTION: Multi-stage verification ({self.unknown_verification_frames} frames)")
        print(f"{'='*60}\n")
        
        frame_count = 0
        recognized_history = []
        current_faces = []
        
        # Reset tracking for new video
        self.recognition_cooldown = {}
        self.attendance_marked = {}
        self.unknown_persons = []
        self.unknown_face_tracker = {}
        self.unknown_face_embeddings = []
        
        all_found = False

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            if len(self.attendance_marked) == len(self.all_students) and len(self.all_students) > 0:
                if not all_found:
                    print(f"\n\n🎯 All students found! Continuing to detect unknowns...")
                    all_found = True

            if frame_count % self.process_every_n_frames == 0:
                faces = self.recognize_faces(frame.copy(), frame_count) 
                current_faces = faces
                
                if faces:
                    for face in faces:
                        if face['name'] != "Unknown" and "Tracking" not in face['name']:
                            marked = self.mark_attendance(face['name'], face['confidence'], face['distance'])
                            if marked:
                                recognized_history.append({
                                    'name': face['name'],
                                    'confidence': face['confidence'],
                                    'distance': face['distance'],
                                    'frame': frame_count,
                                    'time': datetime.now().strftime("%H:%M:%S")
                                })
            
            # Draw bounding boxes
            for face in current_faces:
                name = face['name']
                conf = face['confidence']
                dist = face['distance']
                (x, y, w, h) = face['rect']
                
                # Color coding
                if name != "Unknown" and "Tracking" not in name and name in self.attendance_marked:
                    color = (0, 255, 0)  # Green - Present
                    label = f"{name} ({dist:.2f})"
                elif "Unknown" in name:
                    if face.get('verified', False):
                        color = (0, 0, 255)  # Red - Verified Unknown
                        label = f"UNKNOWN! ({dist:.2f})"
                    else:
                        color = (0, 165, 255)  # Orange - Tracking
                        label = f"Tracking... ({dist:.2f})"
                else:
                    color = (255, 255, 0)  # Yellow - Low confidence
                    label = f"{name} (LOW: {dist:.2f})"
                
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.rectangle(frame, (x, y - 25), (x + w, y), color, -1)
                cv2.putText(frame, label, (x + 6, y - 6), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
            
            if out.isOpened():
                out.write(frame)
            
            progress = (frame_count / total_frames) * 100 if total_frames > 0 else 0
            unknown_count = len(self.unknown_persons)
            print(f"\rProgress: {progress:.1f}% | Marked: {len(self.attendance_marked)}/{len(self.all_students)} | Unknown: {unknown_count}", end='')
        
        cap.release()
        if out.isOpened():
            out.release()
            print(f"\n\n✓ Video saved successfully to: {output_path}")
        
        print(f"\n\n{'='*60}")
        print(f"Processing Complete!")
        print(f"{'='*60}")
        
        present_students = set(self.attendance_marked.keys())
        absent_students = self.all_students - present_students
        
        # Absent Students Image Processing
        absent_details = []
        for student in absent_students:
            original_filepath = self.fullname_to_filepath.get(student)
            annotated_base64 = None
            
            if original_filepath:
                annotated_base64 = self._annotate_absent_image(student, original_filepath)
                
            self.attendance_marked[student] = {
                "time": "N/A",
                "status": "Absent",
                "confidence": "N/A",
                "distance": "N/A"
            }
            absent_details.append({
                "name": student,
                "image_base64": annotated_base64
            })
        
        report = {
            "total_frames": int(total_frames),
            "duration_seconds": float(duration_seconds),
            "total_students": int(len(self.all_students)),
            "present_count": int(len(present_students)),
            "absent_count": int(len(absent_students)),
            "unknown_count": int(len(self.unknown_persons)),
            "present_students": sorted(list(present_students)),
            "absent_students": sorted(list(absent_students)),
            "absent_student_images": absent_details,
            "unknown_persons": convert_to_serializable(self.unknown_persons),
            "recognition_history": convert_to_serializable(recognized_history),
            "attendance_details": self.attendance_marked,
            "output_video_path": output_path
        }
        
        print(f"\nFinal Report:")
        print(f"  Total Students: {len(self.all_students)}")
        print(f"  ✓ Present: {len(present_students)}")
        print(f"  ❌ Absent: {len(absent_students)}")
        print(f"  🔴 Unknown Persons: {len(self.unknown_persons)}")
        print(f"  Recognition Events: {len(recognized_history)}")
        
        if present_students:
            print(f"\n  Present Students:")
            for name in sorted(present_students):
                details = self.attendance_marked[name]
                print(f"    • {name} (dist: {details['distance']}, time: {details['time']})")
        
        if absent_students:
            print(f"\n  Absent Students:")
            for name in sorted(absent_students):
                print(f"    ❌ {name}")
        
        if self.unknown_persons:
            print(f"\n  Unknown Persons Detected:")
            for unknown in self.unknown_persons:
                print(f"    🔴 ID: {unknown['id']} | Frame: {unknown['frame']} | Time: {unknown['time']} | Distance: {unknown['distance']:.3f}")
        
        print(f"\n{'='*60}\n")
        
        return report
    
    def get_attendance_summary(self):
        """Get current attendance summary with unknown persons."""
        present = [n for n, d in self.attendance_marked.items() if d.get('status') == 'Present']
        absent = [n for n, d in self.attendance_marked.items() if d.get('status') == 'Absent']
        
        absent_data = []
        for name in absent:
            data = {"name": name}
            safe_name = name.replace(' ', '_').replace('/', '-')
            annotated_filename = f"absent_{safe_name}.jpg"
            annotated_filepath = os.path.join(ABSENT_PIC_FOLDER, annotated_filename)
            
            if os.path.exists(annotated_filepath):
                 try:
                    with open(annotated_filepath, "rb") as image_file:
                        data['image_base64'] = base64.b64encode(image_file.read()).decode('utf-8')
                 except:
                    data['image_base64'] = None
            
            absent_data.append(data)
        
        return {
            "present": sorted(present),
            "absent": sorted(absent),
            "absent_details": absent_data,
            "unknown_persons": self.unknown_persons,
            "total": len(self.all_students),
            "details": self.attendance_marked
        }