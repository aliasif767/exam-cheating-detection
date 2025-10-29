import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Users,
  AlertTriangle,
  Eye,
  BookOpen,
  Play,
  Loader,
  RotateCcw,
  CheckCircle,
  XCircle,
  UploadCloud,
  X,
  Calendar,
  Clock,
  GraduationCap,
  FileText,
  Target,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ExamData {
  _id: string;
  title: string;
  course: string;
  duration: number;
  date: string;
  status: string;
  students: number;
  questions: number;
  totalMarks: number;
  passingMarks: number;
  examCode: string;
}

interface CurrentSessionInfo {
  examType: string;
  courseName: string;
  timestamp: string;
}

interface AttendanceReport {
  exam_type: string;
  course_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  present_students: string[];
  absent_students: string[];
  duration_seconds: number;
  total_frames: number;
  recognition_history: any[];
}

interface AiReportData {
  examType: string;
  courseName: string;
  summary: any;
}

export default function InvigilatorDashboard() {
  const { user, token } = useAuth();
  const { connected, liveData, violations } = useSocket();

  // Stats & Sessions
  const [activeSessions, setActiveSessions] = useState(0);
  const [examsToday, setExamsToday] = useState(0);
  const [currentSessionInfo, setCurrentSessionInfo] = useState<CurrentSessionInfo | null>(null);

  // AI Detection form
  const [aiExamType, setAiExamType] = useState("");
  const [aiCourseName, setAiCourseName] = useState("");
  const [aiVideoFile, setAiVideoFile] = useState<File | null>(null);
  const [aiFormValid, setAiFormValid] = useState(false);

  // Attendance form
  const [attendanceExamType, setAttendanceExamType] = useState("");
  const [attendanceCourseName, setAttendanceCourseName] = useState("");
  const [attendanceVideoFile, setAttendanceVideoFile] = useState<File | null>(null);
  const [attendanceFormValid, setAttendanceFormValid] = useState(false);

  // Video display (Keeping state, but not using it to display for AI report)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Processing states
  const [processingMode, setProcessingMode] = useState<"idle" | "ai" | "attendance">("idle");
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null); // Kept, but not set for AI
  const [aiReportId, setAiReportId] = useState<string | null>(null);
  const [aiReportData, setAiReportData] = useState<AiReportData | null>(null);

  // Attendance report
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReport | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"ai" | "attendance">("ai");

  // Initial data loading
  const [loading, setLoading] = useState(true);

  // Today's exams modal
  const [showTodayExamsModal, setShowTodayExamsModal] = useState(false);
  const [todayExams, setTodayExams] = useState<ExamData[]>([]);
  const [loadingTodayExams, setLoadingTodayExams] = useState(false);

  const criticalViolations = violations.filter(
    (v: any) => v.violation?.severity === "critical"
  );

  useEffect(() => {
    fetchExamsToday();
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch today's exams count
  const fetchExamsToday = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/exams/today");
      if (response.ok) {
        const data = await response.json();
        setExamsToday(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching today's exams:", error);
    }
  };

  // Fetch today's exams details for modal
  const fetchTodayExamsDetails = async () => {
    setLoadingTodayExams(true);
    try {
      const response = await fetch("http://localhost:5001/api/exams/today");
      if (response.ok) {
        const data = await response.json();
        setTodayExams(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching today's exams details:", error);
    } finally {
      setLoadingTodayExams(false);
    }
  };

  // Handle exams today card click
  const handleExamsTodayClick = () => {
    setShowTodayExamsModal(true);
    fetchTodayExamsDetails();
  };

  // Validate AI form
  useEffect(() => {
    const isValid = aiExamType.trim() !== "" && aiCourseName.trim() !== "" && aiVideoFile !== null;
    setAiFormValid(isValid);
  }, [aiExamType, aiCourseName, aiVideoFile]);

  // Validate Attendance form
  useEffect(() => {
    const isValid = attendanceExamType.trim() !== "" && attendanceCourseName.trim() !== "" && attendanceVideoFile !== null;
    setAttendanceFormValid(isValid);
  }, [attendanceExamType, attendanceCourseName, attendanceVideoFile]);

  // Handle video URL changes (This logic is now unused for AI, but kept for future potential use)
  useEffect(() => {
    if (outputVideoUrl && videoRef.current) {
      setVideoError(null);
      setVideoLoading(true);
      setVideoReady(false);

      videoRef.current.src = "";
      videoRef.current.load();
      videoRef.current.src = outputVideoUrl;
      videoRef.current.crossOrigin = "anonymous";

      videoRef.current.onerror = () => {
        setVideoError("Failed to load video");
        setVideoLoading(false);
      };

      videoRef.current.oncanplay = () => {
        setVideoLoading(false);
        setVideoReady(true);
      };
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.onerror = null;
        videoRef.current.oncanplay = null;
      }
    };
  }, [outputVideoUrl]);

  const handleAiVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAiVideoFile(e.target.files[0]);
      setOutputVideoUrl(null); // Ensure video URL is cleared
      setAiReportId(null);
      setProcessingStatus("idle");
      setProcessingError(null);
      setVideoError(null);
    }
  };

  const handleAttendanceVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAttendanceVideoFile(e.target.files[0]);
      setAttendanceReport(null);
      setProcessingStatus("idle");
      setProcessingError(null);
    }
  };

  const startAiProcessing = async () => {
    if (!aiFormValid) {
      setProcessingError("Please fill all required fields.");
      return;
    }

    setProcessingMode("ai");
    setProcessingStatus("processing");
    setProcessingError(null);

    // Update active sessions and current session info
    setActiveSessions(prev => prev + 1);
    setCurrentSessionInfo({
      examType: aiExamType.trim(),
      courseName: aiCourseName.trim(),
      timestamp: new Date().toLocaleTimeString()
    });

    const formData = new FormData();
    formData.append("examType", aiExamType.trim());
    formData.append("courseName", aiCourseName.trim());
    formData.append("video", aiVideoFile!);

    try {
      const response = await fetch("http://localhost:5001/api/ai/process-video", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // REMOVED: setOutputVideoUrl(data.outputUrl); to prevent video display
        setAiReportId(data.reportId);
        setAiReportData({
          examType: aiExamType,
          courseName: aiCourseName,
          summary: data.summary,
        });
        setProcessingStatus("complete");
        // REMOVED: Scroll to view processed video
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Processing failed");
      }
    } catch (error: any) {
      setProcessingError(error.message || "An error occurred");
      setProcessingStatus("error");
      // Decrease active sessions on error
      setActiveSessions(prev => Math.max(0, prev - 1));
    }
  };

  const startAttendanceProcessing = async () => {
    if (!attendanceFormValid) {
      setProcessingError("Please fill all required fields.");
      return;
    }

    setProcessingMode("attendance");
    setProcessingStatus("processing");
    setProcessingError(null);

    const formData = new FormData();
    formData.append("examType", attendanceExamType.trim());
    formData.append("courseName", attendanceCourseName.trim());
    formData.append("video", attendanceVideoFile!);

    try {
      const response = await fetch("http://localhost:5001/api/attendance/process-video", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceReport(data.report);
        setProcessingStatus("complete");

        setTimeout(() => {
          document.getElementById("attendance-report")?.scrollIntoView({ behavior: "smooth" });
        }, 500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Processing failed");
      }
    } catch (error: any) {
      setProcessingError(error.message || "An error occurred");
      setProcessingStatus("error");
    }
  };

  const handleVideoRetry = () => {
    if (videoRef.current) {
      videoRef.current.load();
      setVideoError(null);
      setVideoLoading(true);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Invigilator Dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Invigilator Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Sessions</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{activeSessions}</p>
                {currentSessionInfo && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p className="text-blue-900 font-semibold">{currentSessionInfo.examType}</p>
                    <p className="text-blue-700">{currentSessionInfo.courseName}</p>
                    <p className="text-blue-600 mt-1">{currentSessionInfo.timestamp}</p>
                  </div>
                )}
              </div>
              <Monitor className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>

          <div 
            onClick={handleExamsTodayClick}
            className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow cursor-pointer hover:bg-purple-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Exams Today</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{examsToday}</p>
                <p className="text-xs text-purple-600 mt-2">Click to view details</p>
              </div>
              <BookOpen className="w-10 h-10 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Today's Exams Modal */}
        {showTodayExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  Today's Exams
                </h2>
                <button
                  onClick={() => setShowTodayExamsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingTodayExams ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-12 h-12 text-purple-600 animate-spin" />
                  </div>
                ) : todayExams.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No exams scheduled for today</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {todayExams.map((exam) => (
                      <div
                        key={exam._id}
                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            exam.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            exam.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                            exam.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {exam.status}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <GraduationCap className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">Course:</span>
                            <span>{exam.course}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Duration:</span>
                            <span>{exam.duration} minutes</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Users className="w-4 h-4 text-green-600" />
                            <span className="font-medium">Students:</span>
                            <span>{exam.students}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <FileText className="w-4 h-4 text-orange-600" />
                            <span className="font-medium">Total Marks:</span>
                            <span>{exam.totalMarks}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Target className="w-4 h-4 text-red-600" />
                            <span className="font-medium">Passing Marks:</span>
                            <span>{exam.passingMarks}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Exam Code: <span className="font-mono font-semibold">{exam.examCode}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab("ai")}
                className={`py-4 px-2 font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === "ai"
                    ? "text-blue-600 border-blue-600"
                    : "text-gray-600 border-transparent hover:text-gray-900"
                }`}
              >
                <Eye className="w-5 h-5" />
                Cheating Detector
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`py-4 px-2 font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === "attendance"
                    ? "text-purple-600 border-purple-600"
                    : "text-gray-600 border-transparent hover:text-gray-900"
                }`}
              >
                <Users className="w-5 h-5" />
                Attendance
              </button>
            </div>
          </div>

          {/* AI Detection Tab */}
          {activeTab === "ai" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Cheating Detection With AI</h3>

                <div className="space-y-6">
                  {/* Exam Type Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Midterm, Final, Quiz"
                      value={aiExamType}
                      onChange={(e) => setAiExamType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Course Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Data Structures, Web Development"
                      value={aiCourseName}
                      onChange={(e) => setAiCourseName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Video File Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video File <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition bg-gray-50 hover:bg-blue-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 text-center">
                            {aiVideoFile ? aiVideoFile.name : "Click to upload or drag and drop"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI, WebM, MKV</p>
                        </div>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleAiVideoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={startAiProcessing}
                    disabled={!aiFormValid || processingStatus === "processing"}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      aiFormValid && processingStatus !== "processing"
                        ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {processingStatus === "processing" && processingMode === "ai" ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" /> Start AI Detection
                      </>
                    )}
                  </button>

                  {/* Error Alert */}
                  {processingError && processingMode === "ai" && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{processingError}</p>
                    </div>
                  )}

                  {/* Success Alert */}
                  {processingStatus === "complete" && processingMode === "ai" && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-semibold">AI Detection Complete!</p>
                        <p className="mt-1">Exam: {aiExamType} | Course: {aiCourseName}</p>
                        <p className="text-blue-600 text-xs mt-2 block">
                          Results are available in the Report Dashboard.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Student Attendance Detection</h3>

                <div className="space-y-6">
                  {/* Exam Type Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Midterm, Final, Quiz"
                      value={attendanceExamType}
                      onChange={(e) => setAttendanceExamType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Course Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Data Structures, Web Development"
                      value={attendanceCourseName}
                      onChange={(e) => setAttendanceCourseName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Video File Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video File <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition bg-gray-50 hover:bg-purple-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 text-center">
                            {attendanceVideoFile ? attendanceVideoFile.name : "Click to upload or drag and drop"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI, WebM, MKV</p>
                        </div>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleAttendanceVideoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={startAttendanceProcessing}
                    disabled={!attendanceFormValid || processingStatus === "processing"}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      attendanceFormValid && processingStatus !== "processing"
                        ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {processingStatus === "processing" && processingMode === "attendance" ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5" /> Process Attendance
                      </>
                    )}
                  </button>

                  {/* Error Alert */}
                  {processingError && processingMode === "attendance" && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{processingError}</p>
                    </div>
                  )}

                  {/* Success Alert */}
                  {processingStatus === "complete" && processingMode === "attendance" && attendanceReport && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-semibold">Attendance Processed!</p>
                        <a href="#attendance-report" className="text-blue-600 hover:underline text-xs mt-2 block">
                          View attendance report
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Report - ONLY Renders if outputVideoUrl is set (i.e., NOT for AI now) */}
        {outputVideoUrl && (
          <div id="video-report" className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-green-600" /> AI Detection Report
            </h2>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Exam Type:</span> {aiReportData?.examType} |{" "}
                <span className="font-semibold">Course:</span> {aiReportData?.courseName}
              </p>
              {aiReportId && (
                <p className="text-xs text-blue-700 mt-2">Report ID: {aiReportId}</p>
              )}
            </div>

            <div className="relative w-full bg-black rounded-lg overflow-hidden">
              <div className="aspect-video flex items-center justify-center bg-gray-900">
                <video
                  ref={videoRef}
                  controls
                  preload="metadata"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                />

                {videoLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center">
                      <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-2" />
                      <p className="text-white text-sm">Loading video...</p>
                    </div>
                  </div>
                )}

                {videoError && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-2" />
                    <p className="text-white text-sm text-center mb-4">{videoError}</p>
                    <button
                      onClick={handleVideoRetry}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 text-sm"
                    >
                      <RotateCcw className="w-4 h-4" /> Retry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {videoReady && videoRef.current && (
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  Duration: {Math.floor(videoRef.current.duration / 60)}m{" "}
                  {Math.floor(videoRef.current.duration % 60)}s
                </p>
              </div>
            )}
          </div>
        )}

        {/* Attendance Report */}
        {attendanceReport && (
          <div id="attendance-report" className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" /> Attendance Report
            </h2>

            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900">
                <span className="font-semibold">Exam Type:</span> {attendanceReport.exam_type} |{" "}
                <span className="font-semibold">Course:</span> {attendanceReport.course_name}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-200">
                <p className="text-3xl font-bold text-blue-600">{attendanceReport.total_students}</p>
                <p className="text-sm text-gray-600 mt-1">Total Students</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center border border-green-200">
                <p className="text-3xl font-bold text-green-600">{attendanceReport.present_count}</p>
                <p className="text-sm text-gray-600 mt-1">Present</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center border border-red-200">
                <p className="text-3xl font-bold text-red-600">{attendanceReport.absent_count}</p>
                <p className="text-sm text-gray-600 mt-1">Absent</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Present Students */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Present ({attendanceReport.present_count})
                </h3>
                <div className="space-y-2">
                  {attendanceReport.present_students.map((student) => (
                    <div key={student} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{student}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Absent Students */}
              {attendanceReport.absent_count > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Absent ({attendanceReport.absent_count})
                  </h3>
                  <div className="space-y-2">
                    {attendanceReport.absent_students.map((student) => (
                      <div key={student} className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                        <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{student}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">Duration: {attendanceReport.duration_seconds.toFixed(1)}s</p>
              <p className="text-xs text-gray-600 mt-1">Total Frames: {attendanceReport.total_frames}</p>
              <p className="text-xs text-gray-600 mt-1">Recognitions: {attendanceReport.recognition_history.length}</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}