import pymongo
from PIL import Image
from io import BytesIO
import numpy as np
import base64
import sys
from bson import ObjectId
import uuid 
from datetime import datetime, date

from datetime import datetime, date
import uuid

class ExamSchema:
    """Schema definition for exam documents"""
    
    @staticmethod
    def create_exam_document(exam_data):
        current_time = datetime.utcnow()
        
        if not exam_data.get('title'):
            raise ValueError("Exam title is required")
        if not exam_data.get('course'):
            raise ValueError("Course name is required")
            
        exam_code = exam_data.get('examCode') 
        if not exam_code:
            exam_code = str(uuid.uuid4().hex)[:8].upper() 

        # --- Date Handling to ensure date-only logic ---
        exam_date_input = exam_data.get('date')
        exam_date_only = None
        
        if exam_date_input:
            if isinstance(exam_date_input, datetime):
                # If datetime, extract the date part
                exam_date_only = exam_date_input.date() 
            elif isinstance(exam_date_input, str):
                # If string, parse it and then get the date part
                try:
                    # Assuming ISO format or similar for robust parsing
                    dt_obj = datetime.fromisoformat(exam_date_input.replace('Z', '+00:00')) 
                    exam_date_only = dt_obj.date()
                except ValueError:
                    raise ValueError(f"Invalid date format for: {exam_date_input}")
            elif isinstance(exam_date_input, date):
                # If already a date object, use it directly
                exam_date_only = exam_date_input
        
        # --- FIX: Convert datetime.date object to datetime.datetime at midnight (00:00:00) ---
        # This solves the database encoding error while maintaining the date-only value.
        final_exam_date_for_db = None
        if exam_date_only:
            # Combine the date object with the minimum time (midnight)
            final_exam_date_for_db = datetime.combine(exam_date_only, datetime.min.time())

        # --- End Date Handling ---

        return {
            "title": exam_data.get('title', '').strip(),
            "course": exam_data.get('course', '').strip(),
            "duration": int(exam_data.get('duration', 60)),
            "date": final_exam_date_for_db, # Now storing a datetime object (at midnight)
            "status": exam_data.get('status', 'draft'),
            "students": int(exam_data.get('students', 0)),
            "questions": int(exam_data.get('questions', 0)),
            "totalMarks": int(exam_data.get('totalMarks', 100)),
            "passingMarks": int(exam_data.get('passingMarks', 40)),
            "createdBy": exam_data.get('createdBy', 'asifali515'),
            "createdAt": current_time,
            "updatedAt": current_time,
            "lastModifiedBy": exam_data.get('createdBy', 'asifali515'),
            "examCode": exam_code, 
        }
# ===============================================
# SCHEMA FOR VIDEO ANALYSIS REPORTS
# ===============================================

class VideoAnalysisSchema:
    """Schema definition for storing AI video processing reports."""
    
    @staticmethod
    def create_report_document(data, summary, input_filename, output_filename, output_url):
        current_time = datetime.utcnow()
        
        return {
            "examType": data.get('examType', 'N/A').strip(),
            "courseName": data.get('courseName', 'N/A').strip(),
            "inputFilename": input_filename,
            "outputFilename": output_filename,
            "outputUrl": output_url,
            "processingSummary": summary,
            "createdAt": current_time,
            "updatedAt": current_time,
            "status": "Completed",
            "proctoringViolationsCount": summary.get('violations_logged', 0),
            "totalDuration_s": summary.get('total_duration_s', 0.0),
        }

# ===============================================
# NEW SCHEMA FOR EXAM ATTENDANCE
# ===============================================

class ExamAttendanceSchema:
    """Schema definition for storing exam attendance records."""
    
    @staticmethod
    def create_attendance_document(exam_type, course_name, present_students, absent_students, 
                                   total_students, duration_seconds, total_frames, recognition_history):
        current_time = datetime.utcnow()
        
        if not exam_type or not exam_type.strip():
            raise ValueError("Exam type is required")
        if not course_name or not course_name.strip():
            raise ValueError("Course name is required")
        if not isinstance(present_students, (list, set)):
            raise ValueError("Present students must be a list")
        if not isinstance(absent_students, (list, set)):
            raise ValueError("Absent students must be a list")
            
        return {
            "student_name": None,  # Not applicable for exam attendance - we store lists
            "exam_type": exam_type.strip(),
            "course_name": course_name.strip(),
            "present_students": list(present_students),
            "absent_students": list(absent_students),
            "total_students": total_students,
            "present_count": len(present_students),
            "absent_count": len(absent_students),
            "duration_seconds": float(duration_seconds),
            "total_frames": int(total_frames),
            "recognition_history": recognition_history,
            "createdAt": current_time,
            "updatedAt": current_time,
            "status": "Completed",
            "attendance_date": current_time.strftime("%Y-%m-%d"),
            "attendance_time": current_time.strftime("%H:%M:%S"),
        }

# ===============================================
# MONGODB MANAGER
# ===============================================

class MongoDBManager:
    """
    Manages connections and operations for MongoDB,
    handling exam management, attendance tracking, and video analysis reports.
    """
    def __init__(self, mongo_uri, db_name):
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.client = None
        self.db = None
        
        try:
            self.client = pymongo.MongoClient(self.mongo_uri, serverSelectionTimeoutMS=5000)
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            print(f"✓ MongoDB connection successful to database: {self.db_name}")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            sys.exit(1)

    # ===============================================
    # Exam Management Methods
    # ===============================================
    
    def create_exam(self, exam_data):
        """Create a new exam in MongoDB"""
        try:
            exam_doc = ExamSchema.create_exam_document(exam_data)
            result = self.db.exams.insert_one(exam_doc)
            print(f"✓ Exam created with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            print(f"❌ Error creating exam: {e}")
            raise

    def get_exams(self, status=None):
        """Get all exams or filter by status"""
        try:
            query = {'status': status} if status else {}
            exams = list(self.db.exams.find(query).sort('createdAt', -1))
            for exam in exams:
                exam['_id'] = str(exam['_id'])
            print(f"✓ Retrieved {len(exams)} exams from database")
            return exams
        except Exception as e:
            print(f"❌ Error retrieving exams: {e}")
            raise

    def get_exam_by_id(self, exam_id):
        """Get a specific exam by ID"""
        try:
            exam = self.db.exams.find_one({'_id': ObjectId(exam_id)})
            if exam:
                exam['_id'] = str(exam['_id'])
            return exam
        except Exception as e:
            print(f"❌ Error retrieving exam: {e}")
            raise

    def update_exam(self, exam_id, exam_data):
        """Update an existing exam"""
        try:
            exam_data['updatedAt'] = datetime.utcnow()
            exam_data['lastModifiedBy'] = 'asifali515'
            
            if '_id' in exam_data:
                del exam_data['_id']
            if 'id' in exam_data:
                del exam_data['id']
            
            result = self.db.exams.update_one(
                {'_id': ObjectId(exam_id)},
                {'$set': exam_data}
            )
            print(f"✓ Exam updated: {result.modified_count} document(s) modified")
            return result.modified_count > 0
        except Exception as e:
            print(f"❌ Error updating exam: {e}")
            raise

    def delete_exam(self, exam_id):
        """Delete an exam"""
        try:
            result = self.db.exams.delete_one({'_id': ObjectId(exam_id)})
            print(f"✓ Exam deleted: {result.deleted_count} document(s) deleted")
            return result.deleted_count > 0
        except Exception as e:
            print(f"❌ Error deleting exam: {e}")
            raise
    
    # ===============================================
    # NEW: Get Today's Exams Method
    # ===============================================
    
    def get_todays_exams(self):
        """Get all exams scheduled for today"""
        try:
            # Get today's date at midnight
            today_start = datetime.combine(date.today(), datetime.min.time())
            today_end = datetime.combine(date.today(), datetime.max.time())
            
            # Query exams where date falls within today
            query = {
                'date': {
                    '$gte': today_start,
                    '$lte': today_end
                }
            }
            
            exams = list(self.db.exams.find(query).sort('createdAt', -1))
            for exam in exams:
                exam['_id'] = str(exam['_id'])
            
            print(f"✓ Retrieved {len(exams)} exams for today")
            return exams
        except Exception as e:
            print(f"❌ Error retrieving today's exams: {e}")
            raise
    
    # ===============================================
    # Video Analysis Report Methods
    # ===============================================
    
    def store_video_analysis_report(self, data, summary, input_filename, output_filename, output_url):
        """Store the complete AI video analysis report in MongoDB."""
        try:
            report_doc = VideoAnalysisSchema.create_report_document(
                data, summary, input_filename, output_filename, output_url
            )
            result = self.db.video_reports.insert_one(report_doc)
            print(f"✓ Video Analysis Report stored with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            print(f"❌ Error storing video analysis report: {e}")
            raise

    def get_video_analysis_reports(self, limit=50):
        """Retrieve the latest video analysis reports."""
        try:
            reports = list(
                self.db.video_reports
                .find({})
                .sort('createdAt', pymongo.DESCENDING)
                .limit(limit)
            )
            for report in reports:
                report['_id'] = str(report['_id'])
            print(f"✓ Retrieved {len(reports)} video analysis reports.")
            return reports
        except Exception as e:
            print(f"❌ Error retrieving video analysis reports: {e}")
            raise

    # ===============================================
    # NEW: Exam Attendance Methods
    # ===============================================
    
    def store_exam_attendance_report(self, exam_type, course_name, present_students, absent_students,
                                     total_students, duration_seconds, total_frames, recognition_history):
        """Store exam attendance record in exam_attendance collection."""
        try:
            attendance_doc = ExamAttendanceSchema.create_attendance_document(
                exam_type=exam_type,
                course_name=course_name,
                present_students=present_students,
                absent_students=absent_students,
                total_students=total_students,
                duration_seconds=duration_seconds,
                total_frames=total_frames,
                recognition_history=recognition_history
            )
            result = self.db.exam_attendance.insert_one(attendance_doc)
            print(f"✓ Exam Attendance Report stored with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            print(f"❌ Error storing exam attendance report: {e}")
            raise

    def get_exam_attendance_reports(self, exam_type=None, course_name=None, limit=50):
        """Retrieve exam attendance reports with optional filtering."""
        try:
            query = {}
            if exam_type:
                query['exam_type'] = exam_type
            if course_name:
                query['course_name'] = course_name
            
            reports = list(
                self.db.exam_attendance
                .find(query)
                .sort('createdAt', pymongo.DESCENDING)
                .limit(limit)
            )
            for report in reports:
                report['_id'] = str(report['_id'])
            print(f"✓ Retrieved {len(reports)} exam attendance reports.")
            return reports
        except Exception as e:
            print(f"❌ Error retrieving exam attendance reports: {e}")
            raise

    def get_exam_attendance_by_id(self, report_id):
        """Retrieve a specific exam attendance report by ID."""
        try:
            report = self.db.exam_attendance.find_one({'_id': ObjectId(report_id)})
            if report:
                report['_id'] = str(report['_id'])
            return report
        except Exception as e:
            print(f"❌ Error retrieving exam attendance report: {e}")
            raise

    # ===============================================
    # Attendance Methods (Existing)
    # ===============================================
    
    def get_total_students_count(self):
        """Get total count of unique students from attendance collection"""
        try:
            collection = self.db['attendances']
            # Count distinct students with face templates
            unique_students = collection.distinct("studentName", {
                "type": "FaceTemplate",
                "studentPic": {"$exists": True, "$ne": None}
            })
            count = len(unique_students)
            print(f"✓ Retrieved total students count: {count}")
            return count
        except Exception as e:
            print(f"❌ Error getting students count: {e}")
            return 0
    
    def update_student_marks_to_present(self, student_names, collection_name='attendances'):
        """Updates the 'mark' field to 'present' for specified students"""
        if self.db is None:
            print("❌ DB Update failed: Database not initialized.")
            return

        if not student_names:
            print("No students provided to mark as present.")
            return

        try:
            collection = self.db[collection_name]
            update_result = collection.update_many(
                {"studentName": {"$in": list(student_names)}},
                {"$set": {"mark": "present"}}
            )
            print(f"✓ DB Update: Matched {update_result.matched_count} documents. Modified {update_result.modified_count} marks to 'present'.")
        except Exception as e:
            print(f"❌ Error updating student marks: {e}")

    def get_all_student_data(self, collection_name='attendances'):
        """Retrieves all student data for attendance"""
        student_data = {}
        all_students = set()
        
        try:
            collection = self.db[collection_name]
            students_with_pics = collection.find({
                "studentPic": {"$ne": None},
            }).distinct("studentName")
            
            if not students_with_pics:
                print("❌ No student data with images found in MongoDB.")
                return student_data, all_students
            
            print(f"🔄 Found {len(students_with_pics)} unique students with images in MongoDB.")

            for student_name in students_with_pics:
                latest_entry = collection.find_one(
                    {"studentName": student_name, "studentPic": {"$ne": None}},
                    sort=[('createdAt', pymongo.DESCENDING)]
                )
                
                if latest_entry and latest_entry.get('studentPic'):
                    try:
                        base64_img = latest_entry['studentPic']
                        if ',' in base64_img:
                            base64_img = base64_img.split(',')[-1]
                        img_bytes = base64.b64decode(base64_img)
                        img = Image.open(BytesIO(img_bytes)).convert('RGB')
                        img_np = np.array(img)
                        student_data[student_name] = [img_np]
                        all_students.add(student_name)
                    except Exception as e:
                        print(f"Warning: Could not decode/process image for {student_name}. Error: {e}")

            print(f"✓ Successfully processed data for {len(student_data)} students.")
            return student_data, all_students
            
        except AttributeError:
            print("❌ MongoDB client or database not initialized.")
            return student_data, all_students