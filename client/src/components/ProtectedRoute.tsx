import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
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
    <div className="flex min-h-screen flex-col md:flex-row bg-base text-ink dark:bg-base-dark dark:text-ink-dark">
      <Navbar />

      <main className="min-w-0 w-full flex-1 md:h-screen md:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
