import React from "react";
//import { Outlet } from "react-router-dom";
import "./layots.css";
import Footer from "../footer/footer";
import Header from "../header/header";

const Layots = ({ children }) => {
  return (
    <div id="layots">
      <Header />
      {children}
      <Footer />
    </div>
  );
};

export default Layots;
