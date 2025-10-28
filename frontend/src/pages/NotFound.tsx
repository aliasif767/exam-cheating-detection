import { Link } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 pt-20">
      <div className="max-w-md w-full text-center">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=400"
            alt="404 Error"
            className="w-64 h-64 mx-auto rounded-full shadow-xl mb-8"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent rounded-full" />
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>

        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link to="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full" size="lg">
            <Link to="/" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Link>
          </Button>
        </div>

        <div className="mt-8 p-4 bg-white/80 backdrop-blur-sm rounded-lg border">
          <h3 className="font-medium text-gray-900 mb-2">
            Looking for something specific?
          </h3>
          <p className="text-sm text-gray-600">
            Try going to your dashboard or contact support if you need
            assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
