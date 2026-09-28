import React from "react";
import {
  Layots,
  Content,
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  Dashboard,
  ChangePassword,
  Chat,
} from "./components";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./authContext";
import { SocketProvider } from "./socketContext";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
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
                <Route path="/change-password" element={<ChangePassword />} />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/chat" element={<Chat />} />
              </Routes>
            </Layots>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
