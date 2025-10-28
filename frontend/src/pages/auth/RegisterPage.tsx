import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  UserPlus,
  GraduationCap,
  Shield,
  Users,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "",
    studentId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [],
    isValid: false,
  });
  const { register } = useAuth();
  const navigate = useNavigate();

  const checkPasswordStrength = (password: string) => {
    const feedback = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("At least 8 characters long");
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one uppercase letter");
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one lowercase letter");
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one number");
    }

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 1;
    } else {
      feedback.push("At least one special character");
    }

    const isValid = score >= 4 && password.length >= 8;

    return { score, feedback, isValid };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password strength
    if (!passwordStrength.isValid) {
      toast.error("Please create a stronger password");
      return;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    // Remove confirmPassword from the data sent to backend
    const { confirmPassword, ...submitData } = formData;
    const success = await register(submitData);
    if (success) {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Check password strength when password changes
    if (field === "password") {
      const strength = checkPasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-5 h-5" />;
      case "invigilator":
        return <Users className="w-5 h-5" />;
      case "student":
        return <GraduationCap className="w-5 h-5" />;
      default:
        return <UserPlus className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen flex pt-16">
      {/* Left Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Join AI Vision Exam
            </h2>
            <p className="text-gray-600">Create your account to get started</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-center text-xl flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    onValueChange={(value) => handleInputChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Student
                        </div>
                      </SelectItem>
                      <SelectItem value="invigilator">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Invigilator
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Administrator
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.role === "student" && (
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      placeholder="e.g., STU2024001"
                      value={formData.studentId}
                      onChange={(e) =>
                        handleInputChange("studentId", e.target.value)
                      }
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      required
                      className={`pr-10 ${
                        formData.password && !passwordStrength.isValid
                          ? "border-red-300 focus:border-red-500"
                          : formData.password && passwordStrength.isValid
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              passwordStrength.score <= 1
                                ? "bg-red-500 w-1/5"
                                : passwordStrength.score <= 2
                                  ? "bg-orange-500 w-2/5"
                                  : passwordStrength.score <= 3
                                    ? "bg-yellow-500 w-3/5"
                                    : passwordStrength.score <= 4
                                      ? "bg-blue-500 w-4/5"
                                      : "bg-green-500 w-full"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            passwordStrength.score <= 1
                              ? "text-red-500"
                              : passwordStrength.score <= 2
                                ? "text-orange-500"
                                : passwordStrength.score <= 3
                                  ? "text-yellow-500"
                                  : passwordStrength.score <= 4
                                    ? "text-blue-500"
                                    : "text-green-500"
                          }`}
                        >
                          {passwordStrength.score <= 1
                            ? "Weak"
                            : passwordStrength.score <= 2
                              ? "Fair"
                              : passwordStrength.score <= 3
                                ? "Good"
                                : passwordStrength.score <= 4
                                  ? "Strong"
                                  : "Very Strong"}
                        </span>
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <div className="text-xs text-gray-600">
                          <p className="font-medium">Password must have:</p>
                          <ul className="list-disc list-inside space-y-1 mt-1">
                            {passwordStrength.feedback.map((item, index) => (
                              <li key={index} className="text-red-600">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      required
                      className={`pr-10 ${
                        formData.confirmPassword &&
                        formData.password !== formData.confirmPassword
                          ? "border-red-300 focus:border-red-500"
                          : formData.confirmPassword &&
                              formData.password === formData.confirmPassword
                            ? "border-green-300 focus:border-green-500"
                            : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-600">
                        Passwords do not match
                      </p>
                    )}
                  {formData.confirmPassword &&
                    formData.password === formData.confirmPassword &&
                    formData.password && (
                      <p className="text-xs text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Passwords match
                      </p>
                    )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={
                    loading ||
                    !passwordStrength.isValid ||
                    formData.password !== formData.confirmPassword ||
                    !formData.password ||
                    !formData.confirmPassword
                  }
                >
                  {loading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    getRoleIcon(formData.role)
                  )}
                  <span className="ml-2">Create Account</span>
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Already have an account? Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center">
            <div className="mb-8">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000"
                alt="Students and Technology"
                className="w-32 h-32 mx-auto rounded-full mb-6 border-4 border-white/30"
              />
            </div>
            <h1 className="text-4xl font-bold mb-4">Start Your Journey</h1>
            <p className="text-xl mb-8 text-purple-100">
              Join thousands of students, educators, and administrators using
              our advanced AI exam monitoring platform
            </p>

            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  For Students
                </h3>
                <p className="text-sm text-purple-100">
                  Take exams with confidence knowing our AI ensures fairness and
                  integrity
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  For Educators
                </h3>
                <p className="text-sm text-purple-100">
                  Monitor exams in real-time with advanced AI-powered
                  supervision
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  For Administrators
                </h3>
                <p className="text-sm text-purple-100">
                  Manage the entire exam ecosystem with comprehensive analytics
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute top-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            className="w-full h-auto text-purple-500/20 rotate-180"
            fill="currentColor"
          >
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
