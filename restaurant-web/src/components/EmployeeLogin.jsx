import React, { useState } from "react";
import { loginEmployee } from "../api.js";
import { LogoLockup } from "./Logo.jsx";

export default function EmployeeLogin({ onLogin, onBack }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const employee = await loginEmployee(code.trim(), password);
      onLogin(employee);
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
        <p className="sub">لوحة الموظفين — استقبال الأوردرات وتوزيعها على الكباتن</p>
        <input placeholder="كود الموظف" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        <input placeholder="الباسورد" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error-text">{error}</div>}
        <button className="btn btn-primary" disabled={loading || !code || !password}>
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>
        <button type="button" className="btn-link" onClick={onBack}>رجوع</button>
      </form>
    </div>
  );
}
