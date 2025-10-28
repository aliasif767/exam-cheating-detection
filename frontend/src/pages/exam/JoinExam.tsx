import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Shield,
  Clock,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Eye,
  Users,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface ExamInfo {
  _id: string;
  title: string;
  subject: string;
  course: string;
  examCode: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  instructions: string;
  examSettings: {
    faceVerificationRequired: boolean;
    continuousMonitoring: boolean;
    tabSwitchLimit: number;
    strictMode: boolean;
  };
}

export default function JoinExam() {
  const { examCode: urlExamCode } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { joinExamSession } = useSocket();
  const [examCode, setExamCode] = useState(urlExamCode || "");
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (urlExamCode) {
      setExamCode(urlExamCode);
    }
  }, [urlExamCode]);

  const validateExamCode = async () => {
    if (!examCode.trim()) {
      toast.error("Please enter an exam code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/exam`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const exam = data.data.exams.find(
          (e: any) => e.examCode.toUpperCase() === examCode.toUpperCase(),
        );

        if (exam) {
          setExamInfo(exam);
        } else {
          toast.error("Invalid exam code. Please check and try again.");
        }
      }
    } catch (error) {
      console.error("Error validating exam code:", error);
      toast.error("Failed to validate exam code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const joinExam = async () => {
    if (!examInfo) return;

    // Check verification status
    if (
      examInfo.examSettings.faceVerificationRequired &&
      user?.verificationStatus !== "verified"
    ) {
      toast.error("Face verification required to join this exam");
      navigate("/verification");
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/exam/student/join/${examCode}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        const { exam, session } = data.data;

        // Join socket room for real-time monitoring
        joinExamSession(session.sessionId, exam._id);

        toast.success("Successfully joined exam session!");
        navigate(`/take-exam/${session.sessionId}`);
      } else {
        toast.error(data.message || "Failed to join exam");
      }
    } catch (error) {
      console.error("Error joining exam:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const canJoinExam = () => {
    if (!examInfo) return false;
    if (examInfo.status !== "ongoing") return false;
    if (
      examInfo.examSettings.faceVerificationRequired &&
      user?.verificationStatus !== "verified"
    )
      return false;
    return true;
  };

  const getTimeRemaining = () => {
    if (!examInfo) return null;
    const now = new Date();
    const endTime = new Date(examInfo.endTime);
    const remaining = endTime.getTime() - now.getTime();

    if (remaining <= 0) return "Exam ended";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <DashboardLayout title="Join Exam">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Join Exam Session</h2>
              <p className="text-green-100 mt-1">
                Enter your exam code to access your assigned exam
              </p>
            </div>
            <Shield className="w-12 h-12 text-green-200" />
          </div>
        </div>

        {/* Verification Status Check */}
        {user?.verificationStatus !== "verified" && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="flex items-center justify-between">
                <span>
                  Face verification required for exam participation. Status:{" "}
                  <strong>{user?.verificationStatus || "Not started"}</strong>
                </span>
                <Button size="sm" asChild className="ml-4">
                  <a href="/verification">Complete Verification</a>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exam Code Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Enter Exam Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="examCode">Exam Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="examCode"
                    placeholder="Enter exam code (e.g., EXAM123456)"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button
                    onClick={validateExamCode}
                    disabled={loading || !examCode.trim()}
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  Your exam code should be provided by your instructor. It's
                  usually in the format EXAM followed by numbers and letters.
                </p>
              </div>

              {examInfo && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Exam found! Review the details below and click "Join Exam"
                    when ready.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Instructions and Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Exam Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      user?.verificationStatus === "verified"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {user?.verificationStatus === "verified" ? "✓" : "✗"}
                  </div>
                  <div>
                    <p className="font-medium">Face Verification</p>
                    <p className="text-sm text-gray-600">
                      Required for identity confirmation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Stable Internet Connection</p>
                    <p className="text-sm text-gray-600">
                      Ensure reliable connection throughout the exam
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Camera & Microphone Access</p>
                    <p className="text-sm text-gray-600">
                      Browser permissions for monitoring
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium">Quiet Environment</p>
                    <p className="text-sm text-gray-600">
                      Private space free from distractions
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Once you join the exam, you'll be
                  continuously monitored by AI. Any suspicious activity will be
                  flagged and may result in exam termination.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Exam Information */}
        {examInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{examInfo.title}</h3>
                    <p className="text-gray-600">
                      {examInfo.course} • {examInfo.subject}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-medium">{examInfo.duration} minutes</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <Badge
                        variant={
                          examInfo.status === "ongoing"
                            ? "destructive"
                            : examInfo.status === "completed"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {examInfo.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-500">Start Time</p>
                      <p className="font-medium">
                        {new Date(examInfo.startTime).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">End Time</p>
                      <p className="font-medium">
                        {new Date(examInfo.endTime).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {examInfo.status === "ongoing" && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-red-800">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {getTimeRemaining()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Exam Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Face Verification Required</span>
                        <Badge
                          variant={
                            examInfo.examSettings.faceVerificationRequired
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {examInfo.examSettings.faceVerificationRequired
                            ? "Yes"
                            : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Continuous Monitoring</span>
                        <Badge
                          variant={
                            examInfo.examSettings.continuousMonitoring
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {examInfo.examSettings.continuousMonitoring
                            ? "Yes"
                            : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tab Switch Limit</span>
                        <Badge variant="secondary">
                          {examInfo.examSettings.tabSwitchLimit}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Strict Mode</span>
                        <Badge
                          variant={
                            examInfo.examSettings.strictMode
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {examInfo.examSettings.strictMode ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {examInfo.instructions && (
                    <div>
                      <h4 className="font-medium mb-2">Instructions</h4>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {examInfo.instructions}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <Button
                  onClick={joinExam}
                  disabled={!canJoinExam() || joining}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {joining ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Users className="w-5 h-5 mr-2" />
                  )}
                  Join Exam
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setExamInfo(null)}
                  size="lg"
                >
                  Cancel
                </Button>
              </div>

              {!canJoinExam() && examInfo.status !== "ongoing" && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This exam is not currently active. Please check the start
                    time or contact your instructor.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Exams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              Quick Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-medium">My Exams</h3>
                <p className="text-sm text-gray-600 mb-3">
                  View all your scheduled exams
                </p>
                <Button size="sm" variant="outline" asChild>
                  <a href="/dashboard">View Dashboard</a>
                </Button>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium">Verification</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Check your verification status
                </p>
                <Button size="sm" variant="outline" asChild>
                  <a href="/verification">Verify Now</a>
                </Button>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-medium">Support</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Need help with exam access?
                </p>
                <Button size="sm" variant="outline" asChild>
                  <a href="/profile">Contact Support</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
