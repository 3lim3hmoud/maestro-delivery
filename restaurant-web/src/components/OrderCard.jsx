import React from "react";

const NEXT_STEP = {
  accepted: { label: "بدء التحضير", next: "preparing" },
  preparing: { label: "خرج للتوصيل", next: "out_for_delivery" },
  out_for_delivery: { label: "تم التسليم", next: "delivered" },
};

export default function OrderCard({ order, isNew, statusLabel, onAccept, onReject, onAdvance, readonly }) {
  const step = NEXT_STEP[order.status];

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

      {!readonly && step && (
        <div className="order-actions">
          <button className="btn btn-print" onClick={() => onAdvance(step.next)}>{step.label}</button>
        </div>
      )}
    </div>
  );
}
