require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");

const db = require("./db");
const auth = require("./auth");
const { buildReceiptHtml, printToNetworkPrinter } = require("./print");
const { notifyOrderStatus } = require("./push");

const app = express();
app.use(cors());
app.use(express.json());

// Basic abuse protection: generous limit for reads, tighter for order creation.
app.use("/api/", rateLimit({ windowMs: 60 * 1000, max: 120 }));
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 4000;

function restaurantRoom(id) { return `restaurant:${id}`; }
function orderRoom(id) { return `order:${id}`; }
const COURIERS_ROOM = "couriers:all";

// ---------- Socket.io ----------
io.on("connection", (socket) => {
  socket.on("restaurant:join", ({ restaurantId }) => socket.join(restaurantRoom(restaurantId)));
  socket.on("order:track", ({ orderId }) => socket.join(orderRoom(orderId)));
  socket.on("courier:join", () => socket.join(COURIERS_ROOM));

  // Courier's phone streams its live GPS while an order is out for delivery.
  socket.on("courier:location", ({ orderId, lat, lng }) => {
    io.to(orderRoom(orderId)).emit("courier:location", { orderId, lat, lng });
  });
});

// ---------- Helpers ----------
function rowToOrder(row) {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name || undefined,
    courierId: row.courier_id,
    items: JSON.parse(row.items_json),
    total: row.total,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    paymentMethod: row.payment_method,
    location: { lat: row.lat, lng: row.lng },
    mapsUrl: row.maps_url,
    status: row.status,
    courierRating: row.courier_rating || null,
    ratingComment: row.rating_comment || null,
    createdAt: row.created_at,
  };
}
function restaurantPublic(row) {
  const menu = db.prepare("SELECT id, name, price FROM menu_items WHERE restaurant_id = ?").all(row.id);
  return { id: row.id, name: row.name, location: { lat: row.lat, lng: row.lng }, menu };
}

// ================= Public: restaurants & menu =================
app.get("/api/restaurants", (req, res) => {
  const rows = db.prepare("SELECT * FROM restaurants").all();
  res.json(rows.map(restaurantPublic));
});

// ================= Auth =================
app.post("/api/auth/restaurant/login", (req, res) => {
  const { code, password } = req.body;
  const row = db.prepare("SELECT * FROM restaurants WHERE code = ?").get(code);
  if (!row || !auth.compare(password || "", row.password_hash)) {
    return res.status(401).json({ error: "كود المطعم أو الباسورد غلط" });
  }
  const token = auth.signToken({ role: "restaurant", restaurantId: row.id });
  res.json({ token, restaurant: restaurantPublic(row) });
});

app.post("/api/auth/courier/login", (req, res) => {
  const { code, password } = req.body;
  const row = db.prepare("SELECT * FROM couriers WHERE code = ?").get(code);
  if (!row || !auth.compare(password || "", row.password_hash)) {
    return res.status(401).json({ error: "كود الكابتن أو الباسورد غلط" });
  }
  const token = auth.signToken({ role: "courier", courierId: row.id });
  res.json({ token, courier: { id: row.id, name: row.name } });
});

app.post("/api/auth/admin/login", (req, res) => {
  const { username, password } = req.body;
  const row = db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (!row || !auth.compare(password || "", row.password_hash)) {
    return res.status(401).json({ error: "بيانات دخول الأدمن غلط" });
  }
  const token = auth.signToken({ role: "admin", adminId: row.id });
  res.json({ token });
});

// ================= Orders: customer-facing =================
app.post("/api/orders", orderLimiter, (req, res) => {
  const { restaurantId, items, customerName, customerPhone, location, paymentMethod, pushToken } = req.body;

  if (!restaurantId || !items?.length || !location?.lat || !location?.lng) {
    return res.status(400).json({ error: "بيانات الأوردر ناقصة (المطعم / الأصناف / الموقع)" });
  }
  const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(restaurantId);
  if (!restaurant) return res.status(404).json({ error: "المطعم غير موجود" });

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const id = `ord_${nanoid(8)}`;
  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO orders (id, restaurant_id, items_json, total, customer_name, customer_phone,
                         customer_push_token, payment_method, lat, lng, maps_url, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, restaurantId, JSON.stringify(items), total, customerName || "", customerPhone || "",
         pushToken || null, paymentMethod || "cash", location.lat, location.lng, mapsUrl, createdAt);

  const order = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id));
  io.to(restaurantRoom(restaurantId)).emit("order:new", order);
  res.status(201).json(order);
});

app.get("/api/orders/:id", (req, res) => {
  const row = db.prepare(`
    SELECT o.*, r.name AS restaurant_name FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  res.json(rowToOrder(row));
});

// Customer order history — identified by phone number (no login system for customers yet)
app.get("/api/customers/orders", (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "رقم الهاتف مطلوب" });
  const rows = db.prepare(`
    SELECT o.*, r.name AS restaurant_name FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    WHERE o.customer_phone = ?
    ORDER BY o.created_at DESC
  `).all(phone);
  res.json(rows.map(rowToOrder));
});

// Rate the courier/delivery experience — only allowed once the order is delivered
app.post("/api/orders/:id/rate", (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "التقييم لازم يكون من 1 لـ 5" });
  }
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.status !== "delivered") {
    return res.status(400).json({ error: "التقييم متاح بس بعد استلام الأوردر" });
  }
  db.prepare("UPDATE orders SET courier_rating = ?, rating_comment = ? WHERE id = ?")
    .run(rating, comment || null, req.params.id);
  res.json({ ok: true });
});

// ================= Restaurant dashboard (JWT-protected) =================
app.get("/api/restaurants/me/orders", auth.requireRole("restaurant"), (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC")
    .all(req.auth.restaurantId);
  res.json(rows.map(rowToOrder));
});

app.patch("/api/orders/:id/status", auth.requireRole("restaurant"), async (req, res) => {
  const { status } = req.body;
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.restaurant_id !== req.auth.restaurantId) return res.status(403).json({ error: "مش أوردر بتاعك" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(updated.restaurantId);

  io.to(orderRoom(updated.id)).emit("order:update", updated);
  notifyOrderStatus({ ...updated, customer_push_token: row.customer_push_token }).catch(() => {});

  let receiptHtml = null;
  if (status === "accepted") {
    receiptHtml = buildReceiptHtml(updated, restaurant);
    if (restaurant.printer_mode === "network" && restaurant.printer_ip) {
      try {
        await printToNetworkPrinter(updated, { printer: { ip: restaurant.printer_ip, type: restaurant.printer_type } });
      } catch (err) {
        console.error("Network print failed, falling back to browser receipt:", err.message);
      }
    }
    // Order becomes visible to couriers once the restaurant accepts it.
    io.to(COURIERS_ROOM).emit("order:available", updated);
  }

  res.json({ order: updated, receiptHtml });
});

// ================= Courier / captain app (JWT-protected) =================
app.get("/api/couriers/orders/available", auth.requireRole("courier"), (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE status = 'accepted' AND courier_id IS NULL ORDER BY created_at ASC").all();
  res.json(rows.map(rowToOrder));
});

app.get("/api/couriers/me/orders", auth.requireRole("courier"), (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE courier_id = ? AND status NOT IN ('delivered','rejected') ORDER BY created_at DESC").all(req.auth.courierId);
  res.json(rows.map(rowToOrder));
});

app.post("/api/couriers/orders/:id/claim", auth.requireRole("courier"), (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.courier_id) return res.status(409).json({ error: "أوردر خد بالفعل كابتن تاني" });

  db.prepare("UPDATE orders SET courier_id = ?, status = 'preparing' WHERE id = ?").run(req.auth.courierId, req.params.id);
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  io.to(orderRoom(updated.id)).emit("order:update", updated);
  io.to(COURIERS_ROOM).emit("order:claimed", { orderId: updated.id });
  res.json(updated);
});

app.patch("/api/couriers/orders/:id/status", auth.requireRole("courier"), (req, res) => {
  const { status } = req.body; // 'out_for_delivery' | 'delivered'
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.courier_id !== req.auth.courierId) return res.status(403).json({ error: "مش أوردر بتاعك" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  io.to(orderRoom(updated.id)).emit("order:update", updated);
  notifyOrderStatus({ ...updated, customer_push_token: row.customer_push_token }).catch(() => {});
  res.json(updated);
});

// ================= Admin (JWT-protected) =================
app.get("/api/admin/restaurants", auth.requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM restaurants").all();
  res.json(rows.map((r) => ({ ...restaurantPublic(r), code: r.code, phone: r.phone, printerMode: r.printer_mode, printerIp: r.printer_ip })));
});

app.post("/api/admin/restaurants", auth.requireRole("admin"), (req, res) => {
  const { name, code, password, phone, lat, lng } = req.body;
  if (!name || !code || !password) return res.status(400).json({ error: "الاسم/الكود/الباسورد مطلوبين" });
  const id = `rest_${nanoid(8)}`;
  db.prepare(`
    INSERT INTO restaurants (id, name, code, password_hash, phone, lat, lng, printer_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'browser')
  `).run(id, name, code, auth.hash(password), phone || "", lat || null, lng || null);
  res.status(201).json(restaurantPublic(db.prepare("SELECT * FROM restaurants WHERE id = ?").get(id)));
});

app.post("/api/admin/restaurants/:id/menu", auth.requireRole("admin"), (req, res) => {
  const { name, price } = req.body;
  if (!name || price == null) return res.status(400).json({ error: "اسم الصنف والسعر مطلوبين" });
  const id = `m_${nanoid(8)}`;
  db.prepare("INSERT INTO menu_items (id, restaurant_id, name, price) VALUES (?, ?, ?, ?)")
    .run(id, req.params.id, name, price);
  res.status(201).json({ id, name, price });
});

app.delete("/api/admin/menu/:itemId", auth.requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM menu_items WHERE id = ?").run(req.params.itemId);
  res.json({ ok: true });
});

app.patch("/api/admin/restaurants/:id/printer", auth.requireRole("admin"), (req, res) => {
  const { mode, ip, type } = req.body;
  db.prepare("UPDATE restaurants SET printer_mode = ?, printer_ip = ?, printer_type = ? WHERE id = ?")
    .run(mode || "browser", ip || null, type || "epson", req.params.id);
  res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`🎼 Maestro backend running on http://localhost:${PORT}`);
});
