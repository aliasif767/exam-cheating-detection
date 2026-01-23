import { useState, useEffect } from "react";
import {
  Users,
  Camera,
  Save,
  UploadCloud,
  Trash2,
  Loader,
  UserPlus,
  Search,
  Filter,
  Download,
  UserCheck,
  CheckCircle,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

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
    <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-indigo-50 h-full">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Register Student</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Face template registration</p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0">
            Admin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <p className="text-sm text-blue-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Upload a clear, frontal image of the student for accurate face recognition in attendance tracking.</span>
          </p>
        </div>

        {/* Image Upload Section */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <ImageIcon size={16} />
            Student Photo
          </label>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center border-4 border-dashed border-gray-300 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Student Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="h-16 w-16 text-gray-400" />
              )}
            </div>

            <div className="w-full">
              <Input
                id="picture"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                disabled={isRegistering}
                className="w-full h-12 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>
        </div>

        {/* Name Input */}
        <div className="space-y-3">
          <label
            htmlFor="student-name"
            className="text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            <Users size={16} />
            Student Name
          </label>
          <Input
            id="student-name"
            placeholder="Enter student's full name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            disabled={isRegistering}
            className="h-12 text-base"
          />
        </div>

        {/* Register Button */}
        <Button
          onClick={handleRegister}
          disabled={isRegistering || !studentName.trim() || !selectedFile}
          className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all"
        >
          {isRegistering ? (
            <>
              <Loader className="mr-2 h-5 w-5 animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Register Student
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function RegisteredStudentsList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
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
            description: `${studentName} has been deleted successfully.`,
            variant: "default",
          });
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

  const filteredStudents = students.filter(student =>
    student.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Registered Students</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96">
          <Loader className="w-16 h-16 animate-spin text-indigo-500 mb-4" />
          <p className="text-gray-600 text-lg font-medium">Loading students...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Registered Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-red-800 font-semibold text-lg mb-2">Error Loading Students</p>
            <p className="text-red-700 text-sm mb-4">{error}</p>
            <Button
              onClick={fetchStudents}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Registered Students
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Total: {students.length} students
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchStudents} variant="outline" size="sm" className="h-10">
              <Download className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search students by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? "No students found" : "No registered students yet"}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? "Try adjusting your search query"
                : "Add students using the registration form"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <div
                key={student._id}
                className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Student Image */}
                <div className="relative w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                  {student.studentPic ? (
                    <img
                      src={student.studentPic}
                      alt={student.studentName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        console.error("Image failed to load:", student.studentName);
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <Camera className="w-16 h-16 text-gray-400" />
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-white bg-opacity-90 text-gray-800 border-0 shadow-lg">
                      <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                    </Badge>
                  </div>
                </div>

                {/* Student Info */}
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Name</p>
                    <p className="text-lg font-bold text-gray-900 truncate">
                      {student.studentName}
                    </p>
                  </div>

                  {student.createdAt && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Registered: {new Date(student.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Delete Button */}
                  <Button
                    onClick={() => handleDeleteStudent(student._id, student.studentName)}
                    variant="destructive"
                    size="sm"
                    className="w-full h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all"
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
  const [stats, setStats] = useState({
    totalStudents: 0,
    registeredToday: 0,
  });

  const handleStudentRegistered = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    // Fetch stats
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/students/count");
        if (response.ok) {
          const data = await response.json();
          setStats(prev => ({ ...prev, totalStudents: data.count || 0 }));
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    fetchStats();
  }, [refreshTrigger]);

  return (
    <DashboardLayout title="Student Management">
      <div className="space-y-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        {/* Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8">
          <div className="absolute inset-0 bg-black opacity-5"></div>
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-white opacity-10 rounded-full blur-3xl"></div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white bg-opacity-20 text-white border-0 backdrop-blur-sm">
              </Badge>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Student Management 👨‍🎓</h1>
            <p className="text-purple-100 text-lg">Register and manage student face templates for attendance tracking</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Students</CardTitle>
              <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{stats.totalStudents}</div>
              <p className="text-xs text-blue-600 font-medium mt-1">Registered students</p>
            </CardContent>
          </Card>

          
          <Card className="relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">System Status</CardTitle>
              <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">Active</div>
              <p className="text-xs text-purple-600 font-medium mt-1">Face recognition online</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Registration Card */}
          <div className="lg:col-span-1">
            <RegisterStudentCard
              token={token}
              onStudentRegistered={handleStudentRegistered}
            />
          </div>

          {/* Students List */}
          <div className="lg:col-span-2">
            <RegisteredStudentsList key={refreshTrigger} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}