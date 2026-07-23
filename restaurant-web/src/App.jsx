import React, { useState } from "react";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AdminLogin from "./components/AdminLogin.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import { logout } from "./api.js";

export default function App() {
  const [restaurant, setRestaurant] = useState(null);
  const [view, setView] = useState("restaurant-login"); // restaurant-login | admin-login | admin-panel

  if (view === "admin-login") {
    return <AdminLogin onLogin={() => setView("admin-panel")} onBack={() => setView("restaurant-login")} />;
  }
  if (view === "admin-panel") {
    return <AdminPanel onLogout={() => setView("restaurant-login")} />;
  }
  if (!restaurant) {
    return <Login onLogin={setRestaurant} onGoAdmin={() => setView("admin-login")} />;
  }
  return (
    <Dashboard
      restaurant={restaurant}
      onLogout={() => {
        logout();
        setRestaurant(null);
      }}
    />
  );
}
