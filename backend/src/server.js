require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");

const db = require("./db");
const auth = require("./auth");
const queue = require("./queue");
const reports = require("./reports");
const { nextOrderCode, buildOrderQr } = require("./qr");
const { buildReceiptHtml, printToNetworkPrinter } = require("./print");
const { notifyOrderStatus } = require("./push");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(require("path").join(__dirname, "..", "public")));

// Basic abuse protection: generous limit for reads, tighter for order creation.
app.use("/api/", rateLimit({ windowMs: 60 * 1000, max: 120 }));
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 4000;

function restaurantRoom(id) { return `restaurant:${id}`; }
function orderRoom(id) { return `order:${id}`; }
const COURIERS_ROOM = "couriers:all";
const EMPLOYEES_ROOM = "employees:all";
const BOARD_ROOM = "board:live";

function broadcastBoard() {
  io.to(BOARD_ROOM).emit("board:update", reports.boardOrders());
}
function broadcastLive() {
  io.to(EMPLOYEES_ROOM).emit("admin:live", reports.liveCounters());
}

// ---------- Socket.io ----------
io.on("connection", (socket) => {
  socket.on("restaurant:join", ({ restaurantId }) => socket.join(restaurantRoom(restaurantId)));
  socket.on("order:track", ({ orderId }) => socket.join(orderRoom(orderId)));
  socket.on("courier:join", () => socket.join(COURIERS_ROOM));
  socket.on("employee:join", () => socket.join(EMPLOYEES_ROOM));
  socket.on("board:join", () => {
    socket.join(BOARD_ROOM);
    socket.emit("board:update", reports.boardOrders());
  });

  // Courier's phone streams its live GPS while an order is out for delivery.
  socket.on("courier:location", ({ orderId, lat, lng }) => {
    io.to(orderRoom(orderId)).emit("courier:location", { orderId, lat, lng });
  });
});

// ---------- Helpers ----------
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function getSetting(key, fallback) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}
function withinServiceArea(lat, lng) {
  const hqLat = parseFloat(getSetting("hq_lat", "31.2089"));
  const hqLng = parseFloat(getSetting("hq_lng", "29.9092"));
  const radiusKm = parseFloat(getSetting("service_radius_km", "15"));
  return haversineKm(hqLat, hqLng, lat, lng) <= radiusKm;
}
function logEvent(orderId, actorType, actorId, action) {
  db.prepare("INSERT INTO order_events (order_id, actor_type, actor_id, action, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(orderId, actorType, actorId || null, action, Date.now());
}
function upsertCustomer(phone, name) {
  if (!phone) return;
  const existing = db.prepare("SELECT phone FROM customers WHERE phone = ?").get(phone);
  if (existing) {
    if (name) db.prepare("UPDATE customers SET name = ? WHERE phone = ?").run(name, phone);
  } else {
    db.prepare("INSERT INTO customers (phone, name) VALUES (?, ?)").run(phone, name || null);
  }
}

function rowToOrder(row) {
  return {
    id: row.id,
    orderCode: row.order_code,
    type: row.type,
    restaurantId: row.restaurant_id,
    courierId: row.courier_id,
    assignedBy: row.assigned_by,
    items: row.items_json ? JSON.parse(row.items_json) : [],
    customDescription: row.custom_description,
    pickup: row.pickup_lat != null ? { lat: row.pickup_lat, lng: row.pickup_lng, address: row.pickup_address } : null,
    total: row.total,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    paymentMethod: row.payment_method,
    location: { lat: row.lat, lng: row.lng },
    addressText: row.address_text,
    mapsUrl: row.maps_url,
    status: row.status,
    qrDataUrl: row.qr_data_url,
    customerRating: row.customer_rating,
    courierRatingOfCustomer: row.courier_rating_of_customer,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    outForDeliveryAt: row.out_for_delivery_at,
    deliveredAt: row.delivered_at,
  };
}
function restaurantPublic(row) {
  const menu = db.prepare("SELECT id, name, price FROM menu_items WHERE restaurant_id = ?").all(row.id);
  return { id: row.id, name: row.name, location: { lat: row.lat, lng: row.lng }, menu };
}
function courierPublic(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    status: row.status,
    rating: row.rating_count > 0 ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : null,
  };
}

async function attachQr(orderId) {
  const row = db.prepare("SELECT order_code FROM orders WHERE id = ?").get(orderId);
  const qrDataUrl = await buildOrderQr(orderId, row.order_code);
  db.prepare("UPDATE orders SET qr_data_url = ? WHERE id = ?").run(qrDataUrl, orderId);
  return qrDataUrl;
}

// ================= Public: restaurants, menu, settings =================
app.get("/api/restaurants", (req, res) => {
  const rows = db.prepare("SELECT * FROM restaurants WHERE active = 1").all();
  res.json(rows.map(restaurantPublic));
});

app.get("/api/settings/service-area", (req, res) => {
  res.json({
    hq: { lat: parseFloat(getSetting("hq_lat", "31.2089")), lng: parseFloat(getSetting("hq_lng", "29.9092")) },
    radiusKm: parseFloat(getSetting("service_radius_km", "15")),
  });
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
  res.json({ token, courier: courierPublic(row) });
});

app.post("/api/auth/employee/login", (req, res) => {
  const { code, password } = req.body;
  const row = db.prepare("SELECT * FROM employees WHERE code = ? AND active = 1").get(code);
  if (!row || !auth.compare(password || "", row.password_hash)) {
    return res.status(401).json({ error: "كود الموظف أو الباسورد غلط" });
  }
  const token = auth.signToken({ role: "employee", employeeId: row.id });
  res.json({ token, employee: { id: row.id, name: row.name, role: row.role } });
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

// ================= Orders: customer-facing (restaurant orders) =================
app.post("/api/orders", orderLimiter, async (req, res) => {
  const { restaurantId, items, customerName, customerPhone, location, addressText, paymentMethod, pushToken } = req.body;

  if (!restaurantId || !items?.length || !location?.lat || !location?.lng) {
    return res.status(400).json({ error: "بيانات الأوردر ناقصة (المطعم / الأصناف / الموقع)" });
  }
  const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(restaurantId);
  if (!restaurant) return res.status(404).json({ error: "المطعم غير موجود" });
  if (!withinServiceArea(location.lat, location.lng)) {
    return res.status(400).json({ error: "للأسف الموقع برا نطاق خدمة المايسترو حاليًا" });
  }

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const id = `ord_${nanoid(8)}`;
  const orderCode = nextOrderCode();
  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO orders (id, order_code, type, restaurant_id, items_json, total, customer_name, customer_phone,
                         customer_push_token, payment_method, lat, lng, address_text, maps_url, status, created_at)
    VALUES (?, ?, 'restaurant', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, orderCode, restaurantId, JSON.stringify(items), total, customerName || "", customerPhone || "",
         pushToken || null, paymentMethod || "cash", location.lat, location.lng, addressText || null, mapsUrl, createdAt);

  upsertCustomer(customerPhone, customerName);
  logEvent(id, "customer", customerPhone, "created");
  await attachQr(id);

  const order = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id));
  io.to(restaurantRoom(restaurantId)).emit("order:new", order);
  broadcastBoard();
  broadcastLive();
  res.status(201).json(order);
});

// ================= اطلب أي شيء (custom, non-restaurant requests) =================
app.post("/api/custom-requests", orderLimiter, async (req, res) => {
  const { description, pickup, dropoff, customerName, customerPhone, pushToken } = req.body;
  if (!description || !pickup?.lat || !dropoff?.lat) {
    return res.status(400).json({ error: "لازم توصف الطلب وتحدد موقع الاستلام والتسليم" });
  }
  if (!withinServiceArea(dropoff.lat, dropoff.lng)) {
    return res.status(400).json({ error: "للأسف موقع التسليم برا نطاق خدمة المايسترو حاليًا" });
  }

  const mapsUrl = `https://www.google.com/maps?q=${dropoff.lat},${dropoff.lng}`;
  const id = `ord_${nanoid(8)}`;
  const orderCode = nextOrderCode();
  const createdAt = Date.now();

  db.prepare(`
    INSERT INTO orders (id, order_code, type, custom_description, pickup_lat, pickup_lng, pickup_address,
                         customer_name, customer_phone, customer_push_token, payment_method,
                         lat, lng, maps_url, status, total, created_at)
    VALUES (?, ?, 'custom', ?, ?, ?, ?, ?, ?, ?, 'cash', ?, ?, ?, 'pending', 0, ?)
  `).run(id, orderCode, description, pickup.lat, pickup.lng, pickup.address || null,
         customerName || "", customerPhone || "", pushToken || null,
         dropoff.lat, dropoff.lng, mapsUrl, createdAt);

  upsertCustomer(customerPhone, customerName);
  logEvent(id, "customer", customerPhone, "created_custom");
  await attachQr(id);

  const order = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id));
  io.to(EMPLOYEES_ROOM).emit("order:new", order); // custom requests go straight to the employee dashboard
  broadcastBoard();
  broadcastLive();
  res.status(201).json(order);
});

app.get("/api/orders/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  res.json(rowToOrder(row));
});

// Customer rates the courier + experience after delivery.
app.post("/api/orders/:id/rate", (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "التقييم لازم يكون من 1 لـ 5" });
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.status !== "delivered") return res.status(400).json({ error: "الأوردر لسه ما اتسلمش" });
  if (row.customer_rating) return res.status(409).json({ error: "الأوردر ده اتقيّم قبل كده" });

  db.prepare("UPDATE orders SET customer_rating = ?, customer_rating_comment = ? WHERE id = ?")
    .run(rating, comment || null, req.params.id);
  if (row.courier_id) {
    db.prepare("UPDATE couriers SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?")
      .run(rating, row.courier_id);
  }
  logEvent(row.id, "customer", row.customer_phone, "rated_courier");
  res.json({ ok: true });
});

// Customer order history — used by the mobile app's "طلباتي" screen (no login system for customers, identified by phone)
app.get("/api/customers/orders", (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "رقم الهاتف مطلوب" });
  const rows = db.prepare(`
    SELECT o.*, r.name AS restaurant_name FROM orders o
    LEFT JOIN restaurants r ON r.id = o.restaurant_id
    WHERE o.customer_phone = ?
    ORDER BY o.created_at DESC
  `).all(phone);
  res.json(rows.map((r) => ({ ...rowToOrder(r), restaurantName: r.restaurant_name || null })));
});

// ================= Live board (HQ TV screen) =================
app.get("/api/live-board", (req, res) => res.json(reports.boardOrders()));

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

  const extra = status === "accepted" ? ", accepted_at = @now" : "";
  db.prepare(`UPDATE orders SET status = @status ${extra} WHERE id = @id`)
    .run({ status, now: Date.now(), id: req.params.id });
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(updated.restaurantId);

  io.to(orderRoom(updated.id)).emit("order:update", updated);
  notifyOrderStatus({ ...updated, customer_push_token: row.customer_push_token }).catch(() => {});
  logEvent(updated.id, "restaurant", req.auth.restaurantId, `status:${status}`);

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
    // Order is now ready — goes to the employee dashboard for captain assignment.
    io.to(EMPLOYEES_ROOM).emit("order:ready", updated);
  }
  broadcastBoard();
  broadcastLive();
  res.json({ order: updated, receiptHtml });
});

// ================= Courier / captain app (JWT-protected) =================
app.get("/api/couriers/me", auth.requireRole("courier"), (req, res) => {
  const row = db.prepare("SELECT * FROM couriers WHERE id = ?").get(req.auth.courierId);
  res.json(courierPublic(row));
});

app.post("/api/couriers/me/go-online", auth.requireRole("courier"), (req, res) => {
  queue.courierGoAvailable(req.auth.courierId);
  broadcastLive();
  res.json({ ok: true, status: "available" });
});
app.post("/api/couriers/me/go-offline", auth.requireRole("courier"), (req, res) => {
  queue.courierGoOffDuty(req.auth.courierId);
  broadcastLive();
  res.json({ ok: true, status: "off_duty" });
});
// The captain presses this after physically returning to company HQ — only then do they rejoin the queue.
app.post("/api/couriers/me/return-to-base", auth.requireRole("courier"), (req, res) => {
  queue.courierGoAvailable(req.auth.courierId);
  broadcastLive();
  res.json({ ok: true, status: "available" });
});

app.get("/api/couriers/orders/available", auth.requireRole("courier"), (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE status = 'accepted' AND courier_id IS NULL ORDER BY created_at ASC").all();
  res.json(rows.map(rowToOrder));
});

app.get("/api/couriers/me/orders", auth.requireRole("courier"), (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE courier_id = ? AND status NOT IN ('delivered','rejected','cancelled') ORDER BY created_at DESC").all(req.auth.courierId);
  res.json(rows.map(rowToOrder));
});

app.post("/api/couriers/orders/:id/claim", auth.requireRole("courier"), (req, res) => {
  const courier = db.prepare("SELECT * FROM couriers WHERE id = ?").get(req.auth.courierId);
  if (courier.status !== "available") {
    return res.status(403).json({ error: "لازم تكون في الدور (متاح) عشان تستلم أوردر" });
  }
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.courier_id) return res.status(409).json({ error: "أوردر خد بالفعل كابتن تاني" });

  db.prepare("UPDATE orders SET courier_id = ?, status = 'preparing' WHERE id = ?").run(req.auth.courierId, req.params.id);
  queue.courierGoBusy(req.auth.courierId);
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  io.to(orderRoom(updated.id)).emit("order:update", updated);
  io.to(COURIERS_ROOM).emit("order:claimed", { orderId: updated.id });
  logEvent(updated.id, "courier", req.auth.courierId, "claimed");
  broadcastBoard();
  broadcastLive();
  res.json(updated);
});

app.patch("/api/couriers/orders/:id/status", auth.requireRole("courier"), (req, res) => {
  const { status } = req.body; // 'out_for_delivery' | 'delivered'
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.courier_id !== req.auth.courierId) return res.status(403).json({ error: "مش أوردر بتاعك" });

  const timeCol = status === "out_for_delivery" ? "out_for_delivery_at" : status === "delivered" ? "delivered_at" : null;
  db.prepare(`UPDATE orders SET status = @status ${timeCol ? `, ${timeCol} = @now` : ""} WHERE id = @id`)
    .run({ status, now: Date.now(), id: req.params.id });
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  io.to(orderRoom(updated.id)).emit("order:update", updated);
  notifyOrderStatus({ ...updated, customer_push_token: row.customer_push_token }).catch(() => {});
  logEvent(updated.id, "courier", req.auth.courierId, `status:${status}`);

  // Delivered: courier leaves 'busy' but does NOT auto-rejoin the queue — must press "رجعت للمقر".
  if (status === "delivered") queue.courierGoReturning(req.auth.courierId);
  broadcastBoard();
  broadcastLive();
  res.json(updated);
});

// Captain flags a customer (e.g. fake / no-show order) to help admin catch abuse.
app.post("/api/couriers/orders/:id/rate-customer", auth.requireRole("courier"), (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "التقييم لازم يكون من 1 لـ 5" });
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row || row.courier_id !== req.auth.courierId) return res.status(403).json({ error: "مش أوردر بتاعك" });

  db.prepare("UPDATE orders SET courier_rating_of_customer = ? WHERE id = ?").run(rating, req.params.id);
  if (row.customer_phone) {
    db.prepare("UPDATE customers SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE phone = ?")
      .run(rating, row.customer_phone);
  }
  res.json({ ok: true });
});

// ================= Employee dashboard (JWT-protected) =================
app.get("/api/employees/orders", auth.requireRole("employee"), (req, res) => {
  const { status, search } = req.query;
  let sql = "SELECT * FROM orders WHERE 1=1";
  const params = [];
  if (status) { sql += " AND status = ?"; params.push(status); }
  if (search) {
    sql += " AND (id LIKE ? OR order_code LIKE ? OR customer_phone LIKE ? OR customer_name LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  sql += " ORDER BY created_at DESC LIMIT 200";
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToOrder));
});

app.get("/api/employees/couriers/queue", auth.requireRole("employee"), (req, res) => {
  res.json({ queue: queue.fullQueue(), next: queue.nextInQueue() });
});

// Assign an order to a specific courier, or omit courierId to auto-pick the next one in the queue.
app.post("/api/employees/orders/:id/assign", auth.requireRole("employee"), (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  if (row.courier_id) return res.status(409).json({ error: "الأوردر متسند بالفعل" });

  let courier = req.body.courierId
    ? db.prepare("SELECT * FROM couriers WHERE id = ?").get(req.body.courierId)
    : queue.nextInQueueInternal();
  if (!courier) return res.status(409).json({ error: "مفيش كباتن متاحين في الدور دلوقتي" });
  if (courier.status !== "available") {
    return res.status(409).json({ error: "الكابتن ده مش متاح دلوقتي" });
  }

  db.prepare("UPDATE orders SET courier_id = ?, assigned_by = ?, status = 'preparing' WHERE id = ?")
    .run(courier.id, req.auth.employeeId, req.params.id);
  queue.courierGoBusy(courier.id);
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  const courierNow = db.prepare("SELECT * FROM couriers WHERE id = ?").get(courier.id);
  io.to(orderRoom(updated.id)).emit("order:update", updated);
  io.to(COURIERS_ROOM).emit("order:claimed", { orderId: updated.id });
  logEvent(updated.id, "employee", req.auth.employeeId, `assigned:${courier.id}`);
  broadcastBoard();
  broadcastLive();
  res.json({ order: updated, courier: courierPublic(courierNow) });
});

app.patch("/api/employees/orders/:id", auth.requireRole("employee"), (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  const { items, total, customerName, customerPhone, addressText } = req.body;

  const newTotal = items ? items.reduce((s, it) => s + it.price * it.qty, 0) : (total ?? row.total);
  db.prepare(`
    UPDATE orders SET
      items_json = COALESCE(?, items_json),
      total = ?,
      customer_name = COALESCE(?, customer_name),
      customer_phone = COALESCE(?, customer_phone),
      address_text = COALESCE(?, address_text)
    WHERE id = ?
  `).run(items ? JSON.stringify(items) : null, newTotal, customerName || null, customerPhone || null, addressText || null, req.params.id);

  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  io.to(orderRoom(updated.id)).emit("order:update", updated);
  logEvent(updated.id, "employee", req.auth.employeeId, "edited");
  broadcastBoard();
  res.json(updated);
});

app.post("/api/employees/orders/:id/cancel", auth.requireRole("employee"), (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  const updated = rowToOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id));
  io.to(orderRoom(updated.id)).emit("order:update", updated);
  logEvent(updated.id, "employee", req.auth.employeeId, "cancelled");
  broadcastBoard();
  broadcastLive();
  res.json(updated);
});

app.get("/api/employees/orders/:id/receipt", auth.requireRole("employee"), (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الأوردر غير موجود" });
  const order = rowToOrder(row);
  const restaurant = row.restaurant_id
    ? db.prepare("SELECT * FROM restaurants WHERE id = ?").get(row.restaurant_id)
    : { name: "اطلب أي شيء" };
  res.json({ receiptHtml: buildReceiptHtml(order, restaurant), qrDataUrl: row.qr_data_url, orderCode: row.order_code });
});

// ================= Admin (JWT-protected) =================
app.get("/api/admin/reports/live", auth.requireRole("admin"), (req, res) => res.json(reports.liveCounters()));
app.get("/api/admin/reports", auth.requireRole("admin"), (req, res) => res.json(reports.rangeReport(req.query.range)));

app.get("/api/admin/restaurants", auth.requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM restaurants").all();
  res.json(rows.map((r) => ({ ...restaurantPublic(r), code: r.code, phone: r.phone, active: !!r.active, printerMode: r.printer_mode, printerIp: r.printer_ip })));
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

app.patch("/api/admin/restaurants/:id/active", auth.requireRole("admin"), (req, res) => {
  db.prepare("UPDATE restaurants SET active = ? WHERE id = ?").run(req.body.active ? 1 : 0, req.params.id);
  res.json({ ok: true });
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

// -- Couriers management --
app.get("/api/admin/couriers", auth.requireRole("admin"), (req, res) => {
  res.json(queue.fullQueue());
});
app.post("/api/admin/couriers", auth.requireRole("admin"), (req, res) => {
  const { name, code, password, phone } = req.body;
  if (!name || !code || !password) return res.status(400).json({ error: "الاسم/الكود/الباسورد مطلوبين" });
  const id = `cap_${nanoid(8)}`;
  db.prepare("INSERT INTO couriers (id, name, code, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, 'off_duty')")
    .run(id, name, code, auth.hash(password), phone || "");
  res.status(201).json({ id, name, code, phone });
});

// -- Employees management --
app.get("/api/admin/employees", auth.requireRole("admin"), (req, res) => {
  res.json(db.prepare("SELECT id, name, code, role, active FROM employees").all());
});
app.post("/api/admin/employees", auth.requireRole("admin"), (req, res) => {
  const { name, code, password, role } = req.body;
  if (!name || !code || !password) return res.status(400).json({ error: "الاسم/الكود/الباسورد مطلوبين" });
  const id = `emp_${nanoid(8)}`;
  db.prepare("INSERT INTO employees (id, name, code, password_hash, role) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, code, auth.hash(password), role || "dispatcher");
  res.status(201).json({ id, name, code, role: role || "dispatcher" });
});
app.patch("/api/admin/employees/:id/active", auth.requireRole("admin"), (req, res) => {
  db.prepare("UPDATE employees SET active = ? WHERE id = ?").run(req.body.active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// -- Customers management --
app.get("/api/admin/customers", auth.requireRole("admin"), (req, res) => {
  res.json(db.prepare(`
    SELECT phone, name, blocked,
           CASE WHEN rating_count > 0 THEN ROUND(CAST(rating_sum AS REAL) / rating_count, 1) ELSE NULL END AS rating
    FROM customers ORDER BY phone
  `).all());
});
app.patch("/api/admin/customers/:phone/block", auth.requireRole("admin"), (req, res) => {
  db.prepare("UPDATE customers SET blocked = ? WHERE phone = ?").run(req.body.blocked ? 1 : 0, req.params.phone);
  res.json({ ok: true });
});

// -- Service area settings --
app.patch("/api/admin/settings/service-area", auth.requireRole("admin"), (req, res) => {
  const { hqLat, hqLng, radiusKm } = req.body;
  const setRow = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  if (hqLat != null) setRow.run("hq_lat", String(hqLat));
  if (hqLng != null) setRow.run("hq_lng", String(hqLng));
  if (radiusKm != null) setRow.run("service_radius_km", String(radiusKm));
  res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`🎼 Maestro backend running on http://localhost:${PORT}`);
});
