import React, { useState, useEffect, useCallback } from "react";
import {
  PlusCircle,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  TrendingUp,
  Award,
  BookOpen,
  Target,
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

const API_BASE_URL = "http://localhost:5001/api";

const fetchExamsFromDB = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/exams`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("✓ Fetched exams from MongoDB:", data.data);
    return data.data || [];
  } catch (error) {
    console.error("✗ Error fetching exams:", error);
    throw error;
  }
};

const createExamInDB = async (newExamData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/exams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newExamData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create exam");
    }

    const data = await response.json();
    console.log("✓ Exam created in MongoDB:", data);
    return { ...newExamData, id: data.data.id };
  } catch (error) {
    console.error("✗ Error creating exam:", error);
    throw error;
  }
};

const updateExamInDB = async (examId, updatedData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update exam");
    }

    const data = await response.json();
    console.log("✓ Exam updated in MongoDB:", data);
    return updatedData;
  } catch (error) {
    console.error("✗ Error updating exam:", error);
    throw error;
  }
};

const deleteExamInDB = async (examId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete exam");
    }

    const data = await response.json();
    console.log("✓ Exam deleted from MongoDB:", data);
    return { success: true };
  } catch (error) {
    console.error("✗ Error deleting exam:", error);
    throw error;
  }
};

const initialFormData = {
  title: "",
  course: "",
  duration: 60,
  date: new Date(),
  status: "draft",
  students: 0,
  questions: 0,
  totalMarks: 100,
  passingMarks: 40,
};

const parseDateString = (dateString) => {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      
      const newDate = new Date(Date.UTC(year, month, day, 0, 0, 0));

      if (!isNaN(newDate.getTime()) && newDate.getUTCDate() === day) {
        return newDate;
      }
    }
    return null;
};

export default function ExamManagement() {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [examDialog, setExamDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [dateInput, setDateInput] = useState(format(initialFormData.date, "dd/MM/yyyy"));
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchExamsFromDB();
      setExams(data);
    } catch (error) {
      toast({
        title: "Error Loading Exams",
        description: "Failed to load exams. Make sure Flask server is running on http://localhost:5001",
        variant: "destructive",
      });
      console.error("Load error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const handleCreateExam = () => {
    setCurrentExam(null);
    setFormData(initialFormData);
    setDateInput(format(initialFormData.date, "dd/MM/yyyy"));
    setExamDialog(true);
  };

  const handleEditExam = (exam) => {
    setCurrentExam(exam);
    const dateObject = new Date(exam.date);
    setFormData({
      ...exam,
      date: dateObject,
    });
    setDateInput(format(dateObject, "dd/MM/yyyy")); 
    setExamDialog(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.match(/duration|questions|totalMarks|passingMarks|students/i)
        ? parseInt(value, 10) || 0
        : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateInputStringChange = (e) => {
    const dateString = e.target.value;
    setDateInput(dateString);

    const newDate = parseDateString(dateString);

    if (newDate) {
      setFormData((prev) => ({ ...prev, date: newDate }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.course) {
      toast({
        title: "Missing Fields",
        description: "Please fill in Title and Course (required fields).",
        variant: "destructive",
      });
      return;
    }
    
    const finalDateObject = parseDateString(dateInput);
    if (!finalDateObject) {
      toast({
        title: "Invalid Date",
        description: "Please enter a valid date in DD/MM/YYYY format.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const examToSave = {
      ...formData,
      date: finalDateObject.toISOString(), 
    };

    try {
      if (currentExam) {
        await updateExamInDB(currentExam.id || currentExam._id, examToSave);
        toast({ 
          title: "Success", 
          description: `${formData.title} has been updated.` 
        });
      } else {
        await createExamInDB(examToSave);
        toast({ 
          title: "Success", 
          description: `${formData.title} has been created.` 
        });
      }
      await loadExams();
      setExamDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Operation failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePrompt = (exam) => {
    setCurrentExam(exam);
    setDeleteDialog(true);
  };

  const handleDeleteExam = async () => {
    setIsSaving(true);
    try {
      await deleteExamInDB(currentExam.id || currentExam._id);
      toast({
        title: "Success",
        description: `${currentExam.title} has been deleted.`,
      });
      await loadExams();
      setDeleteDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Deletion failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Scheduled</Badge>;
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Active</Badge>;
      case "completed":
        return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Completed</Badge>;
      case "draft":
        return <Badge className="bg-gray-400 hover:bg-gray-500 text-white">Draft</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8">
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
        
        <div className="relative flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white bg-opacity-20 text-white border-0 backdrop-blur-sm">
                Exam Management System
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Manage Exams 📝</h1>
            <p className="text-purple-100 text-lg">Create, edit, and organize all your examinations</p>
          </div>
          <Button 
            onClick={handleCreateExam} 
            size="lg"
            className="bg-white text-purple-600 hover:bg-purple-50 font-semibold shadow-xl"
          >
            <PlusCircle className="mr-2" size={20} />
            Create New Exam
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Exams</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{exams.length}</div>
            <p className="text-xs text-blue-600 font-medium mt-1">
              {exams.filter((e) => e.status === "active").length} currently active
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Scheduled</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {exams.filter((e) => e.status === "scheduled").length}
            </div>
            <p className="text-xs text-green-600 font-medium mt-1">Ready to start</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Completed</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {exams.filter((e) => e.status === "completed").length}
            </div>
            <p className="text-xs text-purple-600 font-medium mt-1">Finished exams</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-amber-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Students</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">
              {exams.reduce((acc, exam) => acc + (exam.students || 0), 0)}
            </div>
            <p className="text-xs text-orange-600 font-medium mt-1">Across all exams</p>
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
                placeholder="Search exams by title or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button variant="outline" className="h-12">
              <Filter className="mr-2" size={18} />
              Filter
            </Button>
            <Button variant="outline" className="h-12">
              <Download className="mr-2" size={18} />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl shadow-md border-0">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            All Exams ({filteredExams.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
            Active
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
            Completed
          </TabsTrigger>
          <TabsTrigger value="draft" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-gray-600 data-[state=active]:text-white">
            Drafts
          </TabsTrigger>
        </TabsList>

        {["all", "scheduled", "active", "completed", "draft"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {isLoading ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="flex flex-col justify-center items-center h-96">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
                  <p className="text-gray-600 text-lg font-medium">Loading exams from database...</p>
                </CardContent>
              </Card>
            ) : (
              <ExamTable
                exams={
                  status === "all"
                    ? filteredExams
                    : filteredExams.filter((exam) => exam.status === status)
                }
                getStatusBadge={getStatusBadge}
                handleEditExam={handleEditExam}
                handleDeletePrompt={handleDeletePrompt}
                handleCreateExam={handleCreateExam}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={examDialog} onOpenChange={setExamDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {currentExam ? (
                <>
                  <Edit className="w-6 h-6 text-blue-600" />
                  Edit Exam
                </>
              ) : (
                <>
                  <PlusCircle className="w-6 h-6 text-green-600" />
                  Create New Exam
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base">
              {currentExam
                ? `Update details for ${currentExam.title}`
                : "Enter the details for the new exam below."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold">Exam Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Final Physics Examination"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course" className="text-base font-semibold">Course *</Label>
                <Input
                  id="course"
                  name="course"
                  placeholder="e.g., Physics 302"
                  value={formData.course}
                  onChange={handleInputChange}
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-base font-semibold">Duration (min)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-base font-semibold">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="questions" className="text-base font-semibold">Questions</Label>
                  <Input
                    id="questions"
                    name="questions"
                    type="number"
                    min="0"
                    value={formData.questions}
                    onChange={handleInputChange}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="students" className="text-base font-semibold">Students</Label>
                  <Input
                    id="students"
                    name="students"
                    type="number"
                    min="0"
                    value={formData.students}
                    onChange={handleInputChange}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalMarks" className="text-base font-semibold">Total Marks</Label>
                  <Input
                    id="totalMarks"
                    name="totalMarks"
                    type="number"
                    min="1"
                    value={formData.totalMarks}
                    onChange={handleInputChange}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passingMarks" className="text-base font-semibold">Passing Marks</Label>
                  <Input
                    id="passingMarks"
                    name="passingMarks"
                    type="number"
                    min="0"
                    value={formData.passingMarks}
                    onChange={handleInputChange}
                    className="h-11"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="examDate" className="text-base font-semibold">Exam Date (DD/MM/YYYY) *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    id="examDate"
                    name="examDate"
                    placeholder="e.g., 27/10/2025"
                    value={dateInput}
                    onChange={handleDateInputStringChange}
                    className="h-11 pl-10"
                  />
                </div>
              </div>

            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExamDialog(false)} disabled={isSaving} className="h-11">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="h-11 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-white rounded-full inline-block"></span>
                  {currentExam ? "Saving..." : "Creating..."}
                </>
              ) : currentExam ? (
                "Save Changes"
              ) : (
                "Create Exam"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-xl">
              <AlertCircle size={24} /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you absolutely sure you want to delete <strong>"{currentExam?.title}"</strong>? This action cannot be undone and will permanently remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={isSaving} className="h-11">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExam} disabled={isSaving} className="h-11">
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-white rounded-full inline-block"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" /> Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ExamTable = ({
  exams,
  getStatusBadge,
  handleEditExam,
  handleDeletePrompt,
  handleCreateExam,
}) => {
  if (exams.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="text-center p-16">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-12 w-12 text-indigo-600" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-900">No Exams Found</h3>
          <p className="text-gray-600 mb-6 text-lg">Get started by creating your first exam.</p>
          <Button onClick={handleCreateExam} size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
            <PlusCircle size={20} className="mr-2" /> Create First Exam
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200">
                <TableHead className="font-bold text-gray-700">Exam Title</TableHead>
                <TableHead className="font-bold text-gray-700">Course</TableHead>
                <TableHead className="font-bold text-gray-700">Date</TableHead>
                <TableHead className="font-bold text-gray-700">Duration</TableHead>
                <TableHead className="font-bold text-gray-700">Status</TableHead>
                <TableHead className="font-bold text-gray-700 text-center">Students</TableHead>
                <TableHead className="font-bold text-gray-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam, index) => (
                <TableRow 
                  key={exam._id || exam.id} 
                  className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200"
                >
                  <TableCell className="font-semibold text-gray-900">{exam.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-indigo-500" />
                      <span className="text-gray-700">{exam.course}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar size={16} className="text-green-500" />
                      <span className="text-gray-700">
                        {exam.date ? format(new Date(exam.date), "dd/MM/yyyy") : "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-500" />
                      <span className="text-gray-700">{exam.duration} min</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(exam.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
                      <Users size={14} className="text-orange-600" />
                      <span className="text-orange-700 font-semibold">{exam.students}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditExam(exam)}
                        title="Edit Exam"
                        className="hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePrompt(exam)}
                        title="Delete Exam"
                        className="hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};