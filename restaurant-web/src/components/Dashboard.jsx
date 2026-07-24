import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE, fetchOrders, updateOrderStatus } from "../api.js";
import OrderCard from "./OrderCard.jsx";
import { LogoMark } from "./Logo.jsx";

const STATUS_LABELS = {
  pending: "بانتظار الموافقة",
  accepted: "تم القبول",
  preparing: "جارٍ التحضير",
  out_for_delivery: "في الطريق",
  delivered: "تم التسليم",
  rejected: "مرفوض",
};

export default function Dashboard({ restaurant, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    fetchOrders().then(setOrders);

    const socket = io(API_BASE);
    socketRef.current = socket;
    socket.emit("restaurant:join", { restaurantId: restaurant.id });

    socket.on("order:new", (order) => {
      // ping browser notification, the "baton tap"
      if (Notification && Notification.permission === "granted") {
        new Notification("⚡ أوردر جديد من المايسترو", {
          body: `${order.items.length} صنف - إجمالي ${order.total} جنيه`,
        });
      }
      setOrders((prev) => [order, ...prev]);
      setNewIds((prev) => new Set(prev).add(order.id));
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }, 2500);
    });

    return () => socket.disconnect();
  }, [restaurant.id]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  async function handleStatus(order, status) {
    const { order: updated, receiptHtml } = await updateOrderStatus(order.id, status);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    if (status === "accepted" && receiptHtml) printReceipt(receiptHtml);
  }

  function printReceipt(html) {
    const win = window.open("", "_blank", "width=380,height=600");
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }

  const pending = orders.filter((o) => o.status === "pending");
  const active = orders.filter((o) => !["pending", "delivered", "rejected"].includes(o.status));
  const done = orders.filter((o) => ["delivered", "rejected"].includes(o.status));

  return (
    <div>
      <div className="topbar">
        <div className="brand">
          <LogoMark size={34} />
          <div>
            MAESTRO
            <small>{restaurant.name}</small>
          </div>
        </div>
        <div className="restaurant-pill" onClick={onLogout} style={{ cursor: "pointer" }}>
          خروج
        </div>
      </div>

      <div className="dashboard">
        <Section title={`أوردرات جديدة (${pending.length})`}>
          <Grid>
            {pending.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                isNew={newIds.has(o.id)}
                statusLabel={STATUS_LABELS[o.status]}
                onAccept={() => handleStatus(o, "accepted")}
                onReject={() => handleStatus(o, "rejected")}
              />
            ))}
          </Grid>
          {pending.length === 0 && <Empty text="مفيش أوردرات جديدة دلوقتي ⚡" />}
        </Section>

        <Section title={`جارية (${active.length})`}>
          <Grid>
            {active.map((o) => (
              <OrderCard key={o.id} order={o} statusLabel={STATUS_LABELS[o.status]} readonly />
            ))}
          </Grid>
          {active.length === 0 && <Empty text="لا يوجد أوردرات جارية" />}
        </Section>

        <Section title={`مكتملة (${done.length})`}>
          <Grid>
            {done.slice(0, 6).map((o) => (
              <OrderCard key={o.id} order={o} statusLabel={STATUS_LABELS[o.status]} readonly />
            ))}
          </Grid>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="section-title">
        <span>{title}</span>
        <div className="staffline" />
      </div>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return <div className="orders-grid">{children}</div>;
}

function Empty({ text }) {
  return <div className="empty-state">{text}</div>;
}
