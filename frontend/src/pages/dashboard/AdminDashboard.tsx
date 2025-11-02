import { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  Shield,
  AlertTriangle,
  Eye,
  Clock,
  X,
  Calendar,
  GraduationCap,
  FileText,
  Target,
  Loader,
  Activity,
  TrendingUp,
  Award,
  BarChart3,
  ArrowRight,
  CheckCircle,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DashboardStats {
  totalStudents: number;
  totalExams: number;
  activeExams: number;
  completedExamsToday: number;
  ongoingSessions: number;
  totalViolationsToday: number;
  verifiedStudents: number;
  pendingVerifications: number;
}

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

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { connected, liveData, violations } = useSocket();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [examsTodayCount, setExamsTodayCount] = useState(0);
  
  const [showTodayExamsModal, setShowTodayExamsModal] = useState(false);
  const [todayExams, setTodayExams] = useState<ExamData[]>([]);
  const [loadingTodayExams, setLoadingTodayExams] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchTotalStudentsCount();
    fetchExamsTodayCount();
  }, [token]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/dashboard/stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.overview);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalStudentsCount = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/students/count");
      if (response.ok) {
        const data = await response.json();
        setTotalStudentsCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching total students count:", error);
    }
  };

  const fetchExamsTodayCount = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/exams/today");
      if (response.ok) {
        const data = await response.json();
        setExamsTodayCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching today's exams count:", error);
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

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8">
        {/* Hero Admin Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-black opacity-5"></div>
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <Badge className="bg-white bg-opacity-20 text-white border-0 backdrop-blur-sm">
                    Administrator
                  </Badge>
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Welcome back, {user?.firstName}! 👋
                </h1>
                <p className="text-purple-100 text-lg">
                  Monitor and manage your examination system
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center w-24 h-24 bg-white bg-opacity-20 rounded-full backdrop-blur-sm">
                <BarChart3 className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-white">
              <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected ? "bg-green-300 animate-pulse" : "bg-red-300"
                  }`}
                />
                <span className="text-sm font-medium">
                  System: {connected ? "Online" : "Offline"}
                </span>
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
                <span className="text-sm font-medium">All Systems Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Students Card */}
          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Total Students
              </CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 mb-1">
                {totalStudentsCount}
              </div>
              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                Registered in system <UserCheck className="w-3 h-3" />
              </p>
              <Progress value={75} className="h-1 mt-3 bg-blue-200" />
            </CardContent>
          </Card>

          {/* Exams Today Card */}
          <Card 
            className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-emerald-100"
            onClick={handleExamsTodayClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Exams Today
              </CardTitle>
              <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 mb-1">
                {examsTodayCount}
              </div>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                Click to view details <ArrowRight className="w-3 h-3" />
              </p>
              {examsTodayCount > 0 && (
                <div className="mt-3 flex items-center gap-1">
                  <Activity className="w-4 h-4 text-green-600 animate-pulse" />
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Monitoring Card */}
          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Active Monitoring
              </CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                <Eye className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700 mb-1">
                {stats?.ongoingSessions || 0}
              </div>
              <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                Live proctoring sessions <Activity className="w-3 h-3" />
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-600 font-medium">Real-time monitoring</span>
              </div>
            </CardContent>
          </Card>

          {/* System Health Card */}
          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-amber-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">
                System Health
              </CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 mb-1">
                {connected ? "100%" : "0%"}
              </div>
              <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                All services operational <CheckCircle className="w-3 h-3" />
              </p>
              <Progress value={connected ? 100 : 0} className="h-1 mt-3 bg-orange-200" />
            </CardContent>
          </Card>
        </div>

        {/* Management Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions Panel */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleExamsTodayClick}
                className="w-full justify-between bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
              >
                <span>View Today's Exams</span>
                <BookOpen className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between border-2 hover:bg-blue-50"
              >
                <span>Manage Students</span>
                <Users className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between border-2 hover:bg-green-50"
              >
                <span>View Reports</span>
                <FileText className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between border-2 hover:bg-orange-50"
              >
                <span>System Settings</span>
                <Shield className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* System Overview */}
          <Card className="border-0 shadow-lg bg-white lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">{totalStudentsCount}</div>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Students</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">{examsTodayCount}</div>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Today</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <Activity className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-700">{stats?.ongoingSessions || 0}</div>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Active</p>
                </div>
              </div>
              
              <div className="mt-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-bold text-gray-700">System Performance</span>
                  </div>
                  <span className="text-lg font-bold text-indigo-700">
                    {connected ? "Excellent" : "Offline"}
                  </span>
                </div>
                <Progress 
                  value={connected ? 95 : 0} 
                  className="h-2 mb-2"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">All services running smoothly</span>
                  <span className="text-indigo-600 font-semibold">{connected ? "95%" : "0%"} uptime</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">System Online</p>
                    <p className="text-xs text-gray-600">All services operational</p>
                  </div>
                  <span className="text-xs text-gray-500">Now</span>
                </div>
                
                {examsTodayCount > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Exams Scheduled</p>
                      <p className="text-xs text-gray-600">{examsTodayCount} exam(s) today</p>
                    </div>
                    <span className="text-xs text-gray-500">Today</span>
                  </div>
                )}
                
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Students Registered</p>
                    <p className="text-xs text-gray-600">{totalStudentsCount} total students</p>
                  </div>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Database Connection</p>
                    <p className="text-xs text-gray-600">Connected and operational</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0">Active</Badge>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">AI Proctoring System</p>
                    <p className="text-xs text-gray-600">Ready for monitoring</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0">Ready</Badge>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Real-time Monitoring</p>
                    <p className="text-xs text-gray-600">{stats?.ongoingSessions || 0} active sessions</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0">Live</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Exams Modal */}
        {showTodayExamsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
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
                    <Loader className="w-12 h-12 text-green-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading today's exams...</p>
                  </div>
                ) : todayExams.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-12 h-12 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Exams Today</h3>
                    <p className="text-gray-600">No exams are scheduled for today.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {todayExams.map((exam) => (
                      <div
                        key={exam._id}
                        className="bg-gradient-to-br from-white to-green-50 border-2 border-green-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
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
                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <GraduationCap className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="font-medium">Course:</span>
                            <span className="font-semibold text-green-700">{exam.course}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">Duration:</span>
                            <span className="font-semibold text-blue-700">{exam.duration} minutes</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Users className="w-5 h-5 text-purple-600 flex-shrink-0" />
                            <span className="font-medium">Students:</span>
                            <span className="font-semibold text-purple-700">{exam.students}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                            <Target className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <span className="font-medium">Total Marks:</span>
                            <span className="font-semibold text-orange-700">{exam.totalMarks}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-green-200">
                          <p className="text-xs text-gray-500 font-mono">
                            Code: <span className="font-bold text-green-700">{exam.examCode}</span>
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