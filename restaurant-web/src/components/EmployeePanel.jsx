import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  API_BASE, employeeFetchOrders, employeeQueue, employeeAssign,
  employeeEditOrder, employeeCancelOrder, employeeReceipt,
} from "../api.js";
import { LogoMark } from "./Logo.jsx";

const STATUS_LABELS = {
  pending: "بانتظار المطعم",
  accepted: "جاهز للتوزيع",
  preparing: "مع الكابتن",
  out_for_delivery: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  rejected: "مرفوض",
};
const STATUS_FILTERS = ["", "pending", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];

export default function EmployeePanel({ employee, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [queue, setQueueState] = useState({ queue: [], next: null });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const socketRef = useRef(null);

  function reload() {
    employeeFetchOrders({ status: status || undefined, search: search || undefined }).then(setOrders);
    employeeQueue().then(setQueueState);
  }

  useEffect(() => {
    reload();
    const socket = io(API_BASE);
    socketRef.current = socket;
    socket.emit("employee:join");
    socket.on("order:new", () => reload());
    socket.on("order:ready", () => reload());
    socket.on("admin:live", () => employeeQueue().then(setQueueState));
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleSearch(e) {
    e.preventDefault();
    reload();
  }

  async function handleAssign(orderId, courierId) {
    try {
      await employeeAssign(orderId, courierId);
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCancel(orderId) {
    if (!confirm("متأكد من إلغاء الأوردر؟")) return;
    await employeeCancelOrder(orderId);
    reload();
  }

  function startEdit(order) {
    setEditingId(order.id);
    setEditDraft({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      addressText: order.addressText || "",
      total: order.total,
    });
  }

  async function saveEdit(orderId) {
    await employeeEditOrder(orderId, { ...editDraft, total: Number(editDraft.total) });
    setEditingId(null);
    reload();
  }

  async function showReceipt(orderId) {
    const { receiptHtml, qrDataUrl, orderCode } = await employeeReceipt(orderId);
    const win = window.open("", "_blank", "width=420,height=720");
    win.document.write(receiptHtml.replace(
      "</body>",
      `<div style="text-align:center;margin-top:10px"><img src="${qrDataUrl}" width="140"/><div style="font-family:monospace;font-size:12px">${orderCode}</div></div></body>`
    ));
    win.document.close();
    win.onload = () => win.print();
  }

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <LogoMark size={34} />
          <div>MAESTRO<small>لوحة الموظفين — {employee.name}</small></div>
        </div>
        <div className="restaurant-pill" onClick={onLogout} style={{ cursor: "pointer" }}>خروج</div>
      </div>

      <div className="dashboard employee-layout">
        <div className="employee-main">
          <form className="employee-toolbar" onSubmit={handleSearch}>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s ? STATUS_LABELS[s] : "كل الحالات"}</option>
              ))}
            </select>
            <input placeholder="بحث برقم الأوردر / تليفون / اسم العميل" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn btn-outline" type="submit">بحث</button>
          </form>

          <div className="orders-grid">
            {orders.map((o) => (
              <div className="order-card" key={o.id}>
                <span className={`status-badge status-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
                <div className="order-id mono">{o.orderCode || o.id}</div>
                <h3>{o.type === "custom" ? "اطلب أي شيء" : `${o.total} ج.م`}</h3>

                {o.type === "custom" ? (
                  <p style={{ color: "var(--text-soft)", fontSize: 13 }}>{o.customDescription}</p>
                ) : (
                  <ul className="order-items">
                    {o.items.map((it, i) => (
                      <li key={i}><span>{it.qty}x {it.name}</span><span>{it.price * it.qty} ج.م</span></li>
                    ))}
                  </ul>
                )}

                {editingId === o.id ? (
                  <div className="admin-form" style={{ marginBottom: 10 }}>
                    <input placeholder="اسم العميل" value={editDraft.customerName} onChange={(e) => setEditDraft({ ...editDraft, customerName: e.target.value })} />
                    <input placeholder="تليفون" value={editDraft.customerPhone} onChange={(e) => setEditDraft({ ...editDraft, customerPhone: e.target.value })} />
                    <input placeholder="العنوان" value={editDraft.addressText} onChange={(e) => setEditDraft({ ...editDraft, addressText: e.target.value })} />
                    <input placeholder="الإجمالي" value={editDraft.total} onChange={(e) => setEditDraft({ ...editDraft, total: e.target.value })} />
                    <button className="btn btn-accept" onClick={() => saveEdit(o.id)}>حفظ</button>
                    <button className="btn-link" onClick={() => setEditingId(null)}>إلغاء</button>
                  </div>
                ) : (
                  <>
                    <div className="order-location">{o.customerName || "عميل"} — {o.customerPhone}</div>
                    <a href={o.mapsUrl} target="_blank" rel="noreferrer">📍 موقع التسليم</a>
                  </>
                )}

                {o.courierId ? (
                  <div className="muted" style={{ marginBottom: 10 }}>مسند لكابتن: {o.courierId}</div>
                ) : (o.status === "accepted" || o.status === "pending" && o.type === "custom") ? (
                  <div className="menu-add-row">
                    <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => handleAssign(o.id)}>
                      إسناد لأقرب كابتن في الدور
                    </button>
                    <select onChange={(e) => e.target.value && handleAssign(o.id, e.target.value)} defaultValue="">
                      <option value="" disabled>أو اختار كابتن...</option>
                      {queue.queue.filter((c) => c.status === "available").map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="order-actions">
                  {editingId !== o.id && !["delivered", "cancelled", "rejected"].includes(o.status) && (
                    <button className="btn btn-outline" onClick={() => startEdit(o)}>تعديل</button>
                  )}
                  <button className="btn btn-print" onClick={() => showReceipt(o.id)}>فاتورة + QR</button>
                  {!["delivered", "cancelled", "rejected"].includes(o.status) && (
                    <button className="btn btn-reject" onClick={() => handleCancel(o.id)}>إلغاء</button>
                  )}
                </div>
              </div>
            ))}
            {orders.length === 0 && <div className="empty-state">مفيش أوردرات مطابقة</div>}
          </div>
        </div>

        <aside className="employee-queue">
          <h3>دور الكباتن</h3>
          {queue.next && (
            <div className="queue-next">التالي في الدور: <strong>{queue.next.name}</strong></div>
          )}
          <ul className="queue-list">
            {queue.queue.map((c) => (
              <li key={c.id} className={`queue-status-${c.status}`}>
                <span>{c.name}</span>
                <span className="muted">{{
                  available: "متاح", busy: "في طلب", returning: "راجع للمقر", off_duty: "برا الخدمة",
                }[c.status]}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
