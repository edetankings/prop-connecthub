import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

// Smart dashboard router — redirects to role-specific dashboard
const Dashboard = () => {
  const { profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAdmin) return <Navigate to="/admin" replace />;
  if (profile?.profile_type === "buyer") return <Navigate to="/dashboard/buyer" replace />;
  if (profile?.profile_type === "agent") return <Navigate to="/dashboard/agent" replace />;
  if (profile?.profile_type === "builder") return <Navigate to="/dashboard/builder" replace />;

  // fallback
  return <Navigate to="/" replace />;
};

export default Dashboard;
