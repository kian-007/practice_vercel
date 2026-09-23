import React from "react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../authContext";
import { useNavigate } from "react-router-dom";
import "./changePassword.css";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("Change password");
  const [success, setSuccess] = useState(undefined);
  const [loading, setLoading] = useState(undefined);
  const boxRef = useRef(null);
  const changePassRef = useRef(null);
  const { logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    boxRef.current?.classList.add("show");
    changePassRef.current?.classList.add("show");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (newPassword === currentPassword) {
      setSuccess(false);
      setMessage("Passwords must be defferent.");
      return;
    }
    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(data.message || "Password change failed");
        setSuccess(false);
        return;
      }
      setSuccess(true);
      // موفق شد
      setMessage(data.message);

      setTimeout(() => {
        logout();
        navigate("/login");
      }, 750);
    } catch (err) {
      setSuccess(false);
      console.error(err);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={boxRef}>
      <div ref={changePassRef} className="changePass">
        <span
          className={
            success === undefined
              ? "neutral-message"
              : success
                ? "success-message"
                : "failed-message"
          }
        >
          {message && <p>{message}</p>}
        </span>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button className="btn" type="submit">
            <span>{loading ? "changing..." : "Change Password"}</span>
          </button>
          {/* Forgot Password */}
          <button type="button" onClick={() => navigate("/forgot-password")}>
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
