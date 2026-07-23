import React, { useState } from "react";
import { loginRestaurant } from "../api.js";
import { LogoLockup } from "./Logo.jsx";

export default function Login({ onLogin, onGoAdmin }) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const restaurant = await loginRestaurant(code.trim(), password);
      onLogin(restaurant);
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
        <p className="sub">لوحة تحكم المطعم — استلم الأوردرات لحظة بلحظة</p>
        <input
          placeholder="كود المطعم"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        <input
          placeholder="الباسورد"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="error-text">{error}</div>}
        <button className="btn btn-primary" disabled={loading || !code || !password}>
          {loading ? "جارٍ الدخول..." : "دخول"}
        </button>
        <button type="button" className="btn-link" onClick={onGoAdmin}>
          دخول كأدمن
        </button>
      </form>
    </div>
  );
}
