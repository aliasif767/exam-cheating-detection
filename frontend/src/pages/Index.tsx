import { Navigate } from "react-router-dom";

export default function Index() {
  // Redirect to dashboard if this route is accessed
  return <Navigate to="/dashboard" replace />;
}
