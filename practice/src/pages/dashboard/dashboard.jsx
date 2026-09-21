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
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [urls, setUrls] = useState([]);
  const [urlsLoading, setUrlsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login");
    }
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (!loading && isLoggedIn) {
      loadSessions();
      loadUrls();
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

  const loadUrls = async () => {
    const res = await fetchWithAuth(`${API_URL}/urls`);
    const data = await res.json();
    if (data.success) {
      setUrls(data.urls);
    }
    setUrlsLoading(false);
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

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!originalUrl.trim()) {
      return;
    }
    setUrlsLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: originalUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Create URL failed:", data.message);
        return;
      }

      setShortUrl(data.url.short_code);

      setOriginalUrl("");

      await loadUrls();
    } catch (error) {
      console.error("Create URL error:", error);
    } finally {
      setUrlsLoading(false);
    }
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

      <div className="divbtn">
        <button
          className="dashbtn"
          onClick={() => navigate("/change-password")}
          style={{ alignSelf: "flex-end" }}
        >
          <span>Change password</span>
        </button>
        <button
          className="dashbtn"
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

      <form onSubmit={handleUrlSubmit} className="shortUrls">
        <h1>Create your short URLs</h1>
        <input
          placeholder="Original Url"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
        />
        <span>shor url: {shortUrl}</span>
        <button disabled={urlsLoading}>
          {urlsLoading ? "Creating..." : "Create Url"}
        </button>
      </form>

      <div className="urls">
        <h1>All Urls</h1>
        {urlsLoading ? (
          <p>Loading...</p>
        ) : (
          urls.map((url) => (
            <div key={url.id} className="url-row">
              <span>{url.original_url}: </span>
              <span> {url.short_code}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
