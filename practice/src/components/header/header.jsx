import React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./header.css";
import { useAuth } from "../../authContext";

const Header = () => {
  const { isLoggedIn, logout } = useAuth();

  useEffect(() => {
    window.onscroll = function () {
      const navbar = document.getElementById("navbar");
      if (window.scrollY > 100) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    };
  }, []);

  const handleLogout = (e) => {
    const confirmed = window.confirm("Are you sure you wanna logout?");
    if (confirmed) {
      logout();
    } else {
      e.preventDefault();
      return;
    }
  };

  return (
    <div className="header">
      <div id="navbar">
        <p>
          <Link to="/" className="header-link">
            Home
          </Link>
        </p>
        <p>
          {isLoggedIn ? (
            <Link to="/login" onClick={handleLogout} className="header-link">
              Logout
            </Link>
          ) : (
            <Link to="/login" className="header-link">
              Login
            </Link>
          )}
        </p>
        <p>
          <Link to="/dashboard" className="header-link">
            Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Header;
