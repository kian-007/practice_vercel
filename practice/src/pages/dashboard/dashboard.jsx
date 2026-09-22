import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

import { useAuth } from "../../authContext";

import { Sessions, ShortUrls } from "../../components";

const Dashboard = () => {
  const navigate = useNavigate();

  const { userEmail, userRole, isLoggedIn, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/login");
    }
  }, [loading, isLoggedIn]);

  const handleLogoutAll = async () => {
    const confirmed = window.confirm("همه دستگاه ها از حساب خارج بشن؟");

    if (!confirmed) return;

    // این قسمت رو می‌تونیم بعداً هم ببریم داخل AuthContext
    await fetchWithAuth(`${API_URL}/logout-all`, {
      method: "POST",
    });

    logout();
  };

  if (loading) {
    return <p>loading...</p>;
  }

  return (
    <div className="dashboard">
      <div>
        {isLoggedIn && (
          <span>
            Welcome, {userEmail} - {userRole}
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

      <Sessions />

      <ShortUrls />
    </div>
  );
};

export default Dashboard;
