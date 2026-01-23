import { useState } from "react";
import { X, Send, AlertTriangle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: {
    _id: string;
    examType: string;
    courseName: string;
    proctoringViolationsCount: number;
  };
  studentName: string;
}

export default function SendNotificationModal({
  isOpen,
  onClose,
  reportData,
  studentName
}: SendNotificationModalProps) {
  const [cheatingDetails, setCheatingDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSendNotification = async () => {
    if (!cheatingDetails.trim()) {
      setError("Please provide cheating details");
      return;
    }

    setSending(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("http://localhost:5001/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName: studentName,
          examType: reportData.examType,
          courseName: reportData.courseName,
          cheatingDetails: cheatingDetails.trim(),
          reportId: reportData._id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setCheatingDetails("");
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        setError(data.message || "Failed to send notification");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Error sending notification:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            Send Cheating Alert
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-all duration-200"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Information */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Report Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-600">Student Name</p>
                <p className="font-semibold text-gray-900">{studentName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Exam Type</p>
                <p className="font-semibold text-gray-900">{reportData.examType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Course</p>
                <p className="font-semibold text-gray-900">{reportData.courseName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Violations Detected</p>
                <Badge className="bg-red-600 mt-1">
                  {reportData.proctoringViolationsCount} violations
                </Badge>
              </div>
            </div>
          </div>

          {/* Cheating Details Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Cheating Details *
            </label>
            <textarea
              value={cheatingDetails}
              onChange={(e) => setCheatingDetails(e.target.value)}
              placeholder="Describe the cheating incidents detected (e.g., 'Multiple unauthorized movements detected during exam. Phone usage observed at 00:15:30 timestamp.')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={5}
              disabled={sending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide detailed information about the cheating incidents
            </p>
          </div>

          {/* Success Alert */}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✅ Notification sent successfully to {studentName}!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                ❌ {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSendNotification}
              disabled={sending || !cheatingDetails.trim()}
              className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
            >
              {sending ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={sending}
              className="px-6"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}