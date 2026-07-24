import React, { useState } from "react";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AdminLogin from "./components/AdminLogin.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import EmployeeLogin from "./components/EmployeeLogin.jsx";
import EmployeePanel from "./components/EmployeePanel.jsx";
import { logout, logoutEmployee } from "./api.js";

export default function App() {
  const [restaurant, setRestaurant] = useState(null);
  const [employee, setEmployee] = useState(null);
  // restaurant-login | admin-login | admin-panel | employee-login | employee-panel
  const [view, setView] = useState("restaurant-login");

  if (view === "admin-login") {
    return <AdminLogin onLogin={() => setView("admin-panel")} onBack={() => setView("restaurant-login")} />;
  }
  if (view === "admin-panel") {
    return <AdminPanel onLogout={() => setView("restaurant-login")} />;
  }
  if (view === "employee-login") {
    return (
      <EmployeeLogin
        onLogin={(emp) => { setEmployee(emp); setView("employee-panel"); }}
        onBack={() => setView("restaurant-login")}
      />
    );
  }
  if (view === "employee-panel") {
    return (
      <EmployeePanel
        employee={employee}
        onLogout={() => { logoutEmployee(); setEmployee(null); setView("restaurant-login"); }}
      />
    );
  }
  if (!restaurant) {
    return (
      <Login
        onLogin={setRestaurant}
        onGoAdmin={() => setView("admin-login")}
        onGoEmployee={() => setView("employee-login")}
      />
    );
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
