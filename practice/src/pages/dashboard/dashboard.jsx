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
  const [lastEvent, setLastEvent] = useState(null);
  const [wsloading, setWsloading] = useState(true);

  const { userEmail, userRole, isLoggedIn, loading, logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // const socket = new WebSocket("ws://localhost:5000");
    const socket = new WebSocket(API_URL.replace(/^http/, "ws"));
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWsloading(false);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Message from server:", data);
      setMessages((prev) => [...prev, data]);
      setLastEvent(data);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.close();
      setWsloading(true);
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

  const sendMessage = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send("Hello from Dashboard!");
    }
  };

  if (loading) {
    return <p>loading...</p>;
  }
  if (wsloading) {
    return <p>connecting...</p>;
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

        {messages.map((message, index) => (
          <p key={index}>{message.message}</p>
        ))}
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

        <button onClick={sendMessage} className="dashbtn">
          <span>Send WebSocket Message</span>
        </button>
      </div>

      <Sessions />
      <ShortUrls lastEvent={lastEvent} />
    </div>
  );
};

export default Dashboard;
