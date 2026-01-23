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
  BarChart3,
  ArrowRight,
  CheckCircle,
  UserCheck,
  Send,
  ClipboardList,
  Hash,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import SendNotificationModal from "@/components/SendNotificationModal";

// --- Interfaces ---
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
}

interface VideoReport {
  _id: string;
  examType: string;
  courseName: string;
  status: string;
  createdAt: string;
  proctoringViolationsCount: number;
  outputUrl?: string;
}

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const { connected } = useSocket();

  // 1. Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [examsTodayCount, setExamsTodayCount] = useState(0);

  // 2. Modals & Data Lists State
  const [showTodayExamsModal, setShowTodayExamsModal] = useState(false);
  const [todayExams, setTodayExams] = useState<ExamData[]>([]);
  const [loadingTodayExams, setLoadingTodayExams] = useState(false);

  const [showAIReportsModal, setShowAIReportsModal] = useState(false);
  const [reports, setReports] = useState<VideoReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // 3. Manual Cheating Form State
  const [manualFormData, setManualFormData] = useState({
    studentName: "",
    examType: "Final Exam",
    courseName: "",
    cheatingStatus: "Suspicious",
    details: "",
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [formFeedback, setFormFeedback] = useState({ type: "", text: "" });

  // 4. SendNotificationModal State
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedAIReport, setSelectedAIReport] = useState<VideoReport | null>(null);
  const [aiStudentNameInput, setAiStudentNameInput] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchCoreData();
  }, [token]);

  const fetchCoreData = async () => {
    try {
      setLoading(true);
      const [statsRes, countRes, todayCountRes, reportsRes] = await Promise.all([
        fetch("http://localhost:5000/api/dashboard/stats", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:5001/api/students/count"),
        fetch("http://localhost:5001/api/exams/today"),
        fetch("http://localhost:5001/api/ai/reports")
      ]);

      if (statsRes.ok) setStats((await statsRes.json()).data.overview);
      if (countRes.ok) setTotalStudentsCount((await countRes.json()).count);
      if (todayCountRes.ok) setExamsTodayCount((await todayCountRes.json()).count);
      if (reportsRes.ok) setReports((await reportsRes.json()).data || []);
      
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  async function fetchTodayExamsDetails() {
    setShowTodayExamsModal(true);
    setLoadingTodayExams(true);
    try {
      const res = await fetch("http://localhost:5001/api/exams/today");
      if (res.ok) {
        const data = await res.json();
        setTodayExams(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoadingTodayExams(false);
    }
  }

  const handleManualFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    setFormFeedback({ type: "", text: "" });

    try {
      const response = await fetch("http://localhost:5001/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: manualFormData.studentName,
          examType: manualFormData.examType,
          courseName: manualFormData.courseName,
          cheatingDetails: `${manualFormData.cheatingStatus}: ${manualFormData.details}`,
        }),
      });

      if (response.ok) {
        setFormFeedback({ type: "success", text: "Manual report sent successfully!" });
        setManualFormData({ studentName: "", examType: "Final Exam", courseName: "", cheatingStatus: "Suspicious", details: "" });
      } else {
        setFormFeedback({ type: "error", text: "Failed to send report." });
      }
    } catch (err) {
      setFormFeedback({ type: "error", text: "Server connection error." });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  if (loading) return <DashboardLayout title="Admin"><LoadingSpinner size="lg" /></DashboardLayout>;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8 pb-10">
        
        {/* HERO SECTION */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">Hello, {user?.firstName}! 👋</h1>
            <p className="text-purple-100 text-lg">Manage exams and monitor student integrity from one place.</p>
            <div className="flex gap-4 mt-6">
              <Badge className="bg-white/20 backdrop-blur-md border-0 text-white px-4 py-1">
                System: {connected ? "Live" : "Disconnected"}
              </Badge>
              <Badge className="bg-white/20 backdrop-blur-md border-0 text-white px-4 py-1">
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </div>
          <Shield className="absolute right-[-20px] top-[-20px] w-64 h-64 opacity-10" />
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-0 shadow-sm group hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-blue-600 uppercase">Total Students</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{totalStudentsCount}</div>
              <Progress value={85} className="h-1 mt-3 bg-blue-200" />
            </CardContent>
          </Card>

          <Card onClick={fetchTodayExamsDetails} className="bg-green-50 border-0 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-green-600 uppercase">Exams Today</CardTitle>
              <BookOpen className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{examsTodayCount}</div>
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">Click for details <ArrowRight size={12}/></p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-purple-600 uppercase">Live Sessions</CardTitle>
              <Activity className="h-5 w-5 text-purple-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats?.ongoingSessions || 0}</div>
              <p className="text-xs text-purple-500 mt-2">Proctoring active</p>
            </CardContent>
          </Card>

          <Card onClick={() => setShowAIReportsModal(true)} className="bg-red-50 border-0 shadow-sm cursor-pointer hover:bg-red-100 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-red-600 uppercase">AI Alerts</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">{reports.length}</div>
              <p className="text-xs text-red-600 mt-2">Detected violations</p>
            </CardContent>
          </Card>
        </div>

        {/* FORMS & SUMMARIES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* MANUAL CHEATING FORM */}
          <Card className="shadow-lg border-2 border-gray-50">
            <CardHeader className="bg-gray-50/50 border-b">
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <ClipboardList className="w-5 h-5" /> Cheating Report Form
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleManualFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Student Name</label>
                    <input
                      required
                      placeholder="e.g. Ali Khan"
                      className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={manualFormData.studentName}
                      onChange={e => setManualFormData({...manualFormData, studentName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Course</label>
                    <input
                      required
                      placeholder="e.g. Physics"
                      className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={manualFormData.courseName}
                      onChange={e => setManualFormData({...manualFormData, courseName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Exam Type</label>
                    <select className="w-full border rounded-lg p-2.5" value={manualFormData.examType} onChange={e => setManualFormData({...manualFormData, examType: e.target.value})}>
                      <option>Final Exam</option><option>Mid Term</option><option>Quiz</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">Status</label>
                    <select className="w-full border rounded-lg p-2.5 bg-red-50 text-red-700 font-bold" value={manualFormData.cheatingStatus} onChange={e => setManualFormData({...manualFormData, cheatingStatus: e.target.value})}>
                      <option>Suspicious</option><option>Confirmed Cheating</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                   <textarea rows={2} placeholder="Violation details..." className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" value={manualFormData.details} onChange={e => setManualFormData({...manualFormData, details: e.target.value})} />
                </div>
                {formFeedback.text && <Alert className={formFeedback.type === 'success' ? 'bg-green-50' : 'bg-red-50'}><AlertDescription>{formFeedback.text}</AlertDescription></Alert>}
                <Button type="submit" disabled={isSubmittingManual} className="w-full bg-indigo-600 hover:bg-indigo-700 py-6">
                  {isSubmittingManual ? <Loader className="animate-spin mr-2"/> : <Send size={18} className="mr-2"/>}
                  Send Alert Notification
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* AI SUMMARY PREVIEW */}
          <Card className="shadow-lg border-2 border-gray-50 overflow-hidden">
            <CardHeader className="bg-red-50/50 border-b">
              <CardTitle className="flex items-center gap-2 text-red-700"><Target className="w-5 h-5" /> Recent AI Violations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y max-h-[350px] overflow-y-auto">
                 {reports.slice(0, 5).map(report => (
                   <div key={report._id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                     <div><h4 className="font-bold">{report.courseName}</h4><p className="text-xs text-gray-500">{report.examType} • {report.proctoringViolationsCount} Flags</p></div>
                     <Button variant="outline" size="sm" onClick={() => setShowAIReportsModal(true)}>Details</Button>
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>
        </div>

        {/* --- MODAL: TODAY'S EXAMS (COMPLETE INFO) --- */}
        {showTodayExamsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-green-600 text-white">
                  <h2 className="text-2xl font-bold flex items-center gap-3"><Calendar /> Today's Complete Schedule</h2>
                  <button onClick={() => setShowTodayExamsModal(false)}><X size={28}/></button>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                   {loadingTodayExams ? (
                     <div className="flex flex-col items-center py-20"><Loader className="animate-spin text-green-600" size={40}/><p className="mt-2 font-medium">Loading exam details...</p></div>
                   ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {todayExams.length > 0 ? todayExams.map(exam => (
                         <div key={exam._id} className="bg-white border-2 border-green-100 rounded-2xl p-6 shadow-sm hover:border-green-300 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                               <div>
                                 <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                                 <p className="text-green-600 font-semibold text-sm flex items-center gap-1"><GraduationCap size={16}/> {exam.course}</p>
                               </div>
                               <Badge className={`${exam.status === 'Active' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}>{exam.status}</Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-6">
                               <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Clock size={18}/></div>
                                  <div><p className="text-[10px] uppercase font-bold text-gray-400">Duration</p><p className="text-sm font-bold">{exam.duration} Minutes</p></div>
                               </div>
                               <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Users size={18}/></div>
                                  <div><p className="text-[10px] uppercase font-bold text-gray-400">Students</p><p className="text-sm font-bold">{exam.students} Registered</p></div>
                               </div>
                               <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Hash size={18}/></div>
                                  <div><p className="text-[10px] uppercase font-bold text-gray-400">Questions</p><p className="text-sm font-bold">{exam.questions} Items</p></div>
                               </div>
                               <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                  <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Info size={18}/></div>
                                  <div><p className="text-[10px] uppercase font-bold text-gray-400">ID</p><p className="text-[10px] font-mono font-bold truncate w-20">{exam._id}</p></div>
                               </div>
                            </div>
                         </div>
                       )) : (
                         <div className="col-span-2 text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                            <BookOpen size={48} className="mx-auto text-gray-300 mb-2"/>
                            <p className="text-gray-500 font-medium">No exams scheduled for today</p>
                         </div>
                       )}
                    </div>
                   )}
                </div>
            </div>
          </div>
        )}

        {/* --- MODAL: AI REPORTS --- */}
        {showAIReportsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 bg-red-600 text-white flex justify-between items-center">
                   <h2 className="text-2xl font-bold flex items-center gap-2"><Shield/> Evidence Center</h2>
                   <button onClick={() => setShowAIReportsModal(false)}><X size={28}/></button>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-4">
                   {reports.map(report => (
                     <div key={report._id} className="bg-white p-5 rounded-xl border-2 border-red-100 flex flex-col md:flex-row justify-between gap-4">
                        <div>
                           <h4 className="text-lg font-bold">{report.courseName}</h4>
                           <p className="text-sm text-gray-500">{report.examType} • Captured {new Date(report.createdAt).toLocaleString()}</p>
                           <Badge className="mt-2 bg-red-100 text-red-700">{report.proctoringViolationsCount} Violations Found</Badge>
                        </div>
                        <div className="flex items-end gap-2">
                           <input className="border rounded-lg px-3 py-2 text-sm md:w-48" placeholder="Student Name" onChange={(e) => setAiStudentNameInput({...aiStudentNameInput, [report._id]: e.target.value})}/>
                           <Button className="bg-red-600 hover:bg-red-700" onClick={() => {
                              if(!aiStudentNameInput[report._id]) return alert("Enter student name");
                              setSelectedAIReport(report);
                              setShowNotificationModal(true);
                           }}><Send size={16} className="mr-2"/> Alert</Button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* --- NOTIFICATION MODAL --- */}
        {showNotificationModal && selectedAIReport && (
          <SendNotificationModal
            isOpen={showNotificationModal}
            onClose={() => setShowNotificationModal(false)}
            reportData={selectedAIReport}
            studentName={aiStudentNameInput[selectedAIReport._id] || ""}
          />
        )}
      </div>
    </DashboardLayout>
  );
}