# attendance.py - OPTIMIZED FOR SPEED
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

warnings.filterwarnings('ignore')

DB_PIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db_pic')

class OptimizedAttendanceSystem:
    def __init__(self, mongodb_manager, attendance_log="attendance.json"):
        """
        Initialize the attendance system with speed optimizations.
        """
        self.mongodb_manager = mongodb_manager
        self.attendance_log = attendance_log
        self.attendance_marked = {}
        self.all_students = set()
        
        # DeepFace Configuration - SPEED OPTIMIZED
        self.model_name = 'Facenet'
        self.detector_backend = 'opencv'  # Fastest detector
        self.distance_metric = 'cosine'
        self.custom_threshold = 0.50
        
        # Performance optimization
        self.recognition_cooldown = {}
        self.cooldown_seconds = 5  # Increased to reduce redundant processing
        self.confidence_threshold = 0.40
        
        # Speed optimization settings
        self.process_every_n_frames = 30  # Process less frequently
        self.max_workers = min(4, multiprocessing.cpu_count())
        
        print(f"\n{'='*60}")
        print(f"Initializing Face Recognition System (SPEED MODE)")
        print(f"Model: {self.model_name} | Metric: {self.distance_metric}")
        print(f"Distance Threshold: {self.custom_threshold:.4f}")
        print(f"Confidence Threshold: {self.confidence_threshold:.2f}")
        print(f"Frame Skip: Every {self.process_every_n_frames}th frame")
        print(f"{'='*60}\n")
        
        self._build_database()

    def _build_database(self):
        """
        Fast database building - minimal processing.
        """
        print("Initializing face database from MongoDB...")

        if self.mongodb_manager is None or self.mongodb_manager.db is None:
            print("❌ Database connection failed.")
            return False

        # Clean and recreate folder
        if os.path.exists(DB_PIC_FOLDER):
            import shutil
            shutil.rmtree(DB_PIC_FOLDER)
        os.makedirs(DB_PIC_FOLDER, exist_ok=True)
        
        print(f"Local images folder: {DB_PIC_FOLDER}")

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
                raw_name = record.get('studentName', 'Unknown Student')
                student_name = raw_name.strip().replace(' ', '_').replace('/', '-')
                mongo_id = str(record.get('_id', 'unknown'))
                base64_pic = record.get('studentPic')
                
                self.all_students.add(raw_name)

                if not base64_pic or base64_pic == "":
                    print(f"⚠️  {raw_name}: Missing image")
                    failed_count += 1
                    continue
                
                try:
                    # Fast decode - minimal processing
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
                        print(f"⚠️  {raw_name}: Invalid format")
                        failed_count += 1
                        continue
                    
                    # Fast PIL conversion
                    image_pil = Image.open(io.BytesIO(image_bytes))
                    
                    if image_pil.mode != 'RGB':
                        image_pil = image_pil.convert('RGB')
                    
                    # SPEED OPTIMIZATION: Skip face detection validation
                    # Direct save for faster startup
                    reference_img_array = cv2.cvtColor(np.array(image_pil), cv2.COLOR_RGB2BGR)
                    
                    # Save image
                    image_filename = f"{student_name}_{mongo_id[:8]}.jpg"
                    save_path = os.path.join(DB_PIC_FOLDER, image_filename)
                    
                    # Fast save - lower quality for speed
                    cv2.imwrite(save_path, reference_img_array, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    
                    student_count += 1
                    print(f"  ✓ {raw_name}")
                    
                except Exception as e:
                    print(f"❌ {raw_name}: {str(e)[:50]}")
                    failed_count += 1
                    continue
            
            print(f"\n{'='*60}")
            print(f"Database Initialization Complete:")
            print(f"  ✓ Successfully saved: {student_count}")
            print(f"  ✗ Failed: {failed_count}")
            print(f"  → Total students: {len(self.all_students)}")
            print(f"{'='*60}\n")
            
            # Pre-warm DeepFace cache (once)
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
            return False
            
        current_time = datetime.now()
        if name in self.recognition_cooldown:
            time_diff = (current_time - self.recognition_cooldown[name]).total_seconds()
            if time_diff < self.cooldown_seconds:
                return False
        
        self.recognition_cooldown[name] = current_time
        return True

    def recognize_faces(self, frame):
        """
        FAST face recognition - minimal preprocessing.
        """
        recognized_faces = []
        
        if not os.path.exists(DB_PIC_FOLDER) or not os.listdir(DB_PIC_FOLDER):
            return []
        
        try:
            # SPEED: Aggressive downsizing
            height, width = frame.shape[:2]
            
            # Reduce to 480p max for speed
            if width > 480:
                scale = 480 / width
                frame = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            
            # SPEED: Skip denoising (too slow)
            # Process directly
            
            results = DeepFace.find(
                img_path=frame,
                db_path=DB_PIC_FOLDER,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                distance_metric=self.distance_metric,
                enforce_detection=False,
                silent=True
            )
        except Exception as e:
            return []

        if not results:
            return []
        
        for df in results:
            if df.empty:
                continue

            best_match = df.iloc[0]
            
            # Get distance
            try:
                distance = best_match['distance']
            except KeyError:
                distance = best_match.get(f'{self.distance_metric}', 1.0)

            identity_path = best_match['identity']
            
            # Extract student name
            filename = os.path.basename(identity_path)
            name = filename.split('_')[0].replace('-', '/').replace('_', ' ')
            
            # Extract coordinates
            try:
                x = int(best_match['source_x'])
                y = int(best_match['source_y'])
                w = int(best_match['source_w'])
                h = int(best_match['source_h'])
            except:
                continue
            
            # Calculate confidence
            if distance < self.custom_threshold:
                confidence = max(0.0, min(1.0, 1.0 - (distance / self.custom_threshold)))
                
                recognized_faces.append({
                    'name': name,
                    'confidence': confidence,
                    'rect': (x, y, w, h),
                    'distance': distance
                })
            else:
                recognized_faces.append({
                    'name': "Unknown",
                    'confidence': 0.0,
                    'rect': (x, y, w, h),
                    'distance': distance
                })

        return recognized_faces

    def mark_attendance(self, name, confidence):
        """Mark attendance with validation."""
        if name == "Unknown":
            return False
        
        if confidence < self.confidence_threshold:
            return False
        
        if not self._can_recognize_student(name):
            return False
        
        if name not in self.attendance_marked:
            self.attendance_marked[name] = {
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "Present",
                "confidence": f"{confidence:.2f}"
            }
            print(f"✅ ATTENDANCE MARKED: {name} (confidence: {confidence:.2f})")
            return True
        
        return False
    
    def process_video_file(self, video_path):
        """
        SPEED OPTIMIZED video processing.
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_seconds = total_frames / fps if fps > 0 else 0
        
        print(f"\n{'='*60}")
        print(f"Processing Video: {os.path.basename(video_path)}")
        print(f"Total frames: {total_frames} | FPS: {fps:.1f} | Duration: {duration_seconds:.1f}s")
        print(f"Students in database: {len(self.all_students)}")
        print(f"SPEED MODE: Processing every {self.process_every_n_frames}th frame")
        print(f"{'='*60}\n")
        
        frame_count = 0
        recognized_history = []
        
        self.recognition_cooldown = {}
        self.attendance_marked = {}
        
        # SPEED: Early exit if all students found
        all_found = False

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # SPEED: Early exit check
            if len(self.attendance_marked) == len(self.all_students):
                if not all_found:
                    print(f"\n🎯 All students found! Fast-forwarding to end...")
                    all_found = True
                # Skip to end quickly
                if frame_count % 100 == 0:
                    progress = (frame_count / total_frames) * 100
                    print(f"Progress: {progress:.1f}% | All {len(self.all_students)} students marked ✓", end='\r')
                continue
            
            if frame_count % self.process_every_n_frames == 0:
                faces = self.recognize_faces(frame)
                
                if faces:
                    for face in faces:
                        marked = self.mark_attendance(face['name'], face['confidence'])
                        if marked:
                            recognized_history.append({
                                'name': face['name'],
                                'confidence': face['confidence'],
                                'frame': frame_count,
                                'time': datetime.now().strftime("%H:%M:%S")
                            })
                
                progress = (frame_count / total_frames) * 100 if total_frames > 0 else 0
                print(f"Progress: {progress:.1f}% | Marked: {len(self.attendance_marked)}/{len(self.all_students)}", end='\r')
        
        cap.release()
        
        print(f"\n\n{'='*60}")
        print(f"Processing Complete!")
        print(f"{'='*60}")
        
        # Mark absent students
        present_students = set(self.attendance_marked.keys())
        absent_students = self.all_students - present_students
        
        for student in absent_students:
            self.attendance_marked[student] = {
                "time": "N/A",
                "status": "Absent",
                "confidence": "N/A"
            }
        
        report = {
            "total_frames": total_frames,
            "duration_seconds": duration_seconds,
            "total_students": len(self.all_students),
            "present_count": len(present_students),
            "absent_count": len(absent_students),
            "present_students": sorted(list(present_students)),
            "absent_students": sorted(list(absent_students)),
            "recognition_history": recognized_history,
            "attendance_details": self.attendance_marked
        }
        
        print(f"\nFinal Report:")
        print(f"  Total Students: {len(self.all_students)}")
        print(f"  ✓ Present: {len(present_students)}")
        print(f"  ✗ Absent: {len(absent_students)}")
        print(f"  Recognition Events: {len(recognized_history)}")
        
        if present_students:
            print(f"\n  Present Students:")
            for name in sorted(present_students):
                conf = self.attendance_marked[name]['confidence']
                time = self.attendance_marked[name]['time']
                print(f"    • {name} (confidence: {conf}, time: {time})")
        
        if absent_students:
            print(f"\n  Absent Students:")
            for name in sorted(absent_students):
                print(f"    • {name}")
        
        print(f"\n{'='*60}\n")
        
        return report
    
    def get_attendance_summary(self):
        """Get current attendance summary."""
        present = [n for n, d in self.attendance_marked.items() if d.get('status') == 'Present']
        absent = [n for n, d in self.attendance_marked.items() if d.get('status') == 'Absent']
        
        return {
            "present": sorted(present),
            "absent": sorted(absent),
            "total": len(self.all_students),
            "details": self.attendance_marked
        }