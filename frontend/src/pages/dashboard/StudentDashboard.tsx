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
  UserCheck,
  TrendingUp,
  Award,
  Bell,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import StudentNotifications from "@/components/StudentNotifications";

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

interface AttendanceReport {
  _id: string;
  exam_type: string;
  course_name: string;
  student_status: string;
  attendance_date: string;
  attendance_time: string;
  createdAt: string;
  present_count: number;
  absent_count: number;
  total_students: number;
}

export default function StudentDashboard() {
  const { user, token } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayExamsCount, setTodayExamsCount] = useState(0);
  const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
  const [completedExamsCount, setCompletedExamsCount] = useState(0);
  const [attendanceReportsCount, setAttendanceReportsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Modals state
  const [showTodayExamsModal, setShowTodayExamsModal] = useState(false);
  const [todayExams, setTodayExams] = useState<Exam[]>([]);
  const [loadingTodayExams, setLoadingTodayExams] = useState(false);

  const [showUpcomingExamsModal, setShowUpcomingExamsModal] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [loadingUpcomingExams, setLoadingUpcomingExams] = useState(false);

  const [showCompletedExamsModal, setShowCompletedExamsModal] = useState(false);
  const [completedExams, setCompletedExams] = useState<VideoReport[]>([]);
  const [loadingCompletedExams, setLoadingCompletedExams] = useState(false);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    fetchMyExams();
    fetchTodayExamsCount();
    fetchUpcomingExamsCount();
    fetchCompletedExamsCount();
    fetchAttendanceReportsCount();
    fetchUnreadNotificationsCount();
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

  const fetchUpcomingExamsCount = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/exams?status=scheduled");
      if (response.ok) {
        const data = await response.json();
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTime = todayStart.getTime();

        const futureScheduledExams = (data.data || []).filter((exam: Exam) => {
          if (!exam.date) return false;
          const examDate = new Date(exam.date);
          examDate.setHours(0, 0, 0, 0); 
          return examDate.getTime() > todayStartTime;
        });

        setUpcomingExamsCount(futureScheduledExams.length);
      }
    } catch (error) {
      console.error("Error fetching upcoming exams count:", error);
    }
  };

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

  const fetchAttendanceReportsCount = async () => {
    try {
      if (!user?.firstName) return;
      
      const fullName = user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
      
      const response = await fetch(
        `http://localhost:5001/api/attendance/student-reports?studentName=${encodeURIComponent(fullName)}`
      );
      if (response.ok) {
        const data = await response.json();
        setAttendanceReportsCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching attendance reports count:", error);
    }
  };

  const fetchUnreadNotificationsCount = async () => {
    try {
      if (!user?.firstName) return;
      
      const fullName = user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
      
      const response = await fetch(
        `http://localhost:5001/api/notifications/unread-count/${encodeURIComponent(fullName)}`
      );
      if (response.ok) {
        const data = await response.json();
        setUnreadNotificationsCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching unread notifications count:", error);
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

  const fetchUpcomingExamsDetails = async () => {
    setLoadingUpcomingExams(true);
    try {
      const response = await fetch("http://localhost:5001/api/exams?status=scheduled");
      if (response.ok) {
        const data = await response.json();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTime = todayStart.getTime();

        const futureScheduledExams = (data.data || []).filter((exam: Exam) => {
          if (!exam.date) return false;
          const examDate = new Date(exam.date);
          examDate.setHours(0, 0, 0, 0);
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

  const fetchAttendanceReportsDetails = async () => {
    setLoadingAttendance(true);
    try {
      if (!user?.firstName) return;
      
      const fullName = user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
      
      const response = await fetch(
        `http://localhost:5001/api/attendance/student-reports?studentName=${encodeURIComponent(fullName)}`
      );
      if (response.ok) {
        const data = await response.json();
        setAttendanceReports(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching attendance reports:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleTodayExamsClick = () => {
    setShowTodayExamsModal(true);
    fetchTodayExamsDetails();
  };

  const handleUpcomingExamsClick = () => {
    setShowUpcomingExamsModal(true);
    fetchUpcomingExamsDetails();
  };

  const handleCompletedExamsClick = () => {
    setShowCompletedExamsModal(true);
    fetchCompletedExamsDetails();
  };

  const handleAttendanceClick = () => {
    setShowAttendanceModal(true);
    fetchAttendanceReportsDetails();
  };

  const handleNotificationsClick = () => {
    setShowNotificationsModal(true);
  };

  const handleUnreadCountChange = (count: number) => {
    setUnreadNotificationsCount(count);
  };

  const ongoingExams = exams.filter((exam) => exam.status === "ongoing");

  // Calculate attendance percentage
  const presentCount = attendanceReports.filter(r => r.student_status === 'Present').length;
  const attendancePercentage = attendanceReportsCount > 0 
    ? Math.round((presentCount / attendanceReportsCount) * 100) 
    : 0;

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  const studentFullName = user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || "";

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-8">
        {/* Hero Welcome Section with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-black opacity-5"></div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-2">Welcome back!</p>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Hello, {user?.firstName}! 👋
                </h1>
                <p className="text-blue-100 text-lg">Ready to excel in your exams today?</p>
              </div>
              <div className="flex gap-3">
                {/* Notifications Bell */}
                <button
                  onClick={handleNotificationsClick}
                  className="relative flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full backdrop-blur-sm hover:bg-opacity-30 transition-all"
                >
                  <Bell className="w-7 h-7 text-white" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
                
                <div className="hidden md:flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full backdrop-blur-sm">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-white">
              <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">ID: {user?.studentId}</span>
              </div>
              <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Active Student</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Alert (if any unread) */}
        {unreadNotificationsCount > 0 && (
          <Alert className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-900 font-medium">
              You have {unreadNotificationsCount} unread notification{unreadNotificationsCount > 1 ? 's' : ''}.{' '}
              <button
                onClick={handleNotificationsClick}
                className="underline font-bold hover:text-red-700"
              >
                Click here to view
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Upcoming Exams Card */}
          <Card 
            className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100"
            onClick={handleUpcomingExamsClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Upcoming Exams
              </CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 mb-1">{upcomingExamsCount}</div>
              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                Click to view details <ArrowRight className="w-3 h-3" />
              </p>
              <Progress value={upcomingExamsCount * 10} className="h-1 mt-3 bg-blue-200" />
            </CardContent>
          </Card>

          {/* Today's Exam Card */}
          <Card 
            className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100"
            onClick={handleTodayExamsClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Today's Exam
              </CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 mb-1">{todayExamsCount}</div>
              <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                {todayExamsCount > 0 ? "Action required!" : "No exams today"} <ArrowRight className="w-3 h-3" />
              </p>
              {todayExamsCount > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-purple-600">
                  <Bell className="w-3 h-3 animate-pulse" />
                  <span>Prepare now</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Exams Card */}
          <Card 
            className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100"
            onClick={handleCompletedExamsClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Completed Exams
              </CardTitle>
              <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 mb-1">{completedExamsCount}</div>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                View results <ArrowRight className="w-3 h-3" />
              </p>
              <div className="mt-3 flex items-center gap-1">
                <Award className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Great progress!</span>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Card */}
          <Card 
            className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-orange-100"
            onClick={handleAttendanceClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                My Attendance
              </CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 mb-1">{attendanceReportsCount}</div>
              <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                {attendancePercentage}% attendance rate <ArrowRight className="w-3 h-3" />
              </p>
              <Progress value={attendancePercentage} className="h-1 mt-3 bg-orange-200" />
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleNotificationsClick}
                className="w-full justify-between bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 relative"
              >
                <span>View Notifications</span>
                <div className="flex items-center gap-2">
                  {unreadNotificationsCount > 0 && (
                    <Badge className="bg-white text-red-600 text-xs px-2">
                      {unreadNotificationsCount}
                    </Badge>
                  )}
                  <Bell className="w-4 h-4" />
                </div>
              </Button>
              <Button 
                onClick={handleTodayExamsClick}
                className="w-full justify-between bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
              >
                <span>View Today's Exams</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleUpcomingExamsClick}
                variant="outline" 
                className="w-full justify-between border-2 hover:bg-blue-50"
              >
                <span>Upcoming Schedule</span>
                <Calendar className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleAttendanceClick}
                variant="outline" 
                className="w-full justify-between border-2 hover:bg-orange-50"
              >
                <span>Check Attendance</span>
                <UserCheck className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Exam Statistics */}
          <Card className="border-0 shadow-lg bg-white lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Exam Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">{upcomingExamsCount}</div>
                  <p className="text-xs text-gray-600 mt-1">Upcoming</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-700">{todayExamsCount}</div>
                  <p className="text-xs text-gray-600 mt-1">Today</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">{completedExamsCount}</div>
                  <p className="text-xs text-gray-600 mt-1">Completed</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Total Exams</span>
                  <span className="text-lg font-bold text-indigo-700">
                    {upcomingExamsCount + todayExamsCount + completedExamsCount}
                  </span>
                </div>
                <Progress 
                  value={completedExamsCount > 0 ? (completedExamsCount / (upcomingExamsCount + todayExamsCount + completedExamsCount)) * 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-gray-600 mt-2">
                  {completedExamsCount > 0 
                    ? `${Math.round((completedExamsCount / (upcomingExamsCount + todayExamsCount + completedExamsCount)) * 100)}% completed`
                    : "No exams completed yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Modal */}
        {showNotificationsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                  My Notifications
                  {unreadNotificationsCount > 0 && (
                    <Badge className="bg-red-600">
                      {unreadNotificationsCount} new
                    </Badge>
                  )}
                </h2>
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-2 hover:bg-white rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <StudentNotifications 
                  studentName={studentFullName}
                  onUnreadCountChange={handleUnreadCountChange}
                />
              </div>
            </div>
          </div>
        )}

        {/* Today's Exams Modal */}
        {showTodayExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <FileText className="w-6 h-6 text-white" />
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
                      <FileText className="w-12 h-12 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Exams Today</h3>
                    <p className="text-gray-600">Enjoy your day! No exams scheduled for today.</p>
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
                          }`}>
                            {exam.status}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                            <GraduationCap className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="font-medium">Course:</span>
                            <span className="font-semibold text-purple-700">{exam.course}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">Duration:</span>
                            <span className="font-semibold text-blue-700">{exam.duration} minutes</span>
                          </div>

                          {exam.totalMarks && (
                            <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                              <Target className="w-5 h-5 text-orange-600 flex-shrink-0" />
                              <span className="font-medium">Total Marks:</span>
                              <span className="font-semibold text-orange-700">{exam.totalMarks}</span>
                            </div>
                          )}
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

        {/* Upcoming Exams Modal */}
        {showUpcomingExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  Upcoming Exams
                </h2>
                <button
                  onClick={() => setShowUpcomingExamsModal(false)}
                  className="p-2 hover:bg-white rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingUpcomingExams ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading upcoming exams...</p>
                  </div>
                ) : upcomingExams.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-12 h-12 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Exams</h3>
                    <p className="text-gray-600">You're all caught up! No exams scheduled yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingExams.map((exam) => (
                      <div
                        key={exam._id}
                        className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900 flex-1">{exam.title}</h3>
                          <Badge className="bg-blue-500">
                            {exam.status}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                            <GraduationCap className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">Course:</span>
                            <span className="font-semibold text-blue-700">{exam.course}</span>
                          </div>

                          {exam.date && (
                            <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                              <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <span className="font-medium">Date:</span>
                              <span className="font-semibold text-green-700">{new Date(exam.date).toLocaleDateString()}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                            <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="font-medium">Duration:</span>
                            <span className="font-semibold text-purple-700">{exam.duration} minutes</span>
                          </div>

                          {exam.totalMarks && (
                            <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                              <Target className="w-5 h-5 text-orange-600 flex-shrink-0" />
                              <span className="font-medium">Total Marks:</span>
                              <span className="font-semibold text-orange-700">{exam.totalMarks}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <p className="text-xs text-gray-500 font-mono">
                            Code: <span className="font-bold text-blue-700">{exam.examCode}</span>
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

        {/* Completed Exams Modal */}
        {showCompletedExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  Completed Exams
                </h2>
                <button
                  onClick={() => setShowCompletedExamsModal(false)}
                  className="p-2 hover:bg-white rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingCompletedExams ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="w-12 h-12 text-green-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading completed exams...</p>
                  </div>
                ) : completedExams.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-12 h-12 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Completed Exams</h3>
                    <p className="text-gray-600">Your completed exams will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {completedExams.map((report) => (
                      <div
                        key={report._id}
                        className="bg-gradient-to-br from-white to-green-50 border-2 border-green-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900 flex-1">{report.examType}</h3>
                          <Badge className="bg-green-500">
                            {report.status}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                            <GraduationCap className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="font-medium">Course:</span>
                            <span className="font-semibold text-green-700">{report.courseName}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">Violations:</span>
                            <span className="font-semibold text-blue-700">{report.proctoringViolationsCount}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg">
                            <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <span className="font-medium">Completed:</span>
                            <span className="font-semibold text-orange-700">{new Date(report.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-green-200">
                          <p className="text-xs text-gray-500 font-mono">
                            ID: <span className="font-bold text-green-700">{report._id.substring(0, 12)}...</span>
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

        {/* Attendance Reports Modal */}
        {showAttendanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  My Attendance Reports
                </h2>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="p-2 hover:bg-white rounded-lg transition-all duration-200"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingAttendance ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="w-12 h-12 text-orange-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading attendance reports...</p>
                  </div>
                ) : attendanceReports.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="w-12 h-12 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Attendance Records</h3>
                    <p className="text-gray-600">Your attendance records will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {attendanceReports.map((attendance) => (
                      <div
                        key={attendance._id}
                        className={`rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 ${
                          attendance.student_status === 'Present' 
                            ? 'bg-gradient-to-br from-white to-green-50 border-green-300' 
                            : 'bg-gradient-to-br from-white to-red-50 border-red-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-900 flex-1">{attendance.exam_type}</h3>
                          <Badge className={`text-sm font-bold ${
                            attendance.student_status === 'Present'
                              ? 'bg-green-600'
                              : 'bg-red-600'
                          }`}>
                            {attendance.student_status}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <GraduationCap className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <span className="font-medium">Course:</span>
                            <span className="font-semibold text-orange-700">{attendance.course_name}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">Date:</span>
                            <span className="font-semibold text-blue-700">{new Date(attendance.attendance_date).toLocaleDateString()}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Users className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="font-medium">Class Attendance:</span>
                            <span className="font-semibold text-green-700">
                              {attendance.present_count}/{attendance.total_students}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-mono">
                              ID: <span className="font-bold">{attendance._id.substring(0, 12)}...</span>
                            </p>
                            {attendance.student_status === 'Present' ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="text-xs font-semibold">Verified</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-xs font-semibold">Absent</span>
                              </div>
                            )}
                          </div>
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