import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppShell from "./components/layout/AppShell";
import FriendsView from "./pages/FriendsView";
import DmView from "./pages/DmView";
import GuildView from "./pages/GuildView";
import InvitePage from "./pages/InvitePage";
import { useAuthStore } from "./store/auth";
import { fetchMe } from "./api/auth";
import { requestTokenRefresh } from "./api/client";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", color: "var(--text-muted)" }}>
      Loading XRA…
    </div>
  );
}

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  useEffect(() => {
    (async () => {
      try {
        // Goes through the same deduped refresh path as the 401-retry
        // interceptor — see the comment on requestTokenRefresh for why that
        // matters (concurrent raw refresh calls trip reuse detection and
        // log the user out of every session).
        const token = await requestTokenRefresh();
        if (token) {
          const me = await fetchMe();
          setUser(me.user);
        }
      } catch {
        // no valid session — user needs to log in
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/:code" element={<ProtectedRoute><InvitePage /></ProtectedRoute>} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="friends" element={<FriendsView />} />
        <Route path="dms/:channelId" element={<DmView />} />
        <Route path="guilds/:guildId" element={<GuildView />} />
        <Route path="guilds/:guildId/channels/:channelId" element={<GuildView />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/friends" replace />} />
    </Routes>
  );
}
