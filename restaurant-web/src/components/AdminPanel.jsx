import React, { useEffect, useState } from "react";
import {
  adminFetchRestaurants, adminCreateRestaurant, adminAddMenuItem,
  adminDeleteMenuItem, adminSetPrinter, adminSetRestaurantActive,
  adminLiveReport, adminRangeReport,
  adminFetchCouriers, adminCreateCourier,
  adminFetchEmployees, adminCreateEmployee, adminSetEmployeeActive,
  adminFetchCustomers, adminBlockCustomer,
} from "../api.js";
import { LogoMark } from "./Logo.jsx";

const TABS = [
  { id: "restaurants", label: "المطاعم" },
  { id: "reports", label: "التقارير" },
  { id: "couriers", label: "الكباتن" },
  { id: "employees", label: "الموظفين" },
  { id: "customers", label: "العملاء" },
];

export default function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState("restaurants");

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <LogoMark height={36} />
        <h2>لوحة تحكم الأدمن</h2>
        <button className="btn btn-outline" onClick={onLogout}>خروج</button>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "restaurants" && <RestaurantsTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "couriers" && <CouriersTab />}
      {tab === "employees" && <EmployeesTab />}
      {tab === "customers" && <CustomersTab />}
    </div>
  );
}

// ================= Restaurants =================
function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRest, setNewRest] = useState({ name: "", code: "", password: "", phone: "", lat: "", lng: "" });
  const [menuDraft, setMenuDraft] = useState({});

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

  async function handleToggleActive(r) {
    await adminSetRestaurantActive(r.id, !r.active);
    reload();
  }

  return (
    <>
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
              <span className="muted"> — كود: {r.code} — {r.active ? "شغال" : "متوقف"}</span>
              <button className="btn-link" onClick={() => handleToggleActive(r)}>{r.active ? "إيقاف" : "تشغيل"}</button>
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
    </>
  );
}

// ================= Reports =================
function ReportsTab() {
  const [live, setLive] = useState(null);
  const [range, setRange] = useState("daily");
  const [report, setReport] = useState(null);

  useEffect(() => {
    adminLiveReport().then(setLive);
    const iv = setInterval(() => adminLiveReport().then(setLive), 15000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { adminRangeReport(range).then(setReport); }, [range]);

  const LIVE_CARDS = live ? [
    ["newOrders", "📦 طلبات جديدة"], ["outForDelivery", "🚚 جاري التوصيل"],
    ["completedToday", "✅ مكتمل اليوم"], ["cancelledToday", "❌ ملغي اليوم"],
    ["couriersAvailable", "👨‍✈️ كباتن متاحين"], ["couriersBusy", "🛵 كباتن في مشاوير"],
    ["restaurants", "🍔 عدد المطاعم"], ["customers", "👥 عدد العملاء"],
    ["revenueToday", "💰 تحصيل اليوم"], ["revenueMonth", "📈 تحصيل الشهر"],
  ] : [];

  return (
    <>
      <section className="admin-section">
        <h3>لحظيًا</h3>
        <div className="report-cards">
          {LIVE_CARDS.map(([key, label]) => (
            <div className="report-card" key={key}>
              <div className="num">{live[key]}</div>
              <div className="label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h3>تقارير حسب الفترة</h3>
        <div className="admin-tabs" style={{ marginBottom: 14 }}>
          {["daily", "weekly", "monthly", "yearly"].map((r) => (
            <button key={r} className={range === r ? "active" : ""} onClick={() => setRange(r)}>
              {{ daily: "يومي", weekly: "أسبوعي", monthly: "شهري", yearly: "سنوي" }[r]}
            </button>
          ))}
        </div>

        {report && (
          <>
            <p>متوسط زمن التوصيل: <strong>{report.avgDeliveryMinutes != null ? `${report.avgDeliveryMinutes} دقيقة` : "—"}</strong></p>

            <h4>حسب المطعم</h4>
            <table className="report-table">
              <thead><tr><th>المطعم</th><th>الطلبات</th><th>الإيراد</th></tr></thead>
              <tbody>{report.byRestaurant.map((r) => (
                <tr key={r.id}><td>{r.name}</td><td>{r.orders}</td><td>{r.revenue} ج.م</td></tr>
              ))}</tbody>
            </table>

            <h4>حسب الكابتن</h4>
            <table className="report-table">
              <thead><tr><th>الكابتن</th><th>عدد التوصيلات</th><th>الإيراد</th><th>التقييم</th></tr></thead>
              <tbody>{report.byCourier.map((c) => (
                <tr key={c.id}><td>{c.name}</td><td>{c.deliveries}</td><td>{c.revenue} ج.م</td><td>{c.rating ?? "—"}</td></tr>
              ))}</tbody>
            </table>

            <h4>أكثر عملاء طلبًا</h4>
            <table className="report-table">
              <thead><tr><th>العميل</th><th>تليفون</th><th>عدد الطلبات</th></tr></thead>
              <tbody>{report.byCustomer.map((c) => (
                <tr key={c.phone}><td>{c.name || "—"}</td><td>{c.phone}</td><td>{c.orders}</td></tr>
              ))}</tbody>
            </table>

            <h4>أكثر منتجات مبيعًا</h4>
            <table className="report-table">
              <thead><tr><th>الصنف</th><th>الكمية</th></tr></thead>
              <tbody>{report.topProducts.map((p) => (
                <tr key={p.name}><td>{p.name}</td><td>{p.qty}</td></tr>
              ))}</tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}

// ================= Couriers =================
function CouriersTab() {
  const [couriers, setCouriers] = useState([]);
  const [draft, setDraft] = useState({ name: "", code: "", password: "", phone: "" });

  function reload() { adminFetchCouriers().then(setCouriers); }
  useEffect(reload, []);

  async function handleCreate(e) {
    e.preventDefault();
    await adminCreateCourier(draft);
    setDraft({ name: "", code: "", password: "", phone: "" });
    reload();
  }

  return (
    <section className="admin-section">
      <h3>إضافة كابتن</h3>
      <form className="admin-form" onSubmit={handleCreate}>
        <input placeholder="الاسم" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        <input placeholder="كود الدخول" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
        <input placeholder="باسورد" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} required />
        <input placeholder="رقم الموبايل" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        <button className="btn btn-primary">إضافة</button>
      </form>

      <table className="report-table" style={{ marginTop: 16 }}>
        <thead><tr><th>الاسم</th><th>الحالة</th><th>التقييم</th></tr></thead>
        <tbody>{couriers.map((c) => (
          <tr key={c.id}>
            <td>{c.name}</td>
            <td>{{ available: "متاح", busy: "في طلب", returning: "راجع للمقر", off_duty: "برا الخدمة" }[c.status]}</td>
            <td>{c.rating ?? "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

// ================= Employees =================
function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [draft, setDraft] = useState({ name: "", code: "", password: "", role: "dispatcher" });

  function reload() { adminFetchEmployees().then(setEmployees); }
  useEffect(reload, []);

  async function handleCreate(e) {
    e.preventDefault();
    await adminCreateEmployee(draft);
    setDraft({ name: "", code: "", password: "", role: "dispatcher" });
    reload();
  }

  return (
    <section className="admin-section">
      <h3>إضافة موظف</h3>
      <form className="admin-form" onSubmit={handleCreate}>
        <input placeholder="الاسم" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        <input placeholder="كود الدخول" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
        <input placeholder="باسورد" type="password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} required />
        <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
          <option value="dispatcher">موظف استقبال</option>
          <option value="supervisor">مشرف</option>
        </select>
        <button className="btn btn-primary">إضافة</button>
      </form>

      <table className="report-table" style={{ marginTop: 16 }}>
        <thead><tr><th>الاسم</th><th>الدور</th><th>الحالة</th><th></th></tr></thead>
        <tbody>{employees.map((e) => (
          <tr key={e.id}>
            <td>{e.name}</td>
            <td>{e.role === "supervisor" ? "مشرف" : "موظف استقبال"}</td>
            <td>{e.active ? "شغال" : "متوقف"}</td>
            <td>
              <button className="btn-link" onClick={async () => { await adminSetEmployeeActive(e.id, !e.active); reload(); }}>
                {e.active ? "إيقاف" : "تشغيل"}
              </button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}

// ================= Customers =================
function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  function reload() { adminFetchCustomers().then(setCustomers); }
  useEffect(reload, []);

  return (
    <section className="admin-section">
      <h3>العملاء</h3>
      <table className="report-table">
        <thead><tr><th>الاسم</th><th>تليفون</th><th>التقييم</th><th>الحالة</th><th></th></tr></thead>
        <tbody>{customers.map((c) => (
          <tr key={c.phone}>
            <td>{c.name || "—"}</td>
            <td>{c.phone}</td>
            <td>{c.rating ?? "—"}</td>
            <td>{c.blocked ? "محظور" : "عادي"}</td>
            <td>
              <button className="btn-link danger" onClick={async () => { await adminBlockCustomer(c.phone, !c.blocked); reload(); }}>
                {c.blocked ? "إلغاء الحظر" : "حظر"}
              </button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}
