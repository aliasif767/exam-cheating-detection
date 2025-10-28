import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  Loader,
  GraduationCap,
  Users,
  Target,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Exam {
  _id: string;
  title: string;
  subject?: string;
  course: string;
  examCode: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  date?: string;
  status: "scheduled" | "ongoing" | "completed" | "draft";
  students?: number;
  totalMarks?: number;
  passingMarks?: number;
  mySession?: {
    status: string;
    finalReport?: {
      riskScore: number;
      recommendation: string;
    };
  };
}

interface VideoReport {
  _id: string;
  examType: string;
  courseName: string;
  status: string;
  createdAt: string;
  proctoringViolationsCount: number;
  totalDuration_s: number;
}

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayExamsCount, setTodayExamsCount] = useState(0);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
  const [completedExamsCount, setCompletedExamsCount] = useState(0);

  // Today's exams modal
  const [showTodayExamsModal, setShowTodayExamsModal] = useState(false);
  const [todayExams, setTodayExams] = useState<Exam[]>([]);
  const [loadingTodayExams, setLoadingTodayExams] = useState(false);

  // Upcoming exams modal
  const [showUpcomingExamsModal, setShowUpcomingExamsModal] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [loadingUpcomingExams, setLoadingUpcomingExams] = useState(false);

  // Completed exams modal
  const [showCompletedExamsModal, setShowCompletedExamsModal] = useState(false);
  const [completedExams, setCompletedExams] = useState<VideoReport[]>([]);
  const [loadingCompletedExams, setLoadingCompletedExams] = useState(false);

  useEffect(() => {
    fetchMyExams();
    fetchTodayExamsCount();
    fetchUpcomingExamsCount();
    fetchCompletedExamsCount();
  }, []);

  const fetchMyExams = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/exam/student/my-exams",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setExams(data.data.exams);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch today's exams count
  const fetchTodayExamsCount = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/exams/today");
      if (response.ok) {
        const data = await response.json();
        setTodayExamsCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching today's exams count:", error);
    }
  };

  // Fetch upcoming exams count (MODIFIED)
  const fetchUpcomingExamsCount = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/exams?status=scheduled");
      if (response.ok) {
        const data = await response.json();
        
        // Logic to filter for dates strictly greater than today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTime = todayStart.getTime();

        const futureScheduledExams = (data.data || []).filter((exam: Exam) => {
          if (!exam.date) return false;
          const examDate = new Date(exam.date);
          // Normalize the exam date to the start of its day for comparison
          examDate.setHours(0, 0, 0, 0); 
          // Strictly greater than today's start means tomorrow or later.
          return examDate.getTime() > todayStartTime;
        });

        setUpcomingExamsCount(futureScheduledExams.length);
        
      }
    } catch (error) {
      console.error("Error fetching upcoming exams count:", error);
    }
  };

  // Fetch completed exams count
  const fetchCompletedExamsCount = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/ai/reports");
      if (response.ok) {
        const data = await response.json();
        setCompletedExamsCount(data.data?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching completed exams count:", error);
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

  // Fetch upcoming exams (scheduled status only) (MODIFIED)
  const fetchUpcomingExamsDetails = async () => {
    setLoadingUpcomingExams(true);
    try {
      const response = await fetch("http://localhost:5001/api/exams?status=scheduled");
      if (response.ok) {
        const data = await response.json();

        // Logic to filter for dates strictly greater than today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTime = todayStart.getTime();

        const futureScheduledExams = (data.data || []).filter((exam: Exam) => {
          if (!exam.date) return false;
          const examDate = new Date(exam.date);
          // Normalize the exam date to the start of its day for comparison
          examDate.setHours(0, 0, 0, 0);
          // Strictly greater than today's start means tomorrow or later.
          return examDate.getTime() > todayStartTime;
        });

        setUpcomingExams(futureScheduledExams);
      }
    } catch (error) {
      console.error("Error fetching upcoming exams:", error);
    } finally {
      setLoadingUpcomingExams(false);
    }
  };

  // Fetch completed exams from video_reports
  const fetchCompletedExamsDetails = async () => {
    setLoadingCompletedExams(true);
    try {
      const response = await fetch("http://localhost:5001/api/ai/reports");
      if (response.ok) {
        const data = await response.json();
        setCompletedExams(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching completed exams:", error);
    } finally {
      setLoadingCompletedExams(false);
    }
  };

  // Handle today exams card click
  const handleTodayExamsClick = () => {
    setShowTodayExamsModal(true);
    fetchTodayExamsDetails();
  };

  // Handle upcoming exams card click
  const handleUpcomingExamsClick = () => {
    setShowUpcomingExamsModal(true);
    fetchUpcomingExamsDetails();
  };

  // Handle completed exams card click
  const handleCompletedExamsClick = () => {
    setShowCompletedExamsModal(true);
    fetchCompletedExamsDetails();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default";
      case "ongoing":
        return "destructive";
      case "completed":
        return "secondary";
      default:
        return "default";
    }
  };

  const ongoingExams = exams.filter((exam) => exam.status === "ongoing");

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome, {user?.firstName}!
              </h2>
              
            </div>
           
          </div>
          <div className="flex items-center mt-4 space-x-6">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="text-sm">Student ID: {user?.studentId}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="text-sm">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-blue-50"
            onClick={handleUpcomingExamsClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Exams
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingExamsCount}</div>
              <p className="text-xs text-blue-600 font-medium">
                Click to view details
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-green-50"
            onClick={handleCompletedExamsClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Exams
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedExamsCount}</div>
              <p className="text-xs text-green-600 font-medium">
                Click to view details
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-purple-50"
            onClick={handleTodayExamsClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today Exam
              </CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayExamsCount}</div>
              <p className="text-xs text-purple-600 font-medium">
                Click to view details
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Exams Modal */}
        {showTodayExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-purple-600" />
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
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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

                          {exam.students && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Users className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Students:</span>
                              <span>{exam.students}</span>
                            </div>
                          )}

                          {exam.totalMarks && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FileText className="w-4 h-4 text-orange-600" />
                              <span className="font-medium">Total Marks:</span>
                              <span>{exam.totalMarks}</span>
                            </div>
                          )}

                          {exam.passingMarks && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Target className="w-4 h-4 text-red-600" />
                              <span className="font-medium">Passing Marks:</span>
                              <span>{exam.passingMarks}</span>
                            </div>
                          )}
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

        {/* Upcoming Exams Modal */}
        {showUpcomingExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Upcoming Exams (Scheduled)
                </h2>
                <button
                  onClick={() => setShowUpcomingExamsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingUpcomingExams ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                  </div>
                ) : upcomingExams.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No upcoming exams scheduled</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingExams.map((exam) => (
                      <div
                        key={exam._id}
                        className="bg-white border border-blue-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {exam.status}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <GraduationCap className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Course:</span>
                            <span>{exam.course}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">Duration:</span>
                            <span>{exam.duration} minutes</span>
                          </div>

                          {exam.date && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Calendar className="w-4 h-4 text-green-600" />
                              <span className="font-medium">Date:</span>
                              <span>{new Date(exam.date).toLocaleDateString()}</span>
                            </div>
                          )}

                          {exam.totalMarks && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FileText className="w-4 h-4 text-orange-600" />
                              <span className="font-medium">Total Marks:</span>
                              <span>{exam.totalMarks}</span>
                            </div>
                          )}

                          {exam.passingMarks && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Target className="w-4 h-4 text-red-600" />
                              <span className="font-medium">Passing Marks:</span>
                              <span>{exam.passingMarks}</span>
                            </div>
                          )}
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

        {/* Completed Exams Modal (from video_reports) */}
        {showCompletedExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Completed Exams
                </h2>
                <button
                  onClick={() => setShowCompletedExamsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingCompletedExams ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-12 h-12 text-green-600 animate-spin" />
                  </div>
                ) : completedExams.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No completed exams found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedExams.map((report) => (
                      <div
                        key={report._id}
                        className="bg-white border border-green-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-gray-900">{report.examType}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {report.status}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <GraduationCap className="w-4 h-4 text-green-600" />
                            <span className="font-medium">Course:</span>
                            <span>{report.courseName}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Eye className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Violations:</span>
                            <span>{report.proctoringViolationsCount}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span className="font-medium">Duration:</span>
                            <span>{(report.totalDuration_s / 60).toFixed(1)} minutes</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="w-4 h-4 text-orange-600" />
                            <span className="font-medium">Completed:</span>
                            <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Report ID: <span className="font-mono font-semibold">{report._id}</span>
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