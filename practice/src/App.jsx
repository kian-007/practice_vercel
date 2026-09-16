import React from "react";
import {
  Layots,
  Content,
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  Dashboard,
} from "./components";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./authContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app">
          <Layots>
            <Routes>
              <Route path="/" element={<Content />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layots>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
