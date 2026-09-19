import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { useAuth } from "../../authContext";
import { fetchWithAuth } from "../../api";

const API_URL = import.meta.env.VITE_API_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const { userEmail, userRole, isLoggedIn, loading, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login");
    }
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (!loading && isLoggedIn) {
      loadSessions();
    }
  }, [loading, isLoggedIn]);

  const loadSessions = async () => {
    const res = await fetchWithAuth(`${API_URL}/sessions`);
    const data = await res.json();
    if (data.success) {
      setSessions(data.sessions);
    }
    setSessionsLoading(false);
  };

  const handleRevoke = async (id) => {
    const confirmed = window.confirm("این دستگاه از حسابت خارج بشه؟");
    if (!confirmed) return;

    await fetchWithAuth(`${API_URL}/sessions/${id}`, { method: "DELETE" });
    loadSessions();
  };

  const handleLogoutAll = async () => {
    const confirmed = window.confirm("همه دستگاه ها از حساب خارج بشن؟");
    if (!confirmed) return;

    await fetchWithAuth(`${API_URL}/logout-all`, { method: "POST" });
    logout();
  };

  if (loading) return <p>loading...</p>;

  return (
    <div className="dashboard">
      <div>
        {!loading && isLoggedIn && (
          <span>
            Welcome، {userEmail} - {userRole}
          </span>
        )}
      </div>

      <div className="div-btn">
        <button
          className="btn"
          onClick={() => navigate("/change-password")}
          style={{ alignSelf: "flex-end" }}
        >
          <span>Change password</span>
        </button>
        <button
          className="btn"
          onClick={() => {
            handleLogoutAll();
          }}
          style={{ alignSelf: "flex-end" }}
        >
          <span>Log-out All</span>
        </button>
      </div>

      <div className="sessions">
        <h3>دستگاه‌های فعال</h3>
        {sessionsLoading ? (
          <p>در حال بارگذاری...</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="session-row">
              <span>{session.user_agent}</span>
              <span>
                {new Date(session.last_used_at).toLocaleString("fa-IR")}
              </span>
              {session.current ? (
                <span className="current-badge">این دستگاه</span>
              ) : (
                <button onClick={() => handleRevoke(session.id)}>خروج</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
