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
  XCircle, // Added for absent status
  Check, // Added for present list item
  UserX, // Added for absent list item
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
import { Separator } from "@/components/ui/separator"; // Added Separator

// =================================================================
// TYPE DEFINITIONS
// =================================================================

interface VideoReport {
  _id: string;
  examType: string;
  courseName: string;
  status: 'processing' | 'processed' | 'error';
  createdAt: string;
  videoTitle: string;
  proctoringViolationsCount: number;
  totalDuration_s: number;
  riskScore?: number;
  outputUrl?: string;
}

// Keys match the snake_case used in mongodb_manager.py
interface AttendanceReport {
    _id: string;
    exam_type: string;
    course_name: string;
    attendance_date: string;
    total_students: number;
    present_count: number;
    absent_count: number;
    present_students: string[]; // FIX: Changed type to string[]
    absent_students: string[]; // FIX: Changed type to string[]
    duration_seconds: number;
    createdAt: string;
}

// =================================================================
// API INTEGRATION - CALLS FLASK BACKEND
// =================================================================

const API_BASE_URL = "http://localhost:5001/api";

/**
 * Fetch all video reports from MongoDB via Flask API
 */
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

/**
 * Fetch all attendance reports from MongoDB via Flask API
 */
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

// =================================================================
// COMPONENTS
// =================================================================

export default function ReportManagement() {
  const [videoReports, setVideoReports] = useState<VideoReport[]>([]);
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideoReport, setSelectedVideoReport] = useState<VideoReport | null>(null);
  const [selectedAttendanceReport, setSelectedAttendanceReport] = useState<AttendanceReport | null>(null); // NEW STATE
  const [videoDialog, setVideoDialog] = useState(false);
  const [attendanceDialog, setAttendanceDialog] = useState(false); // NEW STATE
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
  
  // NEW HANDLER
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800">Report Management 📊</h1>
        <Button onClick={loadReports} variant="outline">
          <MonitorPlay size={18} className="mr-2" /> Refresh Reports
        </Button>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <Search className="h-5 w-5 text-gray-500" />
        <Input
          placeholder="Search by Exam Type or Course Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Tabs defaultValue="video_reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video_reports" className="flex items-center gap-2">
                <Film size={16} /> Video Reports
            </TabsTrigger>
            <TabsTrigger value="attendance_reports" className="flex items-center gap-2">
                <UserCheck size={16} /> Attendance Reports
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
                handleViewReport={handleViewAttendanceReport} // Passed handler
            />
        </TabsContent>
      </Tabs>


      {/* Video Report Detail Dialog */}
      <VideoReportDetailDialog
        selectedReport={selectedVideoReport}
        setReportDialog={setVideoDialog}
        reportDialog={videoDialog}
      />
      
      {/* Attendance Report Detail Dialog (NEW) */}
      <AttendanceReportDetailDialog
        selectedReport={selectedAttendanceReport}
        setReportDialog={setAttendanceDialog}
        reportDialog={attendanceDialog}
      />
    </div>
  );
}

// =================================================================
// VIDEO REPORTS LIST COMPONENT
// =================================================================

interface VideoReportsListProps {
  reports: VideoReport[];
  isLoading: boolean;
  handleViewReport: (report: VideoReport) => void;
}

const VideoReportsList: React.FC<VideoReportsListProps> = ({ reports, isLoading, handleViewReport }) => {
    if (isLoading) {
        return (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-gray-500">Loading video reports...</p>
          </div>
        );
      }
    
      if (reports.length === 0) {
        return (
          <div className="text-center p-10 border rounded-xl shadow-sm bg-white">
            <Film className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Video Reports Found</h3>
            <p className="text-gray-500">
                Looks like no video analysis has been completed yet or none match your search criteria.
            </p>
          </div>
        );
      }
    
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {reports.map((report) => (
            <Card
              key={report._id}
              className={`hover:shadow-lg transition-shadow border-t-4 ${
                report.status === "processed"
                  ? "border-green-500"
                  : report.status === "error"
                  ? "border-red-500"
                  : "border-yellow-500"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold truncate pr-4">{report.examType}</CardTitle>
                  <Badge variant={report.status === 'processed' ? 'default' : report.status === 'error' ? 'destructive' : 'secondary'}>
                    {report.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-sm flex items-center gap-1 text-gray-600 pt-1">
                    <BookOpen size={14} /> {report.courseName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailItem 
                    label="Violations Detected" 
                    value={report.proctoringViolationsCount} 
                    icon={<AlertCircle size={16} className="text-red-500" />}
                />
                <DetailItem 
                    label="Duration" 
                    value={`${(report.totalDuration_s / 60).toFixed(1)} minutes`} 
                    icon={<Clock size={16} className="text-blue-500" />}
                />
                <DetailItem 
                    label="Date Created" 
                    value={format(new Date(report.createdAt), 'MMM d, yyyy - h:mm a')} 
                    icon={<Calendar size={16} className="text-gray-500" />}
                />
                <div className="pt-3">
                    <Button 
                        onClick={() => handleViewReport(report)} 
                        className="w-full"
                        disabled={report.status !== 'processed'}
                    >
                        View Details
                    </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
}

// =================================================================
// ATTENDANCE REPORTS LIST COMPONENT
// =================================================================

interface AttendanceReportsListProps {
    reports: AttendanceReport[];
    isLoading: boolean;
    handleViewReport: (report: AttendanceReport) => void; // Added handler
}

const AttendanceReportsList: React.FC<AttendanceReportsListProps> = ({ reports, isLoading, handleViewReport }) => {
    if (isLoading) {
        return (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
            <p className="ml-4 text-gray-500">Loading attendance reports...</p>
          </div>
        );
      }
    
      if (reports.length === 0) {
        return (
          <div className="text-center p-10 border rounded-xl shadow-sm bg-white">
            <UserCheck className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Attendance Reports Found</h3>
            <p className="text-gray-500">
                No attendance reports have been generated yet or none match your search criteria.
            </p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {reports.map((report) => (
            <Card
              key={report._id}
              className="hover:shadow-lg transition-shadow border-t-4 border-purple-500"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold truncate pr-4">{report.exam_type}</CardTitle>
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                    ATTENDANCE
                  </Badge>
                </div>
                <CardDescription className="text-sm flex items-center gap-1 text-gray-600 pt-1">
                    <BookOpen size={14} /> {report.course_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailItem 
                    label="Exam Date" 
                    value={format(new Date(report.attendance_date), 'MMM d, yyyy')} 
                    icon={<Calendar size={16} className="text-green-600" />}
                />
                <DetailItem 
                    label="Total Registered" 
                    value={report.total_students} 
                    icon={<Users size={16} className="text-blue-500" />}
                />
                <DetailItem 
                    label="Present Students" 
                    value={report.present_count} 
                    icon={<UserCheck size={16} className="text-purple-600" />}
                />
                <DetailItem 
                    label="Absent Students" 
                    value={report.absent_count} 
                    icon={<AlertCircle size={16} className="text-red-500" />}
                />
                <div className="pt-3">
                    <Button 
                        onClick={() => handleViewReport(report)} // Use handler
                        className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                        View Details
                    </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
}

// =================================================================
// ATTENDANCE REPORT DETAIL DIALOG (NEW)
// =================================================================

interface AttendanceReportDetailDialogProps {
    selectedReport: AttendanceReport | null;
    setReportDialog: (open: boolean) => void;
    reportDialog: boolean;
}

const AttendanceReportDetailDialog: React.FC<AttendanceReportDetailDialogProps> = ({ selectedReport, setReportDialog, reportDialog }) => {
    if (!selectedReport) return null;

    // Helper to render student lists
    const StudentList = ({ students, type }: { students: string[]; type: 'present' | 'absent' }) => (
        <div className={`p-4 rounded-lg h-full overflow-y-auto ${type === 'present' ? 'bg-green-50' : 'bg-red-50'}`}>
            <h4 className={`text-lg font-bold mb-3 flex items-center gap-2 ${type === 'present' ? 'text-green-700' : 'text-red-700'}`}>
                {type === 'present' ? <CheckCircle size={20} /> : <UserX size={20} />}
                {type === 'present' ? `Present Students (${students.length})` : `Absent Students (${students.length})`}
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {students.length > 0 ? (
                    students.map((studentName, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-white shadow-sm border border-gray-100">
                            {type === 'present' 
                                ? <Check size={16} className="text-green-500 flex-shrink-0" /> 
                                : <UserX size={16} className="text-red-500 flex-shrink-0" />}
                            <span className="text-sm font-medium text-gray-800 truncate">{studentName || 'N/A (No Name)'}</span>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500 italic">No students listed as {type}.</p>
                )}
            </div>
        </div>
    );

    return (
        <Dialog open={reportDialog} onOpenChange={setReportDialog}>
            <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-purple-600">
                        <UserCheck size={24} />
                        Attendance Report: {selectedReport.exam_type}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 flex-shrink-0">
                    <Card className="col-span-1">
                        <CardHeader className="p-3">
                            <CardTitle className="text-base font-semibold text-gray-700">Exam Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 p-3 pt-0">
                            <DetailItem label="Course" value={selectedReport.course_name} icon={<BookOpen size={16} />} />
                            <DetailItem label="Date" value={format(new Date(selectedReport.attendance_date), 'MMM d, yyyy')} icon={<Calendar size={16} />} />
                            <DetailItem label="Duration" value={`${(selectedReport.duration_seconds / 60).toFixed(1)} min`} icon={<Clock size={16} />} />
                        </CardContent>
                    </Card>
                    <Card className="col-span-3 grid grid-cols-3 divide-x">
                        <DetailStat label="Total Registered" value={selectedReport.total_students} icon={<Users size={20} className="text-blue-500" />} />
                        <DetailStat label="Present Count" value={selectedReport.present_count} icon={<UserCheck size={20} className="text-green-500" />} />
                        <DetailStat label="Absent Count" value={selectedReport.absent_count} icon={<UserX size={20} className="text-red-500" />} />
                    </Card>
                </div>
                
                <Separator className="flex-shrink-0" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden flex-grow pb-4">
                    <div className="flex flex-col h-full min-h-0">
                        <StudentList students={selectedReport.present_students || []} type="present" />
                    </div>
                    <div className="flex flex-col h-full min-h-0">
                        <StudentList students={selectedReport.absent_students || []} type="absent" />
                    </div>
                </div>

                <DialogFooter className="flex-shrink-0">
                    <Button variant="outline" onClick={() => setReportDialog(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// =================================================================
// UTILITY COMPONENTS
// =================================================================

const DetailItem = ({ label, value, icon }) => (
    <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
            {icon} {label}
        </span>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
);

const DetailStat = ({ label, value, icon }) => (
    <div className="p-4 text-center">
        <div className="flex justify-center mb-2">{icon}</div>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
);


// Report Detail Dialog for Video Reports (Renamed to be specific)
interface VideoReportDetailDialogProps {
    selectedReport: VideoReport | null;
    setReportDialog: (open: boolean) => void;
    reportDialog: boolean;
}

const VideoReportDetailDialog: React.FC<VideoReportDetailDialogProps> = ({ selectedReport, setReportDialog, reportDialog }) => {
    if (!selectedReport) return null;

    return (
        <Dialog open={reportDialog} onOpenChange={setReportDialog}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film size={24} className="text-blue-600" />
                        Video Analysis Report: {selectedReport.examType}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <DetailItem label="Course Name" value={selectedReport.courseName} icon={<BookOpen size={16} />} />
                        <DetailItem 
                            label="Status" 
                            value={selectedReport.status.toUpperCase()} 
                            icon={selectedReport.status === 'processed' ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />} 
                        />
                        <DetailItem 
                            label="Total Duration" 
                            value={`${(selectedReport.totalDuration_s / 60).toFixed(1)} minutes`} 
                            icon={<Clock size={16} />}
                        />
                        <DetailItem 
                            label="Report ID" 
                            value={selectedReport._id} 
                            icon={<FileText size={16} />}
                        />
                        <DetailItem 
                            label="Violations" 
                            value={selectedReport.proctoringViolationsCount} 
                            icon={<AlertCircle size={16} className="text-red-500" />}
                        />
                        <DetailItem 
                            label="Risk Score" 
                            value={selectedReport.riskScore ? selectedReport.riskScore.toFixed(2) : 'N/A'} 
                            icon={<MonitorPlay size={16} />}
                        />
                        <DetailItem 
                            label="Created At" 
                            value={format(new Date(selectedReport.createdAt), 'MMM d, yyyy, h:mm a')} 
                            icon={<Calendar size={16} />}
                        />
                    </div>
                    <div className="space-y-4">
                        <span className="font-medium block mb-1 text-lg text-gray-800">Video Information</span>
                        <div className="border p-4 rounded-lg bg-gray-50">
                            <span className="font-medium block mb-1 text-sm text-gray-700">Original Video Title:</span>
                            <p className="text-base font-mono text-gray-900 break-words">{selectedReport.videoTitle}</p>
                        </div>
                        
                        {selectedReport.status === 'processed' && selectedReport.outputUrl && (
                            <div className="border p-4 rounded-lg bg-green-50">
                                <span className="font-medium block mb-1 text-sm text-gray-700">Processed Video Link:</span>
                                <a 
                                    href={selectedReport.outputUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:text-blue-800 hover:underline block truncate text-sm"
                                    title={selectedReport.outputUrl}
                                >
                                    {selectedReport.outputUrl}
                                </a>
                                <p className="text-xs text-gray-500 mt-1">
                                    Note: The processed video file (`{selectedReport.videoTitle}`) is served directly from the server's `processed_videos` folder.
                                </p>
                            </div>
                        )}
                        
                        {selectedReport.status === 'error' && (
                            <div className="p-4 rounded-lg bg-red-100 text-red-800 flex items-center gap-2">
                                <AlertCircle size={20} />
                                <span className="font-medium">Error in Processing.</span>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setReportDialog(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}