import React from "react";

export default function OrderCard({ order, isNew, statusLabel, onAccept, onReject, readonly }) {
  return (
    <div className={`order-card ${isNew ? "is-new" : ""}`}>
      <span className={`status-badge status-${order.status}`}>{statusLabel}</span>
      <div className="order-id mono">{order.id}</div>
      <h3>{order.customerName || "عميل"}</h3>

      <ul className="order-items">
        {order.items.map((it, i) => (
          <li key={i}>
            <span>{it.qty}× {it.name}</span>
            <span>{it.price * it.qty} ج.م</span>
          </li>
        ))}
      </ul>

      <div className="order-total">
        <span>الإجمالي</span>
        <span>{order.total} ج.م</span>
      </div>

      <div className="order-location">
        <a href={order.mapsUrl} target="_blank" rel="noreferrer">📍 موقع العميل على الخريطة</a>
      </div>

      {!readonly && onAccept && (
        <div className="order-actions">
          <button className="btn btn-accept" onClick={onAccept}>قبول وطباعة</button>
          <button className="btn btn-reject" onClick={onReject}>رفض</button>
        </div>
      )}

      {/* بعد القبول، الأوردر بيبقى متاح للكباتن يستلموه، والمطعم بيتابع حالته هنا بس من غير تحكم */}
    </div>
  );
}
