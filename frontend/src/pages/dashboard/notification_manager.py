from datetime import datetime
from bson import ObjectId
import pymongo

class NotificationSchema:
    """Schema definition for student notifications"""
    
    @staticmethod
    def create_notification_document(student_name, exam_type, course_name, cheating_details, report_id=None):
        current_time = datetime.utcnow()
        
        if not student_name or not student_name.strip():
            raise ValueError("Student name is required")
        if not exam_type or not exam_type.strip():
            raise ValueError("Exam type is required")
        if not course_name or not course_name.strip():
            raise ValueError("Course name is required")
        if not cheating_details or not cheating_details.strip():
            raise ValueError("Cheating details are required")
            
        return {
            "studentName": student_name.strip(),
            "examType": exam_type.strip(),
            "courseName": course_name.strip(),
            "cheatingDetails": cheating_details.strip(),
            "reportId": report_id,
            "status": "unread",
            "createdAt": current_time,
            "readAt": None,
            "type": "cheating_alert"
        }

class NotificationManager:
    """
    Manages student notifications for cheating alerts
    """
    def __init__(self, db):
        self.db = db
        self.collection = db['notifications']
        
    def create_cheating_notification(self, student_name, exam_type, course_name, 
                                    cheating_details, report_id=None):
        """Create a new cheating notification for a student"""
        try:
            notification_doc = NotificationSchema.create_notification_document(
                student_name=student_name,
                exam_type=exam_type,
                course_name=course_name,
                cheating_details=cheating_details,
                report_id=report_id
            )
            
            result = self.collection.insert_one(notification_doc)
            print(f"✅ Notification created for {student_name} with ID: {result.inserted_id}")
            return str(result.inserted_id)
        except Exception as e:
            print(f"❌ Error creating notification: {e}")
            raise
    
    def get_student_notifications(self, student_name, status=None, limit=50):
        """Retrieve notifications for a specific student"""
        try:
            query = {"studentName": student_name.strip()}
            if status:
                query["status"] = status
            
            notifications = list(
                self.collection
                .find(query)
                .sort('createdAt', pymongo.DESCENDING)
                .limit(limit)
            )
            
            for notification in notifications:
                notification['_id'] = str(notification['_id'])
            
            print(f"✅ Retrieved {len(notifications)} notifications for {student_name}")
            return notifications
        except Exception as e:
            print(f"❌ Error retrieving notifications: {e}")
            raise
    
    def get_unread_count(self, student_name):
        """Get count of unread notifications for a student"""
        try:
            count = self.collection.count_documents({
                "studentName": student_name.strip(),
                "status": "unread"
            })
            return count
        except Exception as e:
            print(f"❌ Error getting unread count: {e}")
            return 0
    
    def mark_as_read(self, notification_id):
        """Mark a notification as read"""
        try:
            result = self.collection.update_one(
                {'_id': ObjectId(notification_id)},
                {
                    '$set': {
                        'status': 'read',
                        'readAt': datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                print(f"✅ Notification {notification_id} marked as read")
                return True
            return False
        except Exception as e:
            print(f"❌ Error marking notification as read: {e}")
            raise
    
    def mark_all_as_read(self, student_name):
        """Mark all notifications as read for a student"""
        try:
            result = self.collection.update_many(
                {
                    "studentName": student_name.strip(),
                    "status": "unread"
                },
                {
                    '$set': {
                        'status': 'read',
                        'readAt': datetime.utcnow()
                    }
                }
            )
            
            print(f"✅ Marked {result.modified_count} notifications as read for {student_name}")
            return result.modified_count
        except Exception as e:
            print(f"❌ Error marking all notifications as read: {e}")
            raise
    
    def delete_notification(self, notification_id):
        """Delete a specific notification"""
        try:
            result = self.collection.delete_one({'_id': ObjectId(notification_id)})
            
            if result.deleted_count > 0:
                print(f"✅ Notification {notification_id} deleted")
                return True
            return False
        except Exception as e:
            print(f"❌ Error deleting notification: {e}")
            raise