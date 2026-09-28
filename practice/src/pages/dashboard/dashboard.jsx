import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { useAuth } from "../../authContext";
import { Sessions, ShortUrls } from "../../components";
import { fetchWithAuth } from "../../api";
import { useSocket } from "../../socketContext";

const Dashboard = () => {
  const navigate = useNavigate();

  const { lastEvent, wsloading } = useSocket();

  const { userEmail, userRole, isLoggedIn, loading, logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login");
    }
    if (!loading && isLoggedIn && userRole !== "admin") {
      navigate("/");
      alert("You dont have permition to access this path");
    }
  }, [loading, isLoggedIn]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleLogoutAll = async (e) => {
    const confirmed = window.confirm("همه دستگاه ها از حساب خارج بشن؟");
    if (confirmed) {
      await fetchWithAuth(`${API_URL}/logout-all`, {
        method: "POST",
      });
      logout();
    } else {
      e.preventDefault();
      return;
    }
  };

  if (loading) {
    return <p>loading...</p>;
  }
  if (wsloading) {
    return <p>connecting...</p>;
  }

  function handleUrl() {
    const urlContainer = document.getElementById("urlContainer");
    urlContainer.classList.toggle("show");
  }

  return (
    <div className="dashboard">
      <div style={{ margin: "20px 20px" }}>
        <h1>Dashboard</h1>
        <div>
          {isLoggedIn && (
            <h3>
              Welcome, {userEmail} - {userRole}
            </h3>
          )}
        </div>
      </div>

      <div className="divbtn">
        <button
          className="dashbtn"
          onClick={() => navigate("/change-password")}
        >
          <span>Change password</span>
        </button>
        <button className="dashbtn" onClick={handleLogoutAll}>
          <span>Log-out All</span>
        </button>
      </div>

      <Sessions />
      <a onClick={handleUrl}>Create Urls</a>
      <ShortUrls lastEvent={lastEvent} />
    </div>
  );
};

export default Dashboard;
