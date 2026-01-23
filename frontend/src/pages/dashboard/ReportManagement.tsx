import React, { useState, useEffect, useCallback } from "react";
import {
  MonitorPlay,
  FileText,
  Users,
  Film,
  PlusCircle,
  AlertCircle,
  BookOpen,
  Wifi,
  Search,
  Calendar,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  Check,
  UserX,
  TrendingUp,
  Activity,
  Download,
  Filter,
  BarChart3,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

interface VideoReport {
  _id: string;
  examType: string;
  courseName: string;
  status: 'processing' | 'Completed' | 'error';
  createdAt: string;
  inputFilename: string;
  outputFilename: string;
  proctoringViolationsCount: number;
  totalDuration_s: number;
  riskScore?: number;
  outputUrl?: string;
  
  // --- NEW: Define the detailed summary structure ---
  processingSummary?: {
    cheating_detection_results?: {
      total_stable_persons_created?: number;
      total_violations_reported?: number;
      total_movement_incidents?: number;
      total_phone_incidents?: number;
      persons_with_movement_incident?: number;
      persons_with_phone_incident?: number;
    };
    cheating_summary?: Array<{
      stable_id: number;
      frames_tracked: number;
      last_seen_frame: number;
      // ... other per-person details
    }>;
  };
}

interface AttendanceReport {
    _id: string;
    exam_type: string;
    course_name: string;
    attendance_date: string;
    total_students: number;
    present_count: number;
    absent_count: number;
    present_students: string[];
    absent_students: string[];
    duration_seconds: number;
    createdAt: string;
}

const API_BASE_URL = "http://localhost:5001/api";

const fetchVideoReportsFromDB = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/reports`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("✗ Error fetching video reports:", error);
    throw error;
  }
};

const fetchAttendanceReportsFromDB = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/reports`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("✗ Error fetching attendance reports:", error);
      throw error;
    }
};

export default function ReportManagement() {
  const [videoReports, setVideoReports] = useState<VideoReport[]>([]);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideoReport, setSelectedVideoReport] = useState<VideoReport | null>(null);
  const [selectedAttendanceReport, setSelectedAttendanceReport] = useState<AttendanceReport | null>(null);
  const [videoDialog, setVideoDialog] = useState(false);
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [videoData, attendanceData] = await Promise.all([
        fetchVideoReportsFromDB(),
        fetchAttendanceReportsFromDB(),
      ]);
      setVideoReports(videoData);
      setAttendanceReports(attendanceData);
    } catch (error) {
      toast({
        title: "Error Loading Reports",
        description: "Failed to load reports. Make sure Flask server is running on http://localhost:5001",
        variant: "destructive",
      });
      console.error("Load error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleViewVideoReport = (report: VideoReport) => {
    setSelectedVideoReport(report);
    setVideoDialog(true);
  };
  
  const handleViewAttendanceReport = (report: AttendanceReport) => {
    setSelectedAttendanceReport(report);
    setAttendanceDialog(true);
  };

  const filteredVideoReports = videoReports.filter((report) =>
    (report.examType && report.examType.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (report.courseName && report.courseName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAttendanceReports = attendanceReports.filter((report) =>
    (report.exam_type && report.exam_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (report.course_name && report.course_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate stats
  const totalViolations = videoReports.reduce((sum, r) => sum + r.proctoringViolationsCount, 0);
  const processedReports = videoReports.filter(r => r.status === 'Completed').length;
  const totalPresent = attendanceReports.reduce((sum, r) => sum + r.present_count, 0);
  const totalAbsent = attendanceReports.reduce((sum, r) => sum + r.absent_count, 0);

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-2xl p-8">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white bg-opacity-20 text-white border-0 backdrop-blur-sm">
                Analytics Dashboard
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Report Management 📊</h1>
            <p className="text-blue-100 text-lg">View and analyze exam reports and attendance data</p>
          </div>
          <Button 
            onClick={loadReports} 
            size="lg"
            className="bg-white text-indigo-600 hover:bg-blue-50 font-semibold shadow-xl"
          >
            <Activity className="mr-2" size={20} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Video Reports</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <Film className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{videoReports.length}</div>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {processedReports} processed
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-red-50 to-red-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Violations</CardTitle>
            <div className="p-2 bg-red-500 rounded-lg group-hover:scale-110 transition-transform">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{totalViolations}</div>
            <p className="text-xs text-red-600 font-medium mt-1">Detected incidents</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Attendance Reports</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{attendanceReports.length}</div>
            <p className="text-xs text-purple-600 font-medium mt-1">
              {totalPresent} total present
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Attendance Rate</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {totalPresent + totalAbsent > 0 
                ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-green-600 font-medium mt-1">Overall attendance</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Search reports by exam type or course name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button variant="outline" className="h-12">
              <Filter className="mr-2" size={18} />
              Filter
            </Button>
           
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="video_reports" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl shadow-md border-0 grid grid-cols-2">
          <TabsTrigger 
            value="video_reports" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
          >
            <Film size={16} className="mr-2" /> 
            Video Analysis ({filteredVideoReports.length})
          </TabsTrigger>
          <TabsTrigger 
            value="attendance_reports"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
          >
            <UserCheck size={16} className="mr-2" /> 
            Attendance ({filteredAttendanceReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="video_reports">
          <VideoReportsList
            reports={filteredVideoReports}
            isLoading={isLoading}
            handleViewReport={handleViewVideoReport}
          />
        </TabsContent>

        <TabsContent value="attendance_reports">
          <AttendanceReportsList
            reports={filteredAttendanceReports}
            isLoading={isLoading}
            handleViewReport={handleViewAttendanceReport}
          />
        </TabsContent>
      </Tabs>

      <VideoReportDetailDialog
        selectedReport={selectedVideoReport}
        setReportDialog={setVideoDialog}
        reportDialog={videoDialog}
      />
      
      <AttendanceReportDetailDialog
        selectedReport={selectedAttendanceReport}
        setReportDialog={setAttendanceDialog}
        reportDialog={attendanceDialog}
      />
    </div>
  );
}

interface VideoReportsListProps {
  reports: VideoReport[];
  isLoading: boolean;
  handleViewReport: (report: VideoReport) => void;
}

const VideoReportsList: React.FC<VideoReportsListProps> = ({ reports, isLoading, handleViewReport }) => {
    if (isLoading) {
        return (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col justify-center items-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading video reports...</p>
            </CardContent>
          </Card>
        );
      }
    
      if (reports.length === 0) {
        return (
          <Card className="border-0 shadow-lg">
            <CardContent className="text-center p-16">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Film className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">No Video Reports Found</h3>
              <p className="text-gray-600 text-lg">
                No video analysis has been completed yet or none match your search.
              </p>
            </CardContent>
          </Card>
        );
      }
    
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card
              key={report._id}
              className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className={`h-2 ${
                report.status === "Completed" ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                report.status === "error" ? "bg-gradient-to-r from-red-500 to-rose-500" :
                "bg-gradient-to-r from-yellow-500 to-orange-500"
              }`}></div>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-xl font-bold text-gray-900">{report.examType}</CardTitle>
                  <Badge className={`${
                    report.status === 'Completed' ? 'bg-green-500' :
                    report.status === 'error' ? 'bg-red-500' :
                    'bg-yellow-500'
                  } text-white border-0`}>
                    {report.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-sm flex items-center gap-2 text-gray-600">
                  <BookOpen size={14} /> {report.courseName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={16} className="text-red-600" />
                      <span className="text-xs font-medium text-gray-600">Violations</span>
                    </div>
                    <div className="text-2xl font-bold text-red-700">{report.proctoringViolationsCount}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={16} className="text-blue-600" />
                      <span className="text-xs font-medium text-gray-600">Duration</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {Math.floor(report.totalDuration_s / 60)}m
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <Calendar size={14} />
                  {format(new Date(report.createdAt), 'MMM d, yyyy - h:mm a')}
                </div>
                
                <Button 
                  onClick={() => handleViewReport(report)} 
                  className="w-full h-10 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  <Eye className="mr-2" size={16} />
                  View Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      );
}

interface AttendanceReportsListProps {
    reports: AttendanceReport[];
    isLoading: boolean;
    handleViewReport: (report: AttendanceReport) => void;
}

const AttendanceReportsList: React.FC<AttendanceReportsListProps> = ({ reports, isLoading, handleViewReport }) => {
    if (isLoading) {
        return (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col justify-center items-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading attendance reports...</p>
            </CardContent>
          </Card>
        );
      }
    
      if (reports.length === 0) {
        return (
          <Card className="border-0 shadow-lg">
            <CardContent className="text-center p-16">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">No Attendance Reports Found</h3>
              <p className="text-gray-600 text-lg">
                No attendance reports have been generated yet or none match your search.
              </p>
            </CardContent>
          </Card>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const attendanceRate = report.total_students > 0 
              ? Math.round((report.present_count / report.total_students) * 100) 
              : 0;
            
            return (
              <Card
                key={report._id}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl font-bold text-gray-900">{report.exam_type}</CardTitle>
                    <Badge className="bg-purple-500 text-white border-0">
                      ATTENDANCE
                    </Badge>
                  </div>
                  <CardDescription className="text-sm flex items-center gap-2 text-gray-600">
                    <BookOpen size={14} /> {report.course_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Attendance Rate</span>
                      <span className="font-bold text-purple-700">{attendanceRate}%</span>
                    </div>
                    <Progress value={attendanceRate} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                      <Users size={16} className="text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-700">{report.total_students}</div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
                      <CheckCircle size={16} className="text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-700">{report.present_count}</div>
                      <div className="text-xs text-gray-600">Present</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center border border-red-200">
                      <XCircle size={16} className="text-red-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-red-700">{report.absent_count}</div>
                      <div className="text-xs text-gray-600">Absent</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <Calendar size={14} />
                    {format(new Date(report.attendance_date), 'MMM d, yyyy')}
                  </div>
                  
                  <Button 
                    onClick={() => handleViewReport(report)}
                    className="w-full h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Eye className="mr-2" size={16} />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
}

interface AttendanceReportDetailDialogProps {
    selectedReport: AttendanceReport | null;
    setReportDialog: (open: boolean) => void;
    reportDialog: boolean;
}

const AttendanceReportDetailDialog: React.FC<AttendanceReportDetailDialogProps> = ({ selectedReport, setReportDialog, reportDialog }) => {
    if (!selectedReport) return null;

    const attendanceRate = selectedReport.total_students > 0 
      ? Math.round((selectedReport.present_count / selectedReport.total_students) * 100) 
      : 0;

    const StudentList = ({ students, type }: { students: string[]; type: 'present' | 'absent' }) => (
        <div className={`rounded-xl h-full overflow-hidden border-2 ${
          type === 'present' ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'border-red-300 bg-gradient-to-br from-red-50 to-rose-50'
        }`}>
            <div className={`p-4 ${type === 'present' ? 'bg-green-500' : 'bg-red-500'}`}>
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  {type === 'present' ? <CheckCircle size={20} /> : <UserX size={20} />}
                  {type === 'present' ? `Present Students (${students.length})` : `Absent Students (${students.length})`}
              </h4>
            </div>
            <div className="p-4">
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {students.length > 0 ? (
                      students.map((studentName, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-white shadow-sm border hover:shadow-md transition-shadow">
                              {type === 'present' 
                                  ? <div className="p-1 bg-green-100 rounded-full"><Check size={14} className="text-green-600" /></div>
                                  : <div className="p-1 bg-red-100 rounded-full"><UserX size={14} className="text-red-600" /></div>
                              }
                              <span className="text-sm font-medium text-gray-800">{studentName || 'N/A'}</span>
                          </div>
                      ))
                  ) : (
                      <p className="text-sm text-gray-500 italic text-center py-8">No students listed as {type}.</p>
                  )}
              </div>
            </div>
        </div>
    );

    return (
        <Dialog open={reportDialog} onOpenChange={setReportDialog}>
            <DialogContent className="sm:max-w-[1100px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                          <UserCheck size={24} className="text-white" />
                        </div>
                        <div>
                          <div className="text-purple-700">Attendance Report</div>
                          <div className="text-base font-normal text-gray-600">{selectedReport.exam_type}</div>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                      <CardContent className="p-4 text-center">
                        <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">Course</div>
                        <div className="text-base font-bold text-gray-900">{selectedReport.course_name}</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">Total Students</div>
                        <div className="text-2xl font-bold text-blue-700">{selectedReport.total_students}</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                      <CardContent className="p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">Present</div>
                        <div className="text-2xl font-bold text-green-700">{selectedReport.present_count}</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
                      <CardContent className="p-4 text-center">
                        <UserX className="w-8 h-8 text-red-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">Absent</div>
                        <div className="text-2xl font-bold text-red-700">{selectedReport.absent_count}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Attendance Rate Progress */}
                  <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600" />
                          <span className="text-sm font-bold text-gray-700">Overall Attendance Rate</span>
                        </div>
                        <span className="text-2xl font-bold text-indigo-700">{attendanceRate}%</span>
                      </div>
                      <Progress value={attendanceRate} className="h-3" />
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                        <span>{selectedReport.present_count} present</span>
                        <span>{selectedReport.absent_count} absent</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-0 shadow-md">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-gray-700">Exam Date:</span>
                          <span className="text-gray-900">{format(new Date(selectedReport.attendance_date), 'MMMM d, yyyy')}</span>
                        </div>
                        
                      </CardContent>
                    </Card>
                    
                    <Card className="border-0 shadow-md">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-gray-700">Report ID:</span>
                          <span className="text-gray-900 font-mono text-xs">{selectedReport._id.substring(0, 12)}...</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-700">Status:</span>
                          <Badge className="bg-green-500 text-white border-0">Completed</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  {/* Student Lists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <StudentList students={selectedReport.present_students || []} type="present" />
                      <StudentList students={selectedReport.absent_students || []} type="absent" />
                  </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setReportDialog(false)} className="h-11">
                        Close
                    </Button>
                    
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface VideoReportDetailDialogProps {
    selectedReport: VideoReport | null;
    setReportDialog: (open: boolean) => void;
    reportDialog: boolean;
}

const VideoReportDetailDialog: React.FC<VideoReportDetailDialogProps> = ({ selectedReport, setReportDialog, reportDialog }) => {
    if (!selectedReport) return null;

    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    const handleDownloadVideo = async () => {
      if (!selectedReport.outputUrl) return;
      
      try {
        const response = await fetch(selectedReport.outputUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport.examType}_${selectedReport.courseName}_processed.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback to opening in new tab if download fails
        window.open(selectedReport.outputUrl, '_blank');
      }
    };

    return (
        <Dialog open={reportDialog} onOpenChange={setReportDialog}>
            <DialogContent className="sm:max-w-[1000px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                          <Film size={24} className="text-white" />
                        </div>
                        <div>
                          <div className="text-blue-700">Video Analysis Report</div>
                          <div className="text-base font-normal text-gray-600">{selectedReport.examType}</div>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Status Banner */}
                  <Card className={`border-2 ${
                    selectedReport.status === 'Completed' 
                      ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50' 
                      : 'border-red-300 bg-gradient-to-r from-red-50 to-rose-50'
                  }`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedReport.status === 'Completed' ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : (
                          <AlertCircle className="w-8 h-8 text-red-600" />
                        )}
                        <div>
                          <div className="font-bold text-lg text-gray-900">
                            {selectedReport.status === 'Completed' ? 'Successfully Processed' : 'Processing Error'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedReport.status === 'Completed' 
                              ? 'Video analysis completed and report generated' 
                              : 'An error occurred during video processing'
                            }
                          </div>
                        </div>
                      </div>
                      <Badge className={`${
                        selectedReport.status === 'Completed' ? 'bg-green-500' : 'bg-red-500'
                      } text-white border-0 text-sm px-4 py-2`}>
                        {selectedReport.status.toUpperCase()}
                      </Badge>
                    </CardContent>
                  </Card>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
                      <CardContent className="p-5 text-center">
                        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">Total Violations</div>
                        <div className="text-3xl font-bold text-red-700">
                          {selectedReport.processingSummary?.cheating_detection_results?.total_violations_reported ?? selectedReport.proctoringViolationsCount}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                      <CardContent className="p-5 text-center">
                        <Activity className="w-10 h-10 text-orange-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">Movement Incidents</div>
                        <div className="text-3xl font-bold text-orange-700">
                          {selectedReport.processingSummary?.cheating_detection_results?.total_movement_incidents ?? 'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                      <CardContent className="p-5 text-center">
                        <MonitorPlay className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 mb-1">Phone Incidents</div>
                        <div className="text-3xl font-bold text-purple-700">
                           {selectedReport.processingSummary?.cheating_detection_results?.total_phone_incidents ?? 'N/A'}
                        </div>
                      </CardContent>
                    </Card>

                    
                  </div>

                  {/* Exam Information */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        Exam Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-medium">Exam Type</div>
                            <div className="text-sm font-semibold text-gray-900">{selectedReport.examType}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <BookOpen className="w-5 h-5 text-indigo-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-medium">Course Name</div>
                            <div className="text-sm font-semibold text-gray-900">{selectedReport.courseName}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <Film className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-medium">Input File</div>
                            <div className="text-sm font-semibold text-gray-900 break-words">{selectedReport.inputFilename}</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-medium">Created At</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {format(new Date(selectedReport.createdAt), 'MMMM d, yyyy, h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-medium">Report ID</div>
                            <div className="text-xs font-mono text-gray-900 break-all">{selectedReport._id}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <Activity className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 font-medium">Processing Status</div>
                            <Badge className={`${
                              selectedReport.status === 'Completed' ? 'bg-green-500' : 'bg-red-500'
                            } text-white border-0 mt-1`}>
                              {selectedReport.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Processed Video Download/View */}
                  {selectedReport.status === 'Completed' && selectedReport.outputUrl && (
                    <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-green-500 rounded-lg">
                            <Download className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-lg text-gray-900 mb-2">Processed Video Available</div>
                            <p className="text-sm text-gray-600 mb-4">
                              The processed video with proctoring overlays and violation markers is ready to view or download
                            </p>
                            <div className="flex gap-3">
                              <a 
                                href={selectedReport.outputUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                              >
                                <Eye size={16} />
                                View Video
                              </a>
                              
                              {/* ===== FIX APPLIED HERE ===== */}
                              <button 
                                onClick={handleDownloadVideo}
                                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                              >
                                <Download size={16} />
                                Download Video
                              </button>
                              
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Violation Summary */}
                  {(selectedReport.proctoringViolationsCount > 0 || selectedReport.processingSummary?.cheating_detection_results?.total_violations_reported ?? 0 > 0) && (
                    <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                          <AlertCircle className="w-5 h-5" />
                          Violation Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                            <span className="text-sm font-medium text-gray-700">Total Violations Reported</span>
                            <Badge className="bg-red-600 text-white text-base px-3 py-1">
                              {selectedReport.processingSummary?.cheating_detection_results?.total_violations_reported ?? selectedReport.proctoringViolationsCount}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-700">Movement Incidents</span>
                              <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                                {selectedReport.processingSummary?.cheating_detection_results?.total_movement_incidents ?? 0}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-700">Phone Incidents</span>
                              <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
                                {selectedReport.processingSummary?.cheating_detection_results?.total_phone_incidents ?? 0}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-600 mt-2">
                            Review the processed video to see detailed timestamps and types of violations detected during the exam.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                  }
                  {/* --- NEW AUDIO TRANSCRIPTION SECTION --- */}
                  {selectedReport.processingSummary?.cheating_detection_results?.audio_transcription && (
                    <Card className="mt-4 border-orange-200">
                      <CardHeader className="pb-2 bg-orange-50">
                        <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                          <Wifi className="w-4 h-4" /> {/* You can import Mic icon instead if preferred */}
                          Audio Transcription Log
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {selectedReport.processingSummary.cheating_detection_results.audio_transcription.length > 0 ? (
                            selectedReport.processingSummary.cheating_detection_results.audio_transcription.map((line: string, index: number) => (
                              <p key={index} className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                                <span className="font-mono text-gray-400 mr-2">[{index + 1}]</span>
                                {line}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500 italic">No speech detected in this session.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setReportDialog(false)} className="h-11">
                        Close
                    </Button>
                   
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}