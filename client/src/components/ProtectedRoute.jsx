import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "./Navbar.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base dark:bg-base-dark">
        <div className="text-sm text-muted dark:text-muted-dark">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex bg-base text-ink dark:bg-base-dark dark:text-ink-dark">
      <Navbar />
      <main className="h-screen flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
