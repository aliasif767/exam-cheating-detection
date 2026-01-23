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
  Activity,
  Shield,
  TrendingUp,
  Video,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

// --- UPDATED INTERFACES START ---
interface UnknownPerson {
  id: number;
  time: string;
  timestamp: string;
  distance: number;
  image_base64: string;
  frame: number;
}

interface AttendanceReport {
  exam_type: string;
  course_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  unknown_count: number;         // Added field
  unknown_persons: UnknownPerson[]; // Added field
  present_students: string[];
  absent_students: string[];
  duration_seconds: number;
  total_frames: number;
  recognition_history: any[];
}
// --- UPDATED INTERFACES END ---

interface AiReportData {
  examType: string;
  courseName: string;
  summary: any;
}

export default function InvigilatorDashboard() {
  const { user, token } = useAuth();
  const { connected, liveData, violations } = useSocket();

  const [activeSessions, setActiveSessions] = useState(0);
  const [examsToday, setExamsToday] = useState(0);
  const [currentSessionInfo, setCurrentSessionInfo] = useState<CurrentSessionInfo | null>(null);

  const [aiExamType, setAiExamType] = useState("");
  const [aiCourseName, setAiCourseName] = useState("");
  const [aiVideoFile, setAiVideoFile] = useState<File | null>(null);
  const [aiFormValid, setAiFormValid] = useState(false);

  const [attendanceExamType, setAttendanceExamType] = useState("");
  const [attendanceCourseName, setAttendanceCourseName] = useState("");
  const [attendanceVideoFile, setAttendanceVideoFile] = useState<File | null>(null);
  const [attendanceFormValid, setAttendanceFormValid] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const [processingMode, setProcessingMode] = useState<"idle" | "ai" | "attendance">("idle");
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "complete" | "error">("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);
  const [aiReportId, setAiReportId] = useState<string | null>(null);
  const [aiReportData, setAiReportData] = useState<AiReportData | null>(null);

  const [attendanceReport, setAttendanceReport] = useState<AttendanceReport | null>(null);
  const [activeTab, setActiveTab] = useState<"ai" | "attendance">("ai");
  const [loading, setLoading] = useState(true);

  const [showTodayExamsModal, setShowTodayExamsModal] = useState(false);
  const [todayExams, setTodayExams] = useState<ExamData[]>([]);
  const [loadingTodayExams, setLoadingTodayExams] = useState(false);

  useEffect(() => {
    fetchExamsToday();
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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

  const handleExamsTodayClick = () => {
    setShowTodayExamsModal(true);
    fetchTodayExamsDetails();
  };

  useEffect(() => {
    const isValid = aiExamType.trim() !== "" && aiCourseName.trim() !== "" && aiVideoFile !== null;
    setAiFormValid(isValid);
  }, [aiExamType, aiCourseName, aiVideoFile]);

  useEffect(() => {
    const isValid = attendanceExamType.trim() !== "" && attendanceCourseName.trim() !== "" && attendanceVideoFile !== null;
    setAttendanceFormValid(isValid);
  }, [attendanceExamType, attendanceCourseName, attendanceVideoFile]);

  const handleAiVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAiVideoFile(e.target.files[0]);
      setOutputVideoUrl(null);
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
        setAiReportId(data.reportId);
        setAiReportData({
          examType: aiExamType,
          courseName: aiCourseName,
          summary: data.summary,
        });
        setProcessingStatus("complete");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Processing failed");
      }
    } catch (error: any) {
      setProcessingError(error.message || "An error occurred");
      setProcessingStatus("error");
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

  if (loading) {
    return (
      <DashboardLayout title="Invigilator Dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  const attendanceRate = attendanceReport 
    ? Math.round((attendanceReport.present_count / attendanceReport.total_students) * 100)
    : 0;

  return (
    <DashboardLayout title="Invigilator Dashboard">
      <div className="space-y-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 rounded-2xl shadow-2xl p-8">
          <div className="absolute inset-0 bg-black opacity-5"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white bg-opacity-20 text-white border-0 backdrop-blur-sm">
                Proctoring System
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Invigilator Dashboard 👁️</h1>
            <p className="text-cyan-100 text-lg">Monitor exams with AI-powered proctoring and attendance tracking</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                    <Monitor className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                    <p className="text-3xl font-bold text-blue-700">{activeSessions}</p>
                  </div>
                </div>
              </div>
              {currentSessionInfo && (
                <div className="mt-4 p-3 bg-white rounded-lg border-2 border-blue-200 shadow-sm">
                  <p className="text-sm font-bold text-blue-900 mb-1">{currentSessionInfo.examType}</p>
                  <p className="text-xs text-blue-700">{currentSessionInfo.courseName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Activity className="w-3 h-3 text-blue-600 animate-pulse" />
                    <p className="text-xs text-blue-600 font-medium">{currentSessionInfo.timestamp}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div 
            onClick={handleExamsTodayClick}
            className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Exams Today</p>
                    <p className="text-3xl font-bold text-purple-700">{examsToday}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-purple-600 font-medium mt-4 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Click to view details
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Status</p>
                    <p className="text-3xl font-bold text-green-700">Active</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-green-600 font-medium">All services operational</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex gap-2 p-2">
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-1 py-4 px-6 font-semibold transition-all rounded-xl flex items-center justify-center gap-3 ${
                  activeTab === "ai"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                <Eye className="w-5 h-5" />
                AI Cheating Detection
              </button>
              <button
                onClick={() => setActiveTab("attendance")}
                className={`flex-1 py-4 px-6 font-semibold transition-all rounded-xl flex items-center justify-center gap-3 ${
                  activeTab === "attendance"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105"
                    : "text-gray-600 hover:bg-white hover:text-gray-900"
                }`}
              >
                <Users className="w-5 h-5" />
                Attendance Tracking
              </button>
            </div>
          </div>

          {/* AI Detection Tab */}
          {activeTab === "ai" && (
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                  AI-Powered Cheating Detection
                </h3>
                <p className="text-gray-600">Upload exam videos to detect suspicious behavior and proctoring violations</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Exam Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Midterm, Final, Quiz"
                      value={aiExamType}
                      onChange={(e) => setAiExamType(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Data Structures, Web Development"
                      value={aiCourseName}
                      onChange={(e) => setAiCourseName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200 h-full">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Video Upload <span className="text-red-500">*</span>
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-48 border-4 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 transition bg-white hover:bg-blue-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-12 h-12 text-blue-500 mb-3" />
                        <p className="text-sm text-gray-700 text-center font-medium px-4">
                          {aiVideoFile ? (
                            <span className="text-blue-600">{aiVideoFile.name}</span>
                          ) : (
                            "Click to upload or drag and drop"
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">MP4, MOV, AVI, WebM, MKV</p>
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
              </div>

              <button
                onClick={startAiProcessing}
                disabled={!aiFormValid || processingStatus === "processing"}
                className={`w-full mt-6 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg ${
                  aiFormValid && processingStatus !== "processing"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white cursor-pointer hover:shadow-xl hover:scale-105"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {processingStatus === "processing" && processingMode === "ai" ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" /> Processing Video...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" /> Start AI Analysis
                  </>
                )}
              </button>

              {processingError && processingMode === "ai" && (
                <div className="mt-6 p-5 bg-red-50 border-2 border-red-300 rounded-xl flex gap-4 shadow-md">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900">Processing Error</p>
                    <p className="text-sm text-red-800 mt-1">{processingError}</p>
                  </div>
                </div>
              )}

              {processingStatus === "complete" && processingMode === "ai" && (
                <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg">
                  <div className="flex gap-4">
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-lg text-green-900">AI Detection Complete! 🎉</p>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-green-800">
                          <span className="font-semibold">Exam:</span> {aiExamType}
                        </p>
                        <p className="text-sm text-green-800">
                          <span className="font-semibold">Course:</span> {aiCourseName}
                        </p>
                        {aiReportId && (
                          <p className="text-xs text-green-700 mt-2 font-mono bg-white p-2 rounded">
                            Report ID: {aiReportId}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium">
                          📊 View full results in the Report Dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === "attendance" && (
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-500" />
                  Facial Recognition Attendance
                </h3>
                <p className="text-gray-600">Automatically track student attendance using facial recognition technology</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Exam Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Midterm, Final, Quiz"
                      value={attendanceExamType}
                      onChange={(e) => setAttendanceExamType(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Course Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Data Structures, Web Development"
                      value={attendanceCourseName}
                      onChange={(e) => setAttendanceCourseName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200 h-full">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Video Upload <span className="text-red-500">*</span>
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-48 border-4 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-500 transition bg-white hover:bg-purple-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Video className="w-12 h-12 text-purple-500 mb-3" />
                        <p className="text-sm text-gray-700 text-center font-medium px-4">
                          {attendanceVideoFile ? (
                            <span className="text-purple-600">{attendanceVideoFile.name}</span>
                          ) : (
                            "Click to upload or drag and drop"
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">MP4, MOV, AVI, WebM, MKV</p>
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
              </div>

              <button
                onClick={startAttendanceProcessing}
                disabled={!attendanceFormValid || processingStatus === "processing"}
                className={`w-full mt-6 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg ${
                  attendanceFormValid && processingStatus !== "processing"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white cursor-pointer hover:shadow-xl hover:scale-105"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {processingStatus === "processing" && processingMode === "attendance" ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" /> Processing Attendance...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6" /> Process Attendance
                  </>
                )}
              </button>

              {processingError && processingMode === "attendance" && (
                <div className="mt-6 p-5 bg-red-50 border-2 border-red-300 rounded-xl flex gap-4 shadow-md">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900">Processing Error</p>
                    <p className="text-sm text-red-800 mt-1">{processingError}</p>
                  </div>
                </div>
              )}

              {processingStatus === "complete" && processingMode === "attendance" && attendanceReport && (
                <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-lg">
                  <div className="flex gap-4">
                    <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-lg text-green-900">Attendance Processed! ✅</p>
                      <p className="text-sm text-green-800 mt-2">Scroll down to view the attendance report</p>
                      <a 
                        href="#attendance-report" 
                        className="inline-flex items-center gap-2 mt-3 text-sm text-purple-600 hover:text-purple-800 font-semibold hover:underline"
                      >
                        View Report Below <Eye className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attendance Report Display */}
        {attendanceReport && (
          <div id="attendance-report" className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="w-7 h-7" />
                Attendance Report
              </h2>
              <p className="text-purple-100 mt-2">Facial recognition results</p>
            </div>

            <div className="p-8 space-y-6">
              {/* Exam Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Exam Type</p>
                  <p className="text-xl font-bold text-purple-900">{attendanceReport.exam_type}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200">
                  <p className="text-sm text-gray-600 font-medium mb-1">Course Name</p>
                  <p className="text-xl font-bold text-purple-900">{attendanceReport.course_name}</p>
                </div>
              </div>

              {/* --- UPDATED STATS CARDS (4 COLUMNS) --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-300 text-center shadow-lg">
                  <Users className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                  <p className="text-4xl font-bold text-blue-700">{attendanceReport.total_students}</p>
                  <p className="text-sm text-gray-600 mt-2 font-semibold">Total Registered</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border-2 border-green-300 text-center shadow-lg">
                  <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
                  <p className="text-4xl font-bold text-green-700">{attendanceReport.present_count}</p>
                  <p className="text-sm text-gray-600 mt-2 font-semibold">Present</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-100 p-6 rounded-xl border-2 border-red-300 text-center shadow-lg">
                  <XCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
                  <p className="text-4xl font-bold text-red-700">{attendanceReport.absent_count}</p>
                  <p className="text-sm text-gray-600 mt-2 font-semibold">Absent</p>
                </div>
                
                {/* NEW UNKNOWN PERSONS CARD */}
                <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 p-6 rounded-xl border-2 border-orange-300 text-center shadow-lg">
                  <AlertTriangle className="w-10 h-10 text-orange-600 mx-auto mb-3" />
                  <p className="text-4xl font-bold text-orange-700">{attendanceReport.unknown_count || 0}</p>
                  <p className="text-sm text-gray-600 mt-2 font-semibold">Unknown/Intruders</p>
                </div>
              </div>

              {/* Attendance Rate */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-bold text-gray-700">Attendance Rate</span>
                  </div>
                  <span className="text-2xl font-bold text-indigo-700">{attendanceRate}%</span>
                </div>
                <Progress value={attendanceRate} className="h-3" />
                <p className="text-xs text-gray-600 mt-2">
                  {attendanceReport.present_count} out of {attendanceReport.total_students} students present
                </p>
              </div>

              {/* Student Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Present Students */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 overflow-hidden">
                  <div className="bg-green-500 p-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                      <CheckCircle className="w-6 h-6" />
                      Present ({attendanceReport.present_count})
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {attendanceReport.present_students.length > 0 ? (
                      attendanceReport.present_students.map((student, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-1.5 bg-green-100 rounded-full">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{student}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic text-center py-8">No present students</p>
                    )}
                  </div>
                </div>

                {/* Absent Students */}
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border-2 border-red-300 overflow-hidden">
                  <div className="bg-red-500 p-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                      <XCircle className="w-6 h-6" />
                      Absent ({attendanceReport.absent_count})
                    </h3>
                  </div>
                  <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {attendanceReport.absent_students.length > 0 ? (
                      attendanceReport.absent_students.map((student, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-red-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-1.5 bg-red-100 rounded-full">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{student}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic text-center py-8">No absent students</p>
                    )}
                  </div>
                </div>
              </div>

              {/* --- NEW SECTION: UNKNOWN PERSONS DETECTIONS --- */}
              {attendanceReport.unknown_persons && attendanceReport.unknown_persons.length > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-300 overflow-hidden">
                  <div className="bg-orange-500 p-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-6 h-6" />
                      Unknown Persons Detected ({attendanceReport.unknown_count})
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {attendanceReport.unknown_persons.map((person, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-md border border-orange-200 overflow-hidden hover:shadow-xl transition-all">
                          {/* Image Container */}
                          <div className="relative aspect-square bg-gray-100 border-b border-orange-100">
                            {person.image_base64 ? (
                              <img 
                                src={`data:image/jpeg;base64,${person.image_base64}`} 
                                alt={`Unknown Person ${person.id}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-gray-400">
                                <Users className="w-12 h-12" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                              ID: {person.id}
                            </div>
                          </div>
                          
                          {/* Details */}
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 font-medium">Time:</span>
                              <span className="font-bold text-gray-800">{person.time}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 font-medium">Frame:</span>
                              <span className="font-mono text-gray-600">{person.frame}</span>
                            </div>
                            <div className="w-full bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded text-center mt-2">
                              Match Dist: {person.distance.toFixed(3)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* --- END NEW SECTION --- */}

              {/* Processing Details */}
              <div className="bg-gray-50 p-5 rounded-xl border-2 border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gray-600" />
                  Processing Details
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Duration</p>
                    <p className="font-bold text-gray-900">{attendanceReport.duration_seconds.toFixed(1)}s</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Frames</p>
                    <p className="font-bold text-gray-900">{attendanceReport.total_frames}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Recognitions</p>
                    <p className="font-bold text-gray-900">{attendanceReport.recognition_history.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Exams Modal */}
        {showTodayExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  Today's Exams
                </h2>
                <button
                  onClick={() => setShowTodayExamsModal(false)}
                  className="p-2 hover:bg-white rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingTodayExams ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading today's exams...</p>
                  </div>
                ) : todayExams.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-12 h-12 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Exams Today</h3>
                    <p className="text-gray-600">No exams are scheduled for today.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {todayExams.map((exam) => (
                      <div
                        key={exam._id}
                        className="bg-gradient-to-br from-white to-purple-50 border-2 border-purple-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900 flex-1">{exam.title}</h3>
                          <Badge className={`${
                            exam.status === 'scheduled' ? 'bg-blue-500' :
                            exam.status === 'ongoing' ? 'bg-green-500' :
                            exam.status === 'completed' ? 'bg-gray-500' :
                            'bg-yellow-500'
                          } text-white`}>
                            {exam.status}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <GraduationCap className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="font-medium">Course:</span>
                            <span className="font-semibold text-purple-700">{exam.course}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">Duration:</span>
                            <span className="font-semibold text-blue-700">{exam.duration} minutes</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Users className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="font-medium">Students:</span>
                            <span className="font-semibold text-green-700">{exam.students}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Target className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <span className="font-medium">Total Marks:</span>
                            <span className="font-semibold text-orange-700">{exam.totalMarks}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <p className="text-xs text-gray-500 font-mono">
                            Code: <span className="font-bold text-purple-700">{exam.examCode}</span>
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
      </div>
    </DashboardLayout>
  );
}