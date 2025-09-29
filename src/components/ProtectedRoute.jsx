import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../auth";

export default function ProtectedRoute({ children }) {
  const authed = isAuthenticated();
  const location = useLocation();

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
