import React, { useState } from "react";
import { loginAdmin } from "../api.js";
import { LogoLockup } from "./Logo.jsx";

export default function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginAdmin(username.trim(), password);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <LogoLockup height={64} />
        <p className="sub">لوحة تحكم الأدمن — إدارة المطاعم والمنيوهات</p>
        <input placeholder="اسم المستخدم" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input placeholder="الباسورد" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error-text">{error}</div>}
        <button className="btn btn-primary" disabled={loading || !username || !password}>
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>
        <button type="button" className="btn-link" onClick={onBack}>رجوع</button>
      </form>
    </div>
  );
}
