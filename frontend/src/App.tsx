import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";

// Public pages
import HomePage from "@/pages/HomePage";

// Auth pages
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";

// Dashboard pages
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import Report from "@/pages/dashboard/ReportManagement";
import InvigilatorDashboard from "@/pages/dashboard/InvigilatorDashboard";
import StudentDashboard from "@/pages/dashboard/StudentDashboard";

// Exam Management
import ExamManagement from "@/pages/dashboard/ExamManagement";
import StudentManagement from "@/pages/dashboard/StudentManagement"; // Import the ExamManagement component

// Exam pages
import JoinExam from "@/pages/exam/JoinExam";
import TakeExam from "@/pages/exam/TakeExam";

// Face verification
import FaceVerification from "@/pages/verification/FaceVerification";

import NotFound from "@/pages/NotFound";
import LoadingSpinner from "@/components/LoadingSpinner";
import Header from "@/components/Header";

// Protected Route Component
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Dashboard Router Component
function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "admin":
      return <AdminDashboard />;
    case "invigilator":
      return <InvigilatorDashboard />;
    case "student":
      return <StudentDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <HomePage />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />

      {/* Admin routes - Placeholder components */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["admin", "invigilator"]}>
            <div className="p-6">
              <StudentManagement />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Replace this route with the ExamManagement component */}
      <Route
        path="/exams"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <div className="p-6">
              <ExamManagement />
            </div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/monitoring"
        element={
          <ProtectedRoute allowedRoles={[]}>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Live Monitoring</h2>
              <p>This feature is coming soon!</p>
            </div>
          </ProtectedRoute>
        }
      />

     <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["admin", "invigilator"]}>
            <div className="p-6">
              <Report />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Student routes */}
      <Route
        path="/join-exam/:examCode?"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <JoinExam />
          </ProtectedRoute>
        }
      />

      <Route
        path="/take-exam/:sessionId"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <TakeExam />
          </ProtectedRoute>
        }
      />

      <Route
        path="/verification"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <FaceVerification />
          </ProtectedRoute>
        }
      />

      {/* Profile route */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Profile</h2>
              <p>This feature is coming soon!</p>
            </div>
          </ProtectedRoute>
        }
      />

      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Header />
            <AppRoutes />
            <Toaster position="top-right" />
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;