import { Navigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function Landing() {
  return <Navigate to="/admin/login" replace />;
}
