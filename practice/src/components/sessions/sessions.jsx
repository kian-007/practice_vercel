import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../api";
import "../../pages/dashboard/dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/sessions`);
      const data = await res.json();

      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error("Load sessions error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevoke = async (id) => {
    const confirmed = window.confirm("این دستگاه از حسابت خارج بشه؟");

    if (!confirmed) return;

    await fetchWithAuth(`${API_URL}/sessions/${id}`, {
      method: "DELETE",
    });

    loadSessions();
  };

  if (loading) {
    return <p>در حال بارگذاری...</p>;
  }

  return (
    <div className="sessions">
      <h3>دستگاه‌های فعال</h3>

      {sessions.map((session) => (
        <div key={session.id} className="session-row">
          <span>{session.user_agent}</span>

          <span>{new Date(session.last_used_at).toLocaleString("fa-IR")}</span>

          {session.current ? (
            <span className="current-badge">این دستگاه</span>
          ) : (
            <button onClick={() => handleRevoke(session.id)}>خروج</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sessions;
