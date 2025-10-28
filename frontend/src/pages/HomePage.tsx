import { Link } from "react-router-dom";
import {
  Shield,
  Camera,
  Users,
  BarChart3,
  CheckCircle,
  Star,
  ArrowRight,
  Play,
  Eye,
  Lock,
  Zap,
  Award,
  Globe,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnimatedCounter from "@/components/AnimatedCounter";
import ScrollToTop from "@/components/ScrollToTop";

export default function HomePage() {
  const smoothScroll = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const features = [
    {
      icon: Camera,
      title: "AI-Powered Facial Recognition",
      description:
        "Advanced computer vision technology ensures accurate identity verification with 99.9% accuracy rate.",
      color: "bg-blue-500",
    },
    {
      icon: Shield,
      title: "Real-Time Security Monitoring",
      description:
        "Continuous surveillance with instant violation detection and automated response systems.",
      color: "bg-green-500",
    },
    {
      icon: BarChart3,
      title: "Comprehensive Analytics",
      description:
        "Detailed reports and insights on exam performance, security metrics, and student behavior analysis.",
      color: "bg-purple-500",
    },
    {
      icon: Users,
      title: "Multi-Role Management",
      description:
        "Seamless coordination between administrators, invigilators, and students with role-based access.",
      color: "bg-orange-500",
    },
  ];

  const stats = [
    { number: "99.9%", label: "Recognition Accuracy", icon: Eye },
    { number: "50K+", label: "Secure Exams Conducted", icon: Award },
    { number: "24/7", label: "Monitoring Uptime", icon: Clock },
    { number: "500+", label: "Educational Institutions", icon: Globe },
  ];

  const testimonials = [
    {
      quote:
        "AI Vision Exam has revolutionized our online examination process. The facial recognition technology is incredibly accurate and has eliminated cheating completely.",
      author: "Dr. Sarah Johnson",
      role: "Dean of Computer Science",
      institution: "Tech University",
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b5c3?q=80&w=150",
    },
    {
      quote:
        "The real-time monitoring capabilities are exceptional. We can now conduct large-scale examinations with confidence and complete transparency.",
      author: "Prof. Michael Chen",
      role: "Academic Director",
      institution: "Global Institute",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150",
    },
    {
      quote:
        "As a student, I appreciate the fair and secure examination environment. The system is user-friendly and doesn't compromise on privacy.",
      author: "Emma Rodriguez",
      role: "Computer Science Student",
      institution: "Innovation College",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img
                src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=40"
                alt="AI Vision Logo"
                className="h-8 w-8 rounded-lg"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">
                AI Vision Exam
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => smoothScroll("features")}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => smoothScroll("how-it-works")}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => smoothScroll("testimonials")}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Testimonials
              </button>
              <button
                onClick={() => smoothScroll("stats")}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Stats
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-10 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-green-400 to-blue-500 rounded-full opacity-10 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-20 animate-bounce delay-500"></div>
          <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-15 animate-bounce delay-700"></div>
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
                🚀 Next-Generation Exam Monitoring
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Secure Online Exams with{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Vision
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Revolutionary AI-powered examination system featuring real-time
                facial recognition, continuous monitoring, and comprehensive
                analytics for educational institutions worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                  asChild
                >
                  <Link to="/register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="group">
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  No Credit Card Required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  14-Day Free Trial
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl opacity-20 blur-3xl"></div>
              <img
                src="https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=600"
                alt="AI Vision Technology"
                className="relative rounded-3xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl animate-bounce">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    Live Monitoring Active
                  </span>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-4 shadow-xl">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-600 animate-pulse" />
                  <span className="text-sm font-medium">99.9% Secure</span>
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <Camera className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium">AI Processing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              Real numbers from our global community
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mb-2">
                <AnimatedCounter end={99} suffix=".9%" />
              </div>
              <div className="text-gray-600">Recognition Accuracy</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mb-2">
                <AnimatedCounter end={50} suffix="K+" />
              </div>
              <div className="text-gray-600">Secure Exams Conducted</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mb-2">
                <span className="text-3xl font-bold text-gray-900">24/7</span>
              </div>
              <div className="text-gray-600">Monitoring Uptime</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Globe className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mb-2">
                <AnimatedCounter end={500} suffix="+" />
              </div>
              <div className="text-gray-600">Educational Institutions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Education
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive suite of AI-powered tools ensures exam integrity
              while providing seamless user experience for all stakeholders.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-0 bg-white"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 mb-6">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Simple setup, powerful results in just three steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="relative mb-8">
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400"
                  alt="Step 1"
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Setup & Configure</h3>
              <p className="text-gray-600">
                Create your exam, configure settings, and invite students with
                our intuitive dashboard.
              </p>
            </div>
            <div className="text-center">
              <div className="relative mb-8">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400"
                  alt="Step 2"
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Verification</h3>
              <p className="text-gray-600">
                Students complete facial recognition setup and identity
                verification before exam access.
              </p>
            </div>
            <div className="text-center">
              <div className="relative mb-8">
                <img
                  src="https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=400"
                  alt="Step 3"
                  className="w-full h-48 object-cover rounded-2xl"
                />
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Monitor & Analyze</h3>
              <p className="text-gray-600">
                Real-time monitoring with AI analysis and comprehensive
                reporting for complete exam oversight.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Leading Institutions
            </h2>
            <p className="text-xl text-gray-600">
              See what educators and students are saying about AI Vision Exam
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center">
                    <img
                      src={testimonial.image}
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-gray-600">
                        {testimonial.role}
                      </div>
                      <div className="text-sm text-gray-500">
                        {testimonial.institution}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Exam Process?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of institutions worldwide using AI Vision Exam for
            secure, efficient online examinations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              asChild
            >
              <Link to="/register">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-blue-600"
            >
              Schedule Demo
            </Button>
          </div>
          <p className="text-blue-200 mt-4 text-sm">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img
                  src="https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=40"
                  alt="AI Vision Logo"
                  className="h-8 w-8 rounded-lg"
                />
                <span className="ml-2 text-xl font-bold">AI Vision Exam</span>
              </div>
              <p className="text-gray-400 mb-4">
                The most advanced AI-powered exam monitoring system for
                educational institutions worldwide.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-xs">f</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-xs">t</span>
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 cursor-pointer">
                  <span className="text-xs">in</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AI Vision Exam. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
