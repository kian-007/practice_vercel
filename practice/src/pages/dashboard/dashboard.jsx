import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { useAuth } from "../../authContext";
import { Sessions, ShortUrls } from "../../components";
import { fetchWithAuth } from "../../api";

const Dashboard = () => {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);

  const { userEmail, userRole, isLoggedIn, loading, logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    // const socket = new WebSocket("ws://localhost:5000");
    const socket = new WebSocket(API_URL.replace(/^http/, "ws"));

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("Message from server:", data);

      setMessages((prev) => [...prev, data]);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login");
    }
  }, [loading, isLoggedIn]);

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

  return (
    <div className="dashboard">
      <div>
        <h1>Dashboard</h1>
        <div>
          {isLoggedIn && (
            <span>
              Welcome, {userEmail} - {userRole}
            </span>
          )}
        </div>

        {messages.map((message, index) => (
          <p key={index}>{message.message}</p>
        ))}
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
          onClick={handleLogoutAll}
          style={{ alignSelf: "flex-end" }}
        >
          <span>Log-out All</span>
        </button>
      </div>

      <Sessions />
      <ShortUrls />
    </div>
  );
};

export default Dashboard;
