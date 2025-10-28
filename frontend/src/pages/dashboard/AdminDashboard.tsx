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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  
  // Today's exams modal
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

  // Fetch total students count from attendance collection
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

  // Fetch today's exams count
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
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-blue-100 mt-1">
                
              </p>
            </div>
            
          </div>
          <div className="flex items-center mt-4 space-x-4">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  connected ? "bg-green-300" : "bg-red-300"
                }`}
              />
              <span className="text-sm">
                System Status: {connected ? "Online" : "Offline"}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalStudentsCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered in system
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-blue-50"
            onClick={handleExamsTodayClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Exams Today
              </CardTitle>
              <BookOpen className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {examsTodayCount}
              </div>
              <p className="text-xs text-blue-600 font-medium">
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
                  <Calendar className="w-6 h-6 text-green-600" />
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
                    <Loader className="w-12 h-12 text-green-600 animate-spin" />
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
                            <GraduationCap className="w-4 h-4 text-green-600" />
                            <span className="font-medium">Course:</span>
                            <span>{exam.course}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">Duration:</span>
                            <span>{exam.duration} minutes</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Users className="w-4 h-4 text-purple-600" />
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
      </div>
    </DashboardLayout>
  );
}