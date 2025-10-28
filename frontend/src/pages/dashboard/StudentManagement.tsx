import { useState, useEffect } from "react";
import {
  Users,
  Camera,
  Save,
  UploadCloud,
  Trash2,
  Loader,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

// The component moved from AdminDashboard.tsx
function RegisterStudentCard({ token, onStudentRegistered }) {
  const [studentName, setStudentName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event) => {
    const file = event.target.files ? event.target.files[0] : null;

    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image file (JPEG, PNG).",
          variant: "destructive",
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleRegister = async () => {
    if (!studentName.trim() || !selectedFile) {
      toast({
        title: "Registration Failed",
        description: "Please enter a student name and upload an image file.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);

    const formData = new FormData();
    formData.append("studentName", studentName.trim());
    formData.append("image", selectedFile);

    try {
      const response = await fetch(
        "http://localhost:5001/api/attendance/register-student",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Registration Success!",
          description: result.message,
          variant: "default",
        });
        setStudentName("");
        setSelectedFile(null);
        setPreviewUrl(null);
        
        // Notify parent to refresh the student list
        if (onStudentRegistered) {
          onStudentRegistered();
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Registration Error",
          description: errorData.message || "Failed to register face template.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Registration API call failed:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to the attendance server (Port 5001).",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow border-2 border-indigo-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold text-indigo-700 flex items-center gap-2">
          <UploadCloud className="h-5 w-5" />
          Attendance Face Registration
        </CardTitle>
        <Badge variant="secondary">ADMIN ONLY</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a clear, frontal image of the student to save their face template for the attendance system.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">
            Student Image Upload (.jpg/.png)
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-400 overflow-hidden shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Student Face Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="h-6 w-6 text-gray-500" />
              )}
            </div>

            <Input
              id="picture"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={isRegistering}
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="student-name"
            className="text-sm font-medium leading-none"
          >
            Student Name (e.g., John Doe)
          </label>
          <Input
            id="student-name"
            placeholder="Enter Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            disabled={isRegistering}
          />
        </div>

        <Button
          onClick={handleRegister}
          disabled={isRegistering || !studentName.trim() || !selectedFile}
          className="w-full bg-indigo-600 hover:bg-indigo-700"
        >
          {isRegistering ? (
            <LoadingSpinner size="sm" className="mr-2 border-white" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isRegistering ? "Saving Template..." : "Register Face Template"}
        </Button>
      </CardContent>
    </Card>
  );
}

// New component to display registered students as cards
function RegisteredStudentsList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://localhost:5001/api/students/registered",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to fetch students");
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm("Are you sure you want to delete this student record?")) {
      try {
        const response = await fetch(
          `http://localhost:5001/api/students/${studentId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          toast({
            title: "Success",
            description: "Student record deleted successfully",
            variant: "default",
          });
          // Refresh the list
          fetchStudents();
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.message || "Failed to delete student",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error deleting student:", err);
        toast({
          title: "Network Error",
          description: "Could not connect to the server",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registered Student List</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registered Student List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <Button
              onClick={fetchStudents}
              variant="outline"
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Registered Student List</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total Students: {students.length}
          </p>
        </div>
        <Button onClick={fetchStudents} variant="outline" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-muted-foreground">No registered students yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add students using the registration form on the left.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <div
                key={student._id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Student Image */}
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {student.studentPic ? (
                    <img
                      src={student.studentPic}
                      alt={student.studentName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Image failed to load:", student.studentName);
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <Camera className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                {/* Student Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Student Name</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {student.studentName}
                    </p>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    {student.createdAt && (
                      <p>
                        Registered: {new Date(student.createdAt).toLocaleDateString()}
                      </p>
                    )}
                   
                  </div>

                  {/* Delete Button */}
                  <Button
                    onClick={() => handleDeleteStudent(student._id)}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentManagement() {
  const { token } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleStudentRegistered = () => {
    // Trigger refresh of the student list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DashboardLayout title="Student Management">
      <div className="space-y-6">
       

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Face Registration Card */}
          <div className="lg:col-span-1">
            <RegisterStudentCard
              token={token}
              onStudentRegistered={handleStudentRegistered}
            />
          </div>

          {/* Registered Students List */}
          <div className="lg:col-span-2">
            <RegisteredStudentsList key={refreshTrigger} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}