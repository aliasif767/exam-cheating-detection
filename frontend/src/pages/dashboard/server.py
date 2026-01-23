import os
import sys
import uuid
import traceback
import json
import cv2
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, make_response
from werkzeug.utils import secure_filename
from flask_cors import CORS
import base64
import io
from PIL import Image
import pymongo 
from bson import ObjectId

project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# ===============================================
# MongoDB Configuration
# ===============================================
MONGO_URI = "mongodb://localhost:27017/" 
DB_NAME = "ai-vision-exam"

# Check mongodb_manager
print("\n[1/7] Checking mongodb_manager.py...")
try:
    from mongodb_manager import MongoDBManager
    print("  ✓ MongoDBManager imported")
except ImportError as e:
    print(f"  ✗ Failed to import MongoDBManager: {e}")
    sys.exit(1)

# Check AI detector
print("\n[2/7] Checking ai_detector.py...")
try:
    from ai_detector import PersonFacePhoneDetector
    print("  ✓ PersonFacePhoneDetector imported")
except ImportError as e:
    print(f"  ✗ Failed to import: {e}")
    sys.exit(1)

# Check attendance
print("\n[3/7] Checking attendance.py...")
try:
    from attendance import OptimizedAttendanceSystem
    print("  ✓ AttendanceSystem imported")
except ImportError as e:
    print(f"  ✗ Failed to import: {e}")
    sys.exit(1)

# Check YOLO
print("\n[4/7] Checking YOLO model...")
yolo_path = os.path.join(project_root, 'yolov8n.pt')
if os.path.exists(yolo_path):
    size_mb = os.path.getsize(yolo_path) / (1024 * 1024)
    print(f"  ✓ yolov8n.pt found ({size_mb:.1f} MB)")
else:
    print(f"  ⚠ yolov8n.pt will auto-download on first run (takes time)")

# Create folders
print("\n[5/7] Creating necessary folders...")
folders = {
    'uploads': 'Input videos',
    'processed_videos': 'Output videos',
    'attendance_reports': 'Attendance reports',
}
for folder, description in folders.items():
    folder_path = os.path.join(project_root, folder)
    os.makedirs(folder_path, exist_ok=True)
    print(f"  ✓ {folder} ({description})")

# Load YOLO
print("\n[6/7] Loading YOLO model...")
try:
    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    print("  ✓ YOLO model loaded")
except Exception as e:
    print(f"  ✗ YOLO load failed: {e}")
    traceback.print_exc()
    sys.exit(1)

# Initialize MongoDB Manager
print("\n[7/7] Initializing systems...")
try:
    mongo_manager = MongoDBManager(mongo_uri=MONGO_URI, db_name=DB_NAME)
    print("  ✓ MongoDB Manager initialized")
except Exception as e:
    print(f"  ✗ MongoDB Manager failed: {e}")
    sys.exit(1)

try:
    ai_detector = PersonFacePhoneDetector(
        yolo_model=model,
        confidence_threshold=0.40
    )
    print("  ✓ AI Detector initialized")
except Exception as e:
    print(f"  ✗ AI Detector failed: {e}")
    sys.exit(1)

ATTENDANCE_FOLDER = os.path.join(project_root, 'attendance_reports')

try:
    attendance_system = OptimizedAttendanceSystem(
        mongodb_manager=mongo_manager,
        attendance_log=os.path.join(ATTENDANCE_FOLDER, 'attendance.json')
    )
    if mongo_manager.db is not None: 
        attendance_system._build_database()
    print("  ✓ Attendance System initialized with MongoDB")
except Exception as e:
    print(f"  ✗ Attendance System failed: {e}")
    traceback.print_exc()
    sys.exit(1)

UPLOAD_FOLDER = os.path.join(project_root, 'uploads')
OUTPUT_FOLDER = os.path.join(project_root, 'processed_videos')
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm', 'mkv'}

app = Flask(__name__)

CORS(app, 
    resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        },
        r"/processed_videos/*": {"origins": "*"},
        r"/attendance_reports/*": {"origins": "*"}
    },
    supports_credentials=True
)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ===============================================
# API Endpoints for Exam Management
# ===============================================

@app.route('/api/exams/today', methods=['GET'])
def get_todays_exams():
    """Get all exams scheduled for today"""
    try:
        exams = mongo_manager.get_todays_exams()
        return jsonify({
            "success": True,
            "data": exams,
            "count": len(exams)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/exams', methods=['GET'])
def get_exams():
    """Get all exams or filter by status"""
    try:
        status = request.args.get('status')
        exams = mongo_manager.get_exams(status)
        return jsonify({
            "success": True,
            "data": exams
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/exams', methods=['POST'])
def create_exam():
    """Create a new exam"""
    try:
        exam_data = request.json
        exam_id = mongo_manager.create_exam(exam_data)
        return jsonify({
            "success": True,
            "message": "Exam created successfully",
            "data": {"id": exam_id}
        }), 201
    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/exams/<exam_id>', methods=['GET'])
def get_exam(exam_id):
    """Get a specific exam by ID"""
    try:
        exam = mongo_manager.get_exam_by_id(exam_id)
        if exam:
            return jsonify({
                "success": True,
                "data": exam
            }), 200
        return jsonify({
            "success": False,
            "message": "Exam not found"
        }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/exams/<exam_id>', methods=['PUT'])
def update_exam(exam_id):
    """Update an existing exam"""
    try:
        exam_data = request.json
        success = mongo_manager.update_exam(exam_id, exam_data)
        if success:
            return jsonify({
                "success": True,
                "message": "Exam updated successfully"
            }), 200
        return jsonify({
            "success": False,
            "message": "Exam not found"
        }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/exams/<exam_id>', methods=['DELETE'])
def delete_exam(exam_id):
    """Delete an exam"""
    try:
        success = mongo_manager.delete_exam(exam_id)
        if success:
            return jsonify({
                "success": True,
                "message": "Exam deleted successfully"
            }), 200
        return jsonify({
            "success": False,
            "message": "Exam not found"
        }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# ===============================================
# Student Management Endpoints
# ===============================================

@app.route('/api/students/count', methods=['GET'])
def get_students_count():
    """Get total count of registered students from attendance collection"""
    try:
        count = mongo_manager.get_total_students_count()
        return jsonify({
            "success": True,
            "count": count
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e),
            "count": 0
        }), 500
    
@app.route('/api/attendance/register-student', methods=['POST', 'OPTIONS'])
def register_student_for_attendance():
    """Register student face template for attendance"""
    if request.method == 'OPTIONS':
        return '', 200
    
    print("\n" + "=" * 60)
    print("[REQUEST] Register Student Face Template")
    print("=" * 60)

    try:
        student_name = request.form.get('studentName')
        image_file = request.files.get('image')
        
        if not student_name or not student_name.strip():
            print("✗ Student name is required")
            return jsonify({
                "success": False,
                "message": "Student name is required."
            }), 400
        
        if not image_file:
            print("✗ Image file is required")
            return jsonify({
                "success": False,
                "message": "Image file is required."
            }), 400
        
        allowed_extensions = {'jpg', 'jpeg', 'png'}
        file_ext = image_file.filename.split('.')[-1].lower()
        
        if file_ext not in allowed_extensions:
            print(f"✗ Invalid file type: {file_ext}")
            return jsonify({
                "success": False,
                "message": f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
            }), 400
        
        try:
            image_data = image_file.read()
            image = Image.open(io.BytesIO(image_data))
            image.verify()
            base64_image = base64.b64encode(image_data).decode('utf-8')
            print(f"✓ Image validated: {len(image_data) / 1024:.2f} KB")
        except Exception as e:
            print(f"✗ Invalid image file: {str(e)}")
            return jsonify({
                "success": False,
                "message": f"Invalid image file: {str(e)}"
            }), 400
        
        if mongo_manager.db is None:
            print("✗ Database connection failed")
            return jsonify({
                "success": False,
                "message": "Database connection failed."
            }), 500
        
        collection = mongo_manager.db['attendances']
        
        face_template = {
            "type": "FaceTemplate",
            "studentName": student_name.strip(),
            "studentPic": f"data:image/{file_ext};base64,{base64_image}",
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "mark": "absent"
        }
        
        result = collection.insert_one(face_template)
        
        print(f"✓ Student registered: {student_name}")
        print(f"✓ MongoDB ID: {result.inserted_id}")
        
        try:
            attendance_system._build_database()
            print(f"✓ Face database rebuilt with new student")
        except Exception as rebuild_error:
            print(f"⚠ Warning: Could not rebuild database: {rebuild_error}")
        
        response = make_response(jsonify({
            "success": True,
            "message": f"Face template for '{student_name}' registered successfully!",
            "studentId": str(result.inserted_id)
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 201
    
    except Exception as e:
        print(f"✗ Registration Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/students/registered', methods=['GET', 'OPTIONS'])
def get_registered_students():
    """Retrieve all registered students with their face templates from attendances collection"""
    if request.method == 'OPTIONS':
        return '', 200
    
    print("\n" + "=" * 60)
    print("[REQUEST] Get All Registered Students")
    print("=" * 60)
    
    try:
        if mongo_manager.db is None:
            print("✗ Database connection failed")
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        collection = mongo_manager.db['attendances']
        
        students = list(collection.find({
            "type": "FaceTemplate",
            "studentPic": {"$exists": True, "$ne": None}
        }).sort('createdAt', pymongo.DESCENDING))
        
        for student in students:
            student['_id'] = str(student['_id'])
        
        print(f"✓ Retrieved {len(students)} registered students")
        
        response = make_response(jsonify({
            "success": True,
            "data": students,
            "count": len(students)
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error retrieving students: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/students/<student_id>', methods=['DELETE', 'OPTIONS'])
def delete_student(student_id):
    """Delete a registered student record from attendances collection"""
    if request.method == 'OPTIONS':
        return '', 200
    
    print("\n" + "=" * 60)
    print("[REQUEST] Delete Student Record")
    print("=" * 60)
    
    try:
        if mongo_manager.db is None:
            print("✗ Database connection failed")
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        try:
            obj_id = ObjectId(student_id)
        except:
            print(f"✗ Invalid student ID format: {student_id}")
            return jsonify({
                "success": False,
                "message": "Invalid student ID format"
            }), 400
        
        collection = mongo_manager.db['attendances']
        
        student = collection.find_one({"_id": obj_id})
        if not student:
            print(f"✗ Student not found: {student_id}")
            return jsonify({
                "success": False,
                "message": "Student not found"
            }), 404
        
        student_name = student.get('studentName', 'Unknown')
        
        result = collection.delete_one({"_id": obj_id})
        
        if result.deleted_count > 0:
            print(f"✓ Student deleted: {student_name} (ID: {student_id})")
            
            response = make_response(jsonify({
                "success": True,
                "message": f"Student '{student_name}' deleted successfully"
            }))
        else:
            print(f"✗ Failed to delete student: {student_id}")
            response = make_response(jsonify({
                "success": False,
                "message": "Failed to delete student"
            }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200 if result.deleted_count > 0 else 400
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error deleting student: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/students/<student_id>', methods=['GET', 'OPTIONS'])
def get_student_by_id(student_id):
    """Retrieve a specific student by ID"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if mongo_manager.db is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        try:
            obj_id = ObjectId(student_id)
        except:
            return jsonify({
                "success": False,
                "message": "Invalid student ID format"
            }), 400
        
        collection = mongo_manager.db['attendances']
        student = collection.find_one({"_id": obj_id})
        
        if student:
            student['_id'] = str(student['_id'])
            
            response = make_response(jsonify({
                "success": True,
                "data": student
            }))
        else:
            response = make_response(jsonify({
                "success": False,
                "message": "Student not found"
            }))
            return response, 404
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error retrieving student: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/students/search', methods=['GET', 'OPTIONS'])
def search_students():
    """Search students by name"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        search_query = request.args.get('name', '').strip()
        
        if not search_query:
            return jsonify({
                "success": False,
                "message": "Search query is required"
            }), 400
        
        if mongo_manager.db is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        collection = mongo_manager.db['attendances']
        
        students = list(collection.find({
            "type": "FaceTemplate",
            "studentName": {"$regex": search_query, "$options": "i"},
            "studentPic": {"$exists": True, "$ne": None}
        }).sort('createdAt', pymongo.DESCENDING))
        
        for student in students:
            student['_id'] = str(student['_id'])
        
        response = make_response(jsonify({
            "success": True,
            "data": students,
            "count": len(students)
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error searching students: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500    

# ===============================================
# Health Check
# ===============================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "message": "Server is running",
        "services": ["ai_detection", "attendance", "mongodb"],
        "timestamp": datetime.now().isoformat(),
        "version": "2.1"
    }), 200

# ===============================================
# AI Video Processing (FIXED VERSION)
# ===============================================

@app.route('/api/ai/process-video', methods=['POST', 'OPTIONS'])
def process_video_endpoint():
    """Process video for AI detection and store the report"""
    if request.method == 'OPTIONS':
        return '', 200
    
    print("\n" + "=" * 60)
    print("[REQUEST] AI Video Processing and Data Storage")
    print("=" * 60)
    
    # 1. Extract form data
    exam_type = request.form.get('examType')
    course_name = request.form.get('courseName')
    video_file = request.files.get('video')
    
    if not video_file:
        print("✗ No video file provided")
        return jsonify({"message": "No video file provided"}), 400
    if not exam_type or not course_name:
        print("✗ Missing exam type or course name")
        return jsonify({"message": "Exam Type and Course Name are required fields."}), 400

    file = video_file
    filename = secure_filename(file.filename)
    
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    size_mb = file_size / (1024 * 1024)
    
    print(f"📹 File: {filename} ({size_mb:.1f} MB)")
    print(f"📚 Exam: {exam_type} - {course_name}")
    
    if not filename or not allowed_file(filename):
        print("✗ Invalid file type")
        return jsonify({"message": "Invalid file type"}), 400

    input_path = None
    try:
        ext = filename.rsplit('.', 1)[1].lower()
        unique_id = uuid.uuid4().hex
        
        # Define input file path
        input_filename = f"{unique_id}_input.{ext}"
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        
        # Define a unique directory for all output files
        output_directory_name = f"{unique_id}_report" 
        output_dir = os.path.join(OUTPUT_FOLDER, output_directory_name)
        os.makedirs(output_dir, exist_ok=True)
        
        # The AI detector saves the video as cheating_detected.mp4
        final_video_name = "cheating_detected.mp4"
        
        file.save(input_path)
        print(f"✓ Saved: {input_filename}")
        print(f"🔄 Processing video with AI detection...")
        
        # 2. Run AI Processing (returns None, saves summary.json to disk)
        ai_detector.process_video(
            video_path=input_path,
            output_dir=output_dir,
        )
        
        print(f"✓ AI Processing Complete!")
        
        # 3. Read the summary from the saved JSON file
        summary_path = os.path.join(output_dir, "summary.json")
        summary = None
        total_violations = 0
        movement_incidents = 0
        phone_incidents = 0
        
        if os.path.exists(summary_path):
            try:
                with open(summary_path, 'r') as f:
                    summary = json.load(f)
                print(f"✓ Summary loaded from: {summary_path}")
                
                # Safely extract violation data
                if summary and isinstance(summary, dict):
                    cheating_results = summary.get('cheating_detection_results', {})
                    
                    if isinstance(cheating_results, dict):
                        movement_incidents = cheating_results.get('total_movement_incidents', 0)
                        phone_incidents = cheating_results.get('total_phone_incidents', 0)
                        total_violations = cheating_results.get('total_violations_reported', movement_incidents + phone_incidents)
                        
                        print(f"  ✓ Violations: {movement_incidents} (Movement), {phone_incidents} (Phone)")
                        print(f"  ✓ Total: {total_violations}")
                    else:
                        print("  ⚠️ Cheating results not in expected format")
                else:
                    print("  ⚠️ Summary is not a valid dictionary")
                    
            except json.JSONDecodeError as je:
                print(f"⚠️ JSON decode error: {je}")
            except Exception as fe:
                print(f"⚠️ File read error: {fe}")
        else:
            print(f"⚠️ Summary file not found at {summary_path}")
        
        # 4. Calculate video duration
        try:
            output_video_path = os.path.join(output_dir, final_video_name)
            
            if os.path.exists(output_video_path):
                cap = cv2.VideoCapture(output_video_path)
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                video_duration_seconds = frame_count / fps if fps > 0 else 0
                cap.release()
                print(f"  ✓ Video duration: {video_duration_seconds:.2f}s")
            else:
                print(f"  ⚠️ Output video not found, using default duration")
                video_duration_seconds = 0
        except Exception as ve:
            print(f"  ⚠️ Could not calculate duration: {ve}")
            video_duration_seconds = 0
        
        # 5. Calculate risk score
        def calculate_risk_score(violations, duration_seconds):
            if duration_seconds == 0:
                return 0
            violations_per_minute = (violations / duration_seconds) * 60
            return min(100, int(violations_per_minute * 10))
        
        risk_score = calculate_risk_score(total_violations, video_duration_seconds)
        
        # 6. Prepare output URL
        output_filename_for_db = f"{output_directory_name}/{final_video_name}"
        output_url = f"{request.host_url.rstrip('/')}/processed_videos/{output_filename_for_db}"
        
        # 7. Store Report in MongoDB
        report_data = {
            "examType": exam_type,
            "courseName": course_name,
        }
        
        report_id = mongo_manager.store_video_analysis_report(
            data=report_data, 
            summary=summary, 
            input_filename=input_filename,
            output_filename=output_filename_for_db, 
            output_url=output_url
        )
        
        print(f"✓ Report stored in DB: {report_id}")
        
        # 8. Return response
        response = make_response(jsonify({
            "message": "Video processed and report stored successfully",
            "reportId": report_id,
            "outputUrl": output_url,
            "filename": output_filename_for_db,
            "summary": summary,
            "violations": total_violations,
            "duration": video_duration_seconds,
            "riskScore": risk_score
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        # Try to save error report to MongoDB
        try:
            error_report = {
                "examType": exam_type,
                "courseName": course_name,
                "inputFilename": input_filename if 'input_filename' in locals() else "unknown",
                "outputFilename": None,
                "status": "error",
                "proctoringViolationsCount": 0,
                "totalDuration_s": 0,
                "riskScore": 0,
                "processingSummary": None,
                "errorMessage": str(e),
                "createdAt": datetime.utcnow()
            }
            
            if mongo_manager.db:
                result = mongo_manager.db['video_reports'].insert_one(error_report)
                print(f"⚠️ Error report saved to DB: {result.inserted_id}")
        except Exception as db_error:
            print(f"⚠️ Could not save error report: {db_error}")
        
        return jsonify({"message": f"Processing error: {str(e)}"}), 500
    
    finally:
        # Cleanup input file
        if input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
                print(f"✓ Cleaned up input file")
            except Exception as cleanup_error:
                print(f"⚠️ Cleanup failed: {cleanup_error}")

# ===============================================
# Video Serving Endpoints
# ===============================================

@app.route('/processed_videos/<path:filename>', methods=['GET'])
def serve_processed_video(filename):
    """Serve processed video files from nested directories"""
    try:
        print(f"📥 Request to serve video: {filename}")
        
        download = request.args.get('download', 'false').lower() == 'true'
        
        file_path = os.path.join(OUTPUT_FOLDER, filename)
        
        if not os.path.exists(file_path):
            print(f"✗ Video file not found at: {file_path}")
            return jsonify({"message": "Video file not found"}), 404
        
        print(f"✓ Serving video from: {file_path}")
        
        directory = os.path.dirname(file_path)
        file_name = os.path.basename(filename)
        
        response = send_from_directory(
            directory, 
            file_name,
            as_attachment=download,
            mimetype='video/mp4'
        )
        
        if download:
            response.headers['Content-Disposition'] = f'attachment; filename="{file_name}"'
            print(f"📥 Sending as download: {file_name}")
        else:
            print(f"📺 Streaming video: {file_name}")
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Range'
        
        return response
        
    except FileNotFoundError:
        print(f"✗ Video file not found: {filename}")
        return jsonify({"message": "Video file not found"}), 404
    except Exception as e:
        print(f"✗ Error serving video: {str(e)}")
        traceback.print_exc()
        return jsonify({"message": f"Error serving video: {str(e)}"}), 500

@app.route('/processed_videos/<path:filename>', methods=['OPTIONS'])
def serve_processed_video_options(filename):
    """Handle CORS preflight for video requests"""
    response = make_response('', 204)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Range, Content-Type'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Length'
    return response

@app.route('/api/ai/reports', methods=['GET'])
def get_ai_reports():
    """Retrieve all stored AI video analysis reports."""
    try:
        reports = mongo_manager.get_video_analysis_reports()
        return jsonify({
            "success": True,
            "data": reports
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# ===============================================
# Attendance Processing
# ===============================================

@app.route('/api/attendance/process-video', methods=['POST', 'OPTIONS'])
def process_attendance_video():
    """Process video for attendance marking with exam type and course name"""
    if request.method == 'OPTIONS':
        return '', 200
    
    print("\n" + "=" * 60)
    print("[REQUEST] Attendance Video Processing with Exam Details")
    print("=" * 60)
    
    exam_type = request.form.get('examType')
    course_name = request.form.get('courseName')
    
    if not exam_type or not exam_type.strip():
        print("✗ Exam type is required")
        return jsonify({"message": "Exam Type is required"}), 400
    
    if not course_name or not course_name.strip():
        print("✗ Course name is required")
        return jsonify({"message": "Course Name is required"}), 400
    
    if 'video' not in request.files:
        print("✗ No video file provided")
        return jsonify({"message": "No video file provided"}), 400
    
    file = request.files['video']
    filename = secure_filename(file.filename)
    
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    size_mb = file_size / (1024 * 1024)
    
    print(f"📹 File: {filename} ({size_mb:.1f} MB)")
    print(f"📚 Exam: {exam_type} - {course_name}")
    
    if not filename or not allowed_file(filename):
        print("✗ Invalid file type")
        return jsonify({"message": "Invalid file type"}), 400

    input_path = None
    try:
        attendance_system.attendance_marked = {}
        
        ext = filename.rsplit('.', 1)[1].lower()
        unique_id = uuid.uuid4().hex
        input_filename = f"{unique_id}_input.{ext}"
        
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        file.save(input_path)
        print(f"✓ Saved: {input_filename}")
        print(f"🔄 Processing attendance from video...")
        
        report = attendance_system.process_video_file(input_path)
        
        print(f"✓ Processing complete!")
        print(f"  Total Students: {report['total_students']}")
        print(f"  Present: {report['present_count']}")
        print(f"  Absent: {report['absent_count']}")

        present_students = report.get('present_students', []) 
        
        if present_students:
            print(f"⏳ Marking {len(present_students)} student(s) as 'present' in MongoDB...")
            mongo_manager.update_student_marks_to_present(
                present_students, 
                collection_name='attendances' 
            )
        else:
            print("No students were marked as present in the video.")
        
        print(f"⏳ Storing attendance report in exam_attendance collection...")
        
        attendance_report_id = mongo_manager.store_exam_attendance_report(
            exam_type=exam_type.strip(),
            course_name=course_name.strip(),
            present_students=present_students,
            absent_students=report.get('absent_students', []),
            total_students=report['total_students'],
            duration_seconds=report['duration_seconds'],
            total_frames=report['total_frames'],
            recognition_history=report.get('recognition_history', [])
        )
        
        print(f"✓ Attendance report stored with ID: {attendance_report_id}")
        
        report_filename = f"attendance_{unique_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_path = os.path.join(ATTENDANCE_FOLDER, report_filename)
        
        report_with_exam_details = {
            **report,
            "exam_type": exam_type.strip(),
            "course_name": course_name.strip(),
            "db_report_id": attendance_report_id
        }
        
        with open(report_path, 'w') as f:
            json.dump(report_with_exam_details, f, indent=2)
        print(f"✓ Report saved: {report_filename}")
        
        response_report = {
            **report,
            "exam_type": exam_type.strip(),
            "course_name": course_name.strip(),
            "db_report_id": attendance_report_id
        }
        
        response = make_response(jsonify({
            "message": "Attendance processed successfully",
            "reportId": attendance_report_id,
            "report": response_report
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        return jsonify({"message": f"Processing error: {str(e)}"}), 500
    
    finally:
        if input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
                print(f"✓ Cleaned up input file")
            except Exception as e:
                print(f"⚠ Cleanup failed: {e}")

@app.route('/api/attendance/student-reports', methods=['GET', 'OPTIONS'])
def get_student_attendance_reports():
    """Get attendance reports for a specific student"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        student_name = request.args.get('studentName')
        
        if not student_name or not student_name.strip():
            return jsonify({
                "success": False,
                "message": "Student name is required"
            }), 400
        
        if mongo_manager.db is None:
            return jsonify({
                "success": False,
                "message": "Database connection failed"
            }), 500
        
        collection = mongo_manager.db['exam_attendance']
        
        attendance_reports = list(collection.find({
            '$or': [
                {'present_students': student_name.strip()},
                {'absent_students': student_name.strip()}
            ]
        }).sort('createdAt', pymongo.DESCENDING))
        
        processed_reports = []
        for report in attendance_reports:
            report['_id'] = str(report['_id'])
            
            is_present = student_name.strip() in report.get('present_students', [])
            report['student_status'] = 'Present' if is_present else 'Absent'
            
            processed_reports.append(report)
        
        print(f"✓ Retrieved {len(processed_reports)} attendance reports for {student_name}")
        
        response = make_response(jsonify({
            "success": True,
            "data": processed_reports,
            "count": len(processed_reports)
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error retrieving attendance reports: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/attendance/reports', methods=['GET'])
def get_exam_attendance_reports():
    """Retrieve all stored exam attendance reports."""
    try:
        exam_type = request.args.get('examType')
        course_name = request.args.get('courseName')
        limit = request.args.get('limit', 50, type=int)
        
        reports = mongo_manager.get_exam_attendance_reports(
            exam_type=exam_type,
            course_name=course_name,
            limit=limit
        )
        
        return jsonify({
            "success": True,
            "data": reports,
            "count": len(reports)
        }), 200
    except Exception as e:
        print(f"✗ Error retrieving reports: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/attendance/reports/<report_id>', methods=['GET'])
def get_exam_attendance_report(report_id):
    """Retrieve a specific exam attendance report by ID."""
    try:
        report = mongo_manager.get_exam_attendance_by_id(report_id)
        
        if report:
            return jsonify({
                "success": True,
                "data": report
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": "Report not found"
            }), 404
    except Exception as e:
        print(f"✗ Error retrieving report: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    
# Add this import at the top of server.py (after other imports)
from notification_manager import NotificationManager

# Add this initialization after mongo_manager initialization in server.py
try:
    notification_manager = NotificationManager(db=mongo_manager.db)
    print("  ✅ Notification Manager initialized")
except Exception as e:
    print(f"  ✗ Notification Manager failed: {e}")
    sys.exit(1)

# ===============================================
# NOTIFICATION ENDPOINTS - Add these to server.py
# ===============================================

@app.route('/api/notifications/send', methods=['POST', 'OPTIONS'])
def send_cheating_notification():
    """Admin sends cheating notification to a student"""
    if request.method == 'OPTIONS':
        return '', 200
    
    print("\n" + "=" * 60)
    print("[REQUEST] Send Cheating Notification")
    print("=" * 60)
    
    try:
        data = request.json
        
        student_name = data.get('studentName')
        exam_type = data.get('examType')
        course_name = data.get('courseName')
        cheating_details = data.get('cheatingDetails')
        report_id = data.get('reportId')
        
        if not all([student_name, exam_type, course_name, cheating_details]):
            print("✗ Missing required fields")
            return jsonify({
                "success": False,
                "message": "Student name, exam type, course name, and cheating details are required"
            }), 400
        
        notification_id = notification_manager.create_cheating_notification(
            student_name=student_name,
            exam_type=exam_type,
            course_name=course_name,
            cheating_details=cheating_details,
            report_id=report_id
        )
        
        print(f"✅ Notification sent to {student_name}")
        
        response = make_response(jsonify({
            "success": True,
            "message": f"Notification sent to {student_name} successfully",
            "notificationId": notification_id
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 201
        
    except ValueError as e:
        print(f"✗ Validation error: {str(e)}")
        response = make_response(jsonify({
            "success": False,
            "message": str(e)
        }))
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 400
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error sending notification: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/notifications/student/<student_name>', methods=['GET', 'OPTIONS'])
def get_student_notifications(student_name):
    """Get all notifications for a specific student"""
    if request.method == 'OPTIONS':
        return '', 200
    
    print(f"\n[REQUEST] Get Notifications for: {student_name}")
    
    try:
        status = request.args.get('status')
        limit = request.args.get('limit', 50, type=int)
        
        notifications = notification_manager.get_student_notifications(
            student_name=student_name,
            status=status,
            limit=limit
        )
        
        response = make_response(jsonify({
            "success": True,
            "data": notifications,
            "count": len(notifications)
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error retrieving notifications: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/notifications/unread-count/<student_name>', methods=['GET', 'OPTIONS'])
def get_unread_count(student_name):
    """Get count of unread notifications for a student"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        count = notification_manager.get_unread_count(student_name)
        
        response = make_response(jsonify({
            "success": True,
            "count": count
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error getting unread count: {str(e)}",
            "count": 0
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/notifications/mark-read/<notification_id>', methods=['PUT', 'OPTIONS'])
def mark_notification_read(notification_id):
    """Mark a specific notification as read"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        success = notification_manager.mark_as_read(notification_id)
        
        if success:
            response = make_response(jsonify({
                "success": True,
                "message": "Notification marked as read"
            }))
        else:
            response = make_response(jsonify({
                "success": False,
                "message": "Notification not found"
            }))
            return response, 404
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error marking notification as read: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/notifications/mark-all-read/<student_name>', methods=['PUT', 'OPTIONS'])
def mark_all_notifications_read(student_name):
    """Mark all notifications as read for a student"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        count = notification_manager.mark_all_as_read(student_name)
        
        response = make_response(jsonify({
            "success": True,
            "message": f"Marked {count} notifications as read",
            "count": count
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error marking notifications as read: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500

@app.route('/api/notifications/<notification_id>', methods=['DELETE', 'OPTIONS'])
def delete_notification(notification_id):
    """Delete a specific notification"""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        success = notification_manager.delete_notification(notification_id)
        
        if success:
            response = make_response(jsonify({
                "success": True,
                "message": "Notification deleted successfully"
            }))
        else:
            response = make_response(jsonify({
                "success": False,
                "message": "Notification not found"
            }))
            return response, 404
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 200
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        traceback.print_exc()
        
        response = make_response(jsonify({
            "success": False,
            "message": f"Error deleting notification: {str(e)}"
        }))
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response, 500    

# ===============================================
# Start Server
# ===============================================

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0', threaded=True, use_reloader=False)