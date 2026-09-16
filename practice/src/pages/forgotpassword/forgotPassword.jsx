import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./forgotPassword.css";

const API_URL = import.meta.env.VITE_API_URL;

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Something went wrong");
        return;
      }

      // Backend عمداً برای ایمیل موجود و غیرموجود
      // پیام مشابه برمی‌گرداند.
      setMessage(data.message);
    } catch (err) {
      console.error(err);

      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Forgot Password</h1>

      <p>Enter your email and we'll send you a password reset link.</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
        </div>

        {error && <p>{error}</p>}

        {/* موفقیت */}
        {message && <p>{message}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <button type="button" onClick={() => navigate("/login")}>
        Back to Login
      </button>
    </div>
  );
}

export default ForgotPassword;
