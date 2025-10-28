import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Don't show header on dashboard pages (they have their own layout)
  if (
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/take-exam") ||
    location.pathname.startsWith("/monitoring") ||
    location.pathname.startsWith("/users") ||
    location.pathname.startsWith("/exams") ||
    location.pathname.startsWith("/reports") ||
    location.pathname.startsWith("/verification") ||
    location.pathname.startsWith("/join-exam") ||
    location.pathname.startsWith("/profile")
  ) {
    return null;
  }

  const navigation = [
    { name: "Home", href: "/" },
    { name: "About", href: "/#features" },
    { name: "Features", href: "/#features" },
    { name: "Contact", href: "/#contact" },
  ];

  return (
    <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=40"
                  alt="AI Vision Exam Logo"
                  className="h-10 w-10 rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-20 rounded-xl transition-opacity"></div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  AI Vision Exam
                </h1>
                <p className="text-xs text-gray-500 -mt-1">
                  Smart Exam Monitoring
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200 relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" asChild className="font-medium">
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 font-medium"
                >
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="block px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-2 space-y-1">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center px-3 py-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-semibold">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    asChild
                    className="w-full justify-start font-medium"
                  >
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full bg-blue-600 hover:bg-blue-700 font-medium"
                  >
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
