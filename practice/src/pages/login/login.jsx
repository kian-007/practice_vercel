import React from "react";
import { useState } from "react";
import "./login.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Please login ^_^");
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [success, setSuccess] = useState();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    setMessage("loading...");
    e.preventDefault();
    if (loading) setMessage("Loading...");

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        await login();
        setSuccess(true);
        setMessage(data.message);
        setTimeout(() => navigate("/dashboard"), 500);
      } else {
        setSuccess(false);
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setSuccess(false);
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      <span className="page">
        <Link to="/register">Register</Link>|<Link to="/login">Login</Link>
      </span>
      <div className="login">
        <span
          className={
            success === undefined
              ? "neutral-message"
              : success
                ? "success-message"
                : "failed-message"
          }
        >
          {message}
        </span>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn" type="submit">
            <span>login</span>
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

export default Login;
