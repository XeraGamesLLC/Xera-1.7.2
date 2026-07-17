import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppShell from "./components/layout/AppShell";
import FriendsView from "./pages/FriendsView";
import DmView from "./pages/DmView";
import GuildView from "./pages/GuildView";
import InvitePage from "./pages/InvitePage";
import DiscoveryPage from "./pages/DiscoveryPage";
import TermsPage from "./pages/TermsPage";
import { useAuthStore } from "./store/auth";
import { fetchMe } from "./api/auth";

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
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  useEffect(() => {
    (async () => {
      // The token (if any) was already read from localStorage synchronously
      // when the auth store was created — just confirm it's still valid and
      // fetch the user it belongs to. No refresh call: this token doesn't
      // expire on its own, so there's nothing to renew.
      if (!token) {
        setHydrating(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me.user);
      } catch {
        logout(); // token was invalidated server-side (logout elsewhere / password reset)
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/terms" element={<TermsPage />} />
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
        <Route path="discovery" element={<DiscoveryPage />} />
        <Route path="dms/:channelId" element={<DmView />} />
        <Route path="guilds/:guildId" element={<GuildView />} />
        <Route path="guilds/:guildId/channels/:channelId" element={<GuildView />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/friends" replace />} />
    </Routes>
  );
}
