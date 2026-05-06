import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { StudioPage } from "./pages/StudioPage";
import { PublicGraphViewPage } from "./pages/PublicGraphViewPage";

function Protected({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-loewi-muted)]">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/g/:graphId" element={<PublicGraphViewPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route
        path="/*"
        element={
          <Protected>
            <StudioPage />
          </Protected>
        }
      />
    </Routes>
  );
}
