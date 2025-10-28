import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield, Camera, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex pt-16">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center">
            <div className="mb-8">
              <img
                src="https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=1000"
                alt="AI Vision Technology"
                className="w-32 h-32 mx-auto rounded-full mb-6 border-4 border-white/30"
              />
            </div>
            <h1 className="text-4xl font-bold mb-4">AI Vision Exam</h1>
            <p className="text-xl mb-8 text-blue-100">
              Advanced AI-powered exam monitoring system with facial recognition
              and real-time surveillance
            </p>

            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="flex items-center space-x-3">
                <Camera className="w-6 h-6 text-blue-300" />
                <span>Real-time facial recognition</span>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-blue-300" />
                <span>Advanced security monitoring</span>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-300" />
                <span>Multi-role access control</span>
              </div>
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-blue-300" />
                <span>Comprehensive analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            className="w-full h-auto text-blue-500/20"
            fill="currentColor"
          >
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
          </svg>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-center text-xl">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 pr-10"
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
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  Sign In
                </Button>

                <div className="text-center">
                  <Link
                    to="/register"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Don't have an account? Sign up
                  </Link>
                </div>
              </form>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Demo Credentials:
                </p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>
                    <strong>Admin:</strong> admin@example.com / Admin123!
                  </p>
                  <p>
                    <strong>Student:</strong> student@example.com / Student123!
                  </p>
                  <p>
                    <strong>Invigilator:</strong> invigilator@example.com /
                    Invigilator123!
                  </p>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  🔒 Password Requirements:
                </p>
                <div className="space-y-1 text-xs text-blue-700">
                  <p>• At least 8 characters long</p>
                  <p>• Contains uppercase and lowercase letters</p>
                  <p>• Includes at least one number</p>
                  <p>• Has at least one special character</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
