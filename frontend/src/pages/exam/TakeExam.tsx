import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera,
  Clock,
  AlertTriangle,
  Eye,
  Shield,
  Monitor,
  Send,
  Square,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface ExamSession {
  sessionId: string;
  exam: {
    title: string;
    subject: string;
    duration: number;
    endTime: string;
  };
  status: string;
  violations: any[];
  warningCount: number;
}

export default function TakeExam() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { sendFaceVerification, reportViolation } = useSocket();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [faceVerified, setFaceVerified] = useState(false);
  const [lastVerification, setLastVerification] = useState<Date | null>(null);
  const [warningCount, setWarningCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const endTime = new Date(session.exam.endTime).getTime();
        const remaining = Math.max(0, endTime - now);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          endExam();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session]);

  // Face verification interval
  useEffect(() => {
    if (isMonitoring && session) {
      const verificationInterval = setInterval(() => {
        performFaceVerification();
      }, 30000); // Every 30 seconds

      return () => clearInterval(verificationInterval);
    }
  }, [isMonitoring, session]);

  // Tab switching detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && session) {
        reportViolation({
          sessionId: session.sessionId,
          type: "tab_switch",
          severity: "medium",
          description: "Student switched browser tab during exam",
        });
        setWarningCount((prev) => prev + 1);
        toast.warning("Tab switching detected!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session]);

  const fetchSessionData = async () => {
    try {
      // Mock session data - in real app, fetch from API
      const mockSession: ExamSession = {
        sessionId: sessionId!,
        exam: {
          title: "Mathematics Final Exam",
          subject: "Advanced Calculus",
          duration: 120,
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        },
        status: "active",
        violations: [],
        warningCount: 0,
      };

      setSession(mockSession);
    } catch (error) {
      console.error("Failed to fetch session data:", error);
      toast.error("Failed to load exam session");
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsMonitoring(true);
      }
    } catch (error) {
      console.error("Failed to start monitoring:", error);
      toast.error("Camera access required for exam monitoring");
    }
  };

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsMonitoring(false);
  };

  const performFaceVerification = () => {
    if (videoRef.current && canvasRef.current && session) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        sendFaceVerification(session.sessionId, imageData);
        setLastVerification(new Date());
      }
    }
  };

  const endExam = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/verification/session/end",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        },
      );

      if (response.ok) {
        toast.success("Exam submitted successfully!");
        stopMonitoring();
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Failed to end exam:", error);
      toast.error("Failed to submit exam");
    }
  };

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getTimeProgress = () => {
    if (!session) return 0;
    const totalDuration = session.exam.duration * 60 * 1000; // Convert to milliseconds
    const elapsed = totalDuration - timeRemaining;
    return Math.min(100, (elapsed / totalDuration) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-4">
            The exam session could not be loaded.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-lg font-bold">{session.exam.title}</h1>
              <p className="text-sm text-gray-400">{session.exam.subject}</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Time Remaining */}
            <div className="text-center">
              <div
                className={`text-2xl font-mono font-bold ${
                  timeRemaining < 600000 ? "text-red-400" : "text-green-400"
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
              <p className="text-xs text-gray-400">Time Remaining</p>
            </div>

            {/* Monitoring Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isMonitoring ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-sm">
                {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
              </span>
            </div>

            {/* End Exam Button */}
            <Button
              onClick={endExam}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Square className="w-4 h-4 mr-2" />
              End Exam
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <Progress value={getTimeProgress()} className="h-2" />
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <Card className="h-full bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Exam Questions</CardTitle>
            </CardHeader>
            <CardContent className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <BookOpen className="w-24 h-24 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Exam Interface</h3>
                <p>
                  This is where the actual exam questions and interface would be
                  displayed.
                </p>
                <p className="text-sm mt-2">
                  The exam content is loaded dynamically based on the exam
                  configuration.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monitoring Panel */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 space-y-4">
          {/* Camera Feed */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Live Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-gray-600"
                  style={{ aspectRatio: "4/3" }}
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute top-2 right-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isMonitoring ? "bg-red-500" : "bg-gray-500"
                    }`}
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Face Detection:</span>
                  <span
                    className={faceVerified ? "text-green-400" : "text-red-400"}
                  >
                    {faceVerified ? "Verified" : "Checking..."}
                  </span>
                </div>
                {lastVerification && (
                  <div className="flex justify-between mt-1">
                    <span>Last Check:</span>
                    <span>{lastVerification.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Status */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Session Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <Badge
                  variant={
                    session.status === "active" ? "default" : "secondary"
                  }
                >
                  {session.status}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Violations:</span>
                <span
                  className={
                    warningCount === 0
                      ? "text-green-400"
                      : warningCount < 3
                        ? "text-yellow-400"
                        : "text-red-400"
                  }
                >
                  {warningCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Student ID:</span>
                <span className="text-white">{user?.studentId}</span>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {warningCount > 0 && (
            <Alert className="bg-red-900 border-red-700">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-100">
                <strong>Warning:</strong> {warningCount} violation(s) detected.
                {warningCount >= 3 &&
                  " Further violations may result in exam termination."}
              </AlertDescription>
            </Alert>
          )}

          {/* System Requirements Check */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Eye className="w-4 h-4" />
                System Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Camera:</span>
                <span
                  className={isMonitoring ? "text-green-400" : "text-red-400"}
                >
                  {isMonitoring ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Internet:</span>
                <span className="text-green-400">Connected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Browser:</span>
                <span className="text-green-400">Compatible</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button
              onClick={performFaceVerification}
              size="sm"
              variant="outline"
              className="w-full text-xs"
            >
              <Camera className="w-3 h-3 mr-1" />
              Manual Verification
            </Button>
            <Button
              onClick={endExam}
              size="sm"
              variant="destructive"
              className="w-full text-xs"
            >
              <Send className="w-3 h-3 mr-1" />
              Submit Exam
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
