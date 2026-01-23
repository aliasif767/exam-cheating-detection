import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Notification {
  _id: string;
  studentName: string;
  examType: string;
  courseName: string;
  cheatingDetails: string;
  reportId?: string;
  status: "read" | "unread";
  createdAt: string;
  readAt?: string;
  type: string;
}

interface StudentNotificationsProps {
  studentName: string;
  onUnreadCountChange?: (count: number) => void;
}

export default function StudentNotifications({
  studentName,
  onUnreadCountChange
}: StudentNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [studentName]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/notifications/student/${encodeURIComponent(studentName)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
        
        // Update unread count
        const unreadCount = (data.data || []).filter(
          (n: Notification) => n.status === "unread"
        ).length;
        
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/notifications/mark-read/${notificationId}`,
        { method: "PUT" }
      );
      
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/notifications/mark-all-read/${encodeURIComponent(studentName)}`,
        { method: "PUT" }
      );
      
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5001/api/notifications/${notificationId}`,
        { method: "DELETE" }
      );
      
      if (response.ok) {
        fetchNotifications();
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    if (notification.status === "unread") {
      handleMarkAsRead(notification._id);
    }
  };

  const unreadCount = notifications.filter(n => n.status === "unread").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          Notifications ({notifications.length})
        </h3>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            No notifications. Keep up the good work! 🎉
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`border-2 rounded-xl p-4 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                notification.status === "unread"
                  ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-300"
                  : "bg-white border-gray-200"
              }`}
              onClick={() => handleViewDetails(notification)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    notification.status === "unread" ? "bg-red-500" : "bg-gray-400"
                  }`}>
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">Cheating Alert</h4>
                      {notification.status === "unread" && (
                        <Badge className="bg-red-600 text-xs">New</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold">{notification.examType}</span>
                      {" - "}
                      <span className="text-gray-600">{notification.courseName}</span>
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(notification);
                  }}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                Cheating Alert Details
              </h2>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-2 hover:bg-white rounded-lg transition-all duration-200"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Important Notice */}
              <Alert className="bg-red-50 border-red-300">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <AlertDescription className="text-red-900 font-medium">
                  This is a formal notice regarding cheating activity detected during your exam.
                </AlertDescription>
              </Alert>

              {/* Exam Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Exam Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Student Name</p>
                    <p className="font-semibold text-gray-900">{selectedNotification.studentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Exam Type</p>
                    <p className="font-semibold text-gray-900">{selectedNotification.examType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Course</p>
                    <p className="font-semibold text-gray-900">{selectedNotification.courseName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedNotification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cheating Details */}
              <div className="bg-white border-2 border-red-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Violation Details
                </h3>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {selectedNotification.cheatingDetails}
                </p>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-700 mb-2">📋 Next Steps</h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Contact your instructor or exam coordinator immediately</li>
                  <li>Prepare to provide an explanation for the detected violations</li>
                  <li>Review the exam conduct policies</li>
                  <li>This may affect your exam results pending investigation</li>
                </ul>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <Button
                onClick={() => handleDelete(selectedNotification._id)}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={() => setSelectedNotification(null)}
                className="flex-1 bg-gray-900 hover:bg-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}