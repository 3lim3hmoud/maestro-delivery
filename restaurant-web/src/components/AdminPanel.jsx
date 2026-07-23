import React, { useEffect, useState } from "react";
import {
  adminFetchRestaurants, adminCreateRestaurant, adminAddMenuItem,
  adminDeleteMenuItem, adminSetPrinter,
} from "../api.js";
import { LogoMark } from "./Logo.jsx";

export default function AdminPanel({ onLogout }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRest, setNewRest] = useState({ name: "", code: "", password: "", phone: "", lat: "", lng: "" });
  const [menuDraft, setMenuDraft] = useState({}); // { [restaurantId]: { name, price } }

  function reload() {
    setLoading(true);
    adminFetchRestaurants().then(setRestaurants).finally(() => setLoading(false));
  }
  useEffect(reload, []);

  async function handleCreateRestaurant(e) {
    e.preventDefault();
    await adminCreateRestaurant({
      ...newRest,
      lat: newRest.lat ? Number(newRest.lat) : null,
      lng: newRest.lng ? Number(newRest.lng) : null,
    });
    setNewRest({ name: "", code: "", password: "", phone: "", lat: "", lng: "" });
    reload();
  }

  async function handleAddMenuItem(restaurantId) {
    const draft = menuDraft[restaurantId];
    if (!draft?.name || !draft?.price) return;
    await adminAddMenuItem(restaurantId, draft.name, Number(draft.price));
    setMenuDraft((prev) => ({ ...prev, [restaurantId]: { name: "", price: "" } }));
    reload();
  }

  async function handlePrinterChange(restaurantId, mode, ip) {
    await adminSetPrinter(restaurantId, mode, ip, "epson");
    reload();
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <LogoMark height={36} />
        <h2>لوحة تحكم الأدمن</h2>
        <button className="btn btn-outline" onClick={onLogout}>خروج</button>
      </div>

      <section className="admin-section">
        <h3>إضافة مطعم جديد</h3>
        <form className="admin-form" onSubmit={handleCreateRestaurant}>
          <input placeholder="اسم المطعم" value={newRest.name} onChange={(e) => setNewRest({ ...newRest, name: e.target.value })} required />
          <input placeholder="كود الدخول" value={newRest.code} onChange={(e) => setNewRest({ ...newRest, code: e.target.value })} required />
          <input placeholder="باسورد" type="password" value={newRest.password} onChange={(e) => setNewRest({ ...newRest, password: e.target.value })} required />
          <input placeholder="رقم الموبايل" value={newRest.phone} onChange={(e) => setNewRest({ ...newRest, phone: e.target.value })} />
          <input placeholder="Lat" value={newRest.lat} onChange={(e) => setNewRest({ ...newRest, lat: e.target.value })} />
          <input placeholder="Lng" value={newRest.lng} onChange={(e) => setNewRest({ ...newRest, lng: e.target.value })} />
          <button className="btn btn-primary">إضافة</button>
        </form>
      </section>

      <section className="admin-section">
        <h3>المطاعم الحالية</h3>
        {loading && <p>جارٍ التحميل...</p>}
        {restaurants.map((r) => (
          <div className="admin-restaurant-card" key={r.id}>
            <div className="admin-restaurant-head">
              <strong>{r.name}</strong>
              <span className="muted"> — كود: {r.code}</span>
            </div>

            <ul className="menu-list">
              {r.menu.map((m) => (
                <li key={m.id}>
                  {m.name} — {m.price} ج.م
                  <button className="btn-link danger" onClick={async () => { await adminDeleteMenuItem(m.id); reload(); }}>حذف</button>
                </li>
              ))}
            </ul>

            <div className="menu-add-row">
              <input
                placeholder="صنف جديد"
                value={menuDraft[r.id]?.name || ""}
                onChange={(e) => setMenuDraft({ ...menuDraft, [r.id]: { ...menuDraft[r.id], name: e.target.value } })}
              />
              <input
                placeholder="السعر"
                value={menuDraft[r.id]?.price || ""}
                onChange={(e) => setMenuDraft({ ...menuDraft, [r.id]: { ...menuDraft[r.id], price: e.target.value } })}
              />
              <button className="btn btn-outline" onClick={() => handleAddMenuItem(r.id)}>إضافة صنف</button>
            </div>

            <div className="printer-row">
              <span>وضع الطباعة:</span>
              <select
                defaultValue={r.printerMode}
                onChange={(e) => handlePrinterChange(r.id, e.target.value, r.printerIp)}
              >
                <option value="browser">نافذة المتصفح</option>
                <option value="network">طابعة شبكة (ESC/POS)</option>
              </select>
              {r.printerMode === "network" && (
                <input
                  placeholder="IP الطابعة"
                  defaultValue={r.printerIp || ""}
                  onBlur={(e) => handlePrinterChange(r.id, "network", e.target.value)}
                />
              )}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
