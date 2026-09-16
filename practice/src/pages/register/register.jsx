import React from "react";
import { useState, useEffect } from "react";
import "./register.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Please Register First ^_^");
  const [success, setSuccess] = useState();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    console.log(data);
    if (data.success === true) {
      setMessage(data.message);
      setSuccess(true);

      setTimeout(() => navigate("/login"), 500);
    } else {
      setMessage(data.message);
      setSuccess(false);
    }
  };

  return (
    <div>
      <span className="page">
        <Link to="/register">Register</Link>|<Link to="/login">Login</Link>
      </span>

      <div className="register">
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
            <span>Register</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
