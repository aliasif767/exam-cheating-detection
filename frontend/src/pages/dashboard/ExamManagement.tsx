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
// Removed unused Popover imports
// Removed unused CalendarPicker import
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// =================================================================
// REAL API INTEGRATION - CALLS FLASK BACKEND
// =================================================================

const API_BASE_URL = "http://localhost:5001/api";

/**
 * Fetch all exams from MongoDB via Flask API
 */
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

/**
 * Create a new exam in MongoDB via Flask API
 */
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

/**
 * Update an existing exam in MongoDB via Flask API
 */
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

/**
 * Delete an exam from MongoDB via Flask API
 */
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

// =================================================================
// COMPONENT LOGIC
// =================================================================

const initialFormData = {
  title: "",
  course: "",
  duration: 60,
  date: new Date(), // Keep as Date object internally, but will only use day/month/year
  status: "draft",
  students: 0,
  questions: 0,
  totalMarks: 100,
  passingMarks: 40,
};

// Helper function to convert DD/MM/YYYY string to Date object
const parseDateString = (dateString) => {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      // Create date, keeping time at midnight UTC to avoid timezone issues on save
      const newDate = new Date(Date.UTC(year, month, day, 0, 0, 0));

      // Simple validation
      if (!isNaN(newDate.getTime()) && newDate.getUTCDate() === day) {
        return newDate;
      }
    }
    return null; // Return null for invalid input
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
  const { toast } = useToast();

  // Load exams from MongoDB on component mount
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
    setDateInput(format(initialFormData.date, "dd/MM/yyyy")); // Reset date input
    setExamDialog(true);
  };

  const handleEditExam = (exam) => {
    setCurrentExam(exam);
    const dateObject = new Date(exam.date);
    setFormData({
      ...exam,
      date: dateObject, // Keep date as object in formData
    });
    // Set string for manual input field
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

  // NEW HANDLER for manual DD/MM/YYYY input
  const handleDateInputStringChange = (e) => {
    const dateString = e.target.value;
    setDateInput(dateString); // Update string state immediately

    const newDate = parseDateString(dateString);

    if (newDate) {
      setFormData((prev) => ({ ...prev, date: newDate }));
    } 
    // If input is incomplete or invalid, we intentionally keep the previous valid Date object 
    // in formData. Validation happens in handleSubmit.
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
    
    // Final check on the date input string
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
      // Use the correctly parsed and validated date object for ISO conversion
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
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Scheduled</Badge>;
      case "active":
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Active</Badge>;
      case "completed":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Completed</Badge>;
      case "draft":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">Draft</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800">Exam Management 📝</h1>
        <Button onClick={handleCreateExam} className="flex items-center gap-2">
          <PlusCircle size={18} />
          <span>Create New Exam</span>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <FileText className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{exams.length}</div>
            <p className="text-xs text-muted-foreground">
              {exams.filter((e) => e.status === "active").length} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {exams.filter((e) => e.status === "scheduled").length}
            </div>
            <p className="text-xs text-muted-foreground">Exams waiting to start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {exams.filter((e) => e.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Finished and ready for results</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {exams.reduce((acc, exam) => acc + (exam.students || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all exams</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table Section */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Exams ({exams.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
        </TabsList>

        {["all", "scheduled", "active", "completed", "draft"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-4 text-gray-500">Loading exams from database...</p>
              </div>
            ) : (
              <ExamTable
                exams={
                  status === "all"
                    ? exams
                    : exams.filter((exam) => exam.status === status)
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentExam ? "Edit Exam" : "Create Exam"}</DialogTitle>
            <DialogDescription>
              {currentExam
                ? `Update details for ${currentExam.title}`
                : "Enter the details for the new exam."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Final Physics"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="course">Course *</Label>
                <Input
                  id="course"
                  name="course"
                  placeholder="e.g., Physics 302"
                  value={formData.course}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    name="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger className="mt-1">
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
                <div>
                  <Label htmlFor="questions">Number of Questions</Label>
                  <Input
                    id="questions"
                    name="questions"
                    type="number"
                    min="0"
                    value={formData.questions}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="students">Target Students</Label>
                  <Input
                    id="students"
                    name="students"
                    type="number"
                    min="0"
                    value={formData.students}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalMarks">Total Marks</Label>
                  <Input
                    id="totalMarks"
                    name="totalMarks"
                    type="number"
                    min="1"
                    value={formData.totalMarks}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="passingMarks">Passing Marks</Label>
                  <Input
                    id="passingMarks"
                    name="passingMarks"
                    type="number"
                    min="0"
                    value={formData.passingMarks}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
              </div>
              
              {/* MODIFIED SECTION: Manual Date Input */}
              <div>
                <Label htmlFor="examDate">Exam Date (DD/MM/YYYY) *</Label>
                <Input
                  id="examDate"
                  name="examDate"
                  placeholder="e.g., 27/10/2025"
                  value={dateInput}
                  onChange={handleDateInputStringChange}
                  className="mt-1"
                />
              </div>
              {/* END MODIFIED SECTION */}

            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-white rounded-full"></span>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle size={20} /> Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure you want to delete "{currentExam?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteExam} disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-white rounded-full"></span>
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

// Exam Table Component
const ExamTable = ({
  exams,
  getStatusBadge,
  handleEditExam,
  handleDeletePrompt,
  handleCreateExam,
}) => {
  if (exams.length === 0) {
    return (
      <div className="text-center p-10 border rounded-xl shadow-sm bg-white">
        <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Exams Found</h3>
        <p className="text-gray-500 mb-4">Get started by creating your first exam.</p>
        <Button onClick={handleCreateExam} className="mt-2">
          <PlusCircle size={18} className="mr-2" /> Create Exam
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Exam Title</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Students</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <TableRow key={exam._id || exam.id}>
                <TableCell className="font-semibold text-gray-900">{exam.title}</TableCell>
                <TableCell className="text-gray-600">{exam.course}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1 text-sm">
                    <Calendar size={14} className="text-gray-500" />
                    <span>
                      {/* Note: The format here assumes the stored date is a standard ISO date, 
                          which is handled by the modification in handleSubmit. */}
                      {exam.date ? format(new Date(exam.date), "dd/MM/yyyy") : "N/A"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{exam.duration} min</TableCell>
                <TableCell>{getStatusBadge(exam.status)}</TableCell>
                <TableCell className="text-center">{exam.students}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditExam(exam)}
                      title="Edit Exam"
                    >
                      <Edit size={16} className="text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePrompt(exam)}
                      title="Delete Exam"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};