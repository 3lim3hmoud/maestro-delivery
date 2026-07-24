const db = require("./db");

function dayBounds(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Live counters shown on the admin dashboard home + the HQ live board. */
function liveCounters() {
  const since = dayBounds();
  const count = (sql, ...args) => db.prepare(sql).get(...args).c;

  return {
    newOrders: count("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'"),
    outForDelivery: count("SELECT COUNT(*) AS c FROM orders WHERE status IN ('accepted','preparing','out_for_delivery')"),
    completedToday: count("SELECT COUNT(*) AS c FROM orders WHERE status = 'delivered' AND created_at >= ?", since),
    cancelledToday: count("SELECT COUNT(*) AS c FROM orders WHERE status = 'cancelled' AND created_at >= ?", since),
    couriersAvailable: count("SELECT COUNT(*) AS c FROM couriers WHERE status = 'available'"),
    couriersBusy: count("SELECT COUNT(*) AS c FROM couriers WHERE status IN ('busy','returning')"),
    restaurants: count("SELECT COUNT(*) AS c FROM restaurants WHERE active = 1"),
    customers: count("SELECT COUNT(*) AS c FROM customers"),
    revenueToday: db.prepare("SELECT COALESCE(SUM(total),0) AS s FROM orders WHERE status = 'delivered' AND created_at >= ?").get(since).s,
    revenueMonth: db.prepare(`
      SELECT COALESCE(SUM(total),0) AS s FROM orders
      WHERE status = 'delivered' AND strftime('%Y-%m', created_at/1000, 'unixepoch') = strftime('%Y-%m', 'now')
    `).get().s,
  };
}

/** Board grouped by stage, for the HQ live TV screen. */
function boardOrders() {
  const rows = db.prepare(`
    SELECT o.id, o.order_code, o.status, o.total, o.customer_name, o.created_at,
           COALESCE(r.name, 'اطلب أي شيء') AS restaurant_name, c.name AS courier_name
    FROM orders o
    LEFT JOIN restaurants r ON r.id = o.restaurant_id
    LEFT JOIN couriers c ON c.id = o.courier_id
    WHERE o.status NOT IN ('delivered','cancelled','rejected')
       OR o.delivered_at >= ?
    ORDER BY o.created_at DESC
    LIMIT 60
  `).all(Date.now() - 2 * 60 * 60 * 1000);

  const stageOf = (s) =>
    s === "pending" ? "new" : s === "delivered" ? "delivered" : s === "out_for_delivery" ? "out" : "preparing";

  return {
    new: rows.filter((o) => stageOf(o.status) === "new"),
    preparing: rows.filter((o) => stageOf(o.status) === "preparing"),
    out: rows.filter((o) => stageOf(o.status) === "out"),
    delivered: rows.filter((o) => stageOf(o.status) === "delivered"),
  };
}

const RANGE_FORMAT = {
  daily: "%Y-%m-%d",
  weekly: "%Y-%W",
  monthly: "%Y-%m",
  yearly: "%Y",
};

/** Orders/revenue grouped by day/week/month/year, plus courier/restaurant/customer breakdowns. */
function rangeReport(range = "daily") {
  const fmt = RANGE_FORMAT[range] || RANGE_FORMAT.daily;

  const series = db.prepare(`
    SELECT strftime('${fmt}', created_at/1000, 'unixepoch') AS bucket,
           COUNT(*) AS orders,
           COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) AS revenue
    FROM orders
    GROUP BY bucket
    ORDER BY bucket DESC
    LIMIT 24
  `).all();

  const byCourier = db.prepare(`
    SELECT c.id, c.name, COUNT(o.id) AS deliveries,
           COALESCE(SUM(o.total), 0) AS revenue,
           CASE WHEN c.rating_count > 0 THEN ROUND(CAST(c.rating_sum AS REAL) / c.rating_count, 1) ELSE NULL END AS rating
    FROM couriers c
    LEFT JOIN orders o ON o.courier_id = c.id AND o.status = 'delivered'
    GROUP BY c.id ORDER BY deliveries DESC
  `).all();

  const byRestaurant = db.prepare(`
    SELECT r.id, r.name, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS revenue
    FROM restaurants r
    LEFT JOIN orders o ON o.restaurant_id = r.id AND o.status = 'delivered'
    GROUP BY r.id ORDER BY orders DESC
  `).all();

  const byCustomer = db.prepare(`
    SELECT customer_phone AS phone, customer_name AS name, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
    FROM orders WHERE customer_phone IS NOT NULL AND customer_phone != ''
    GROUP BY customer_phone ORDER BY orders DESC LIMIT 20
  `).all();

  const avgDeliveryMinutes = db.prepare(`
    SELECT AVG((delivered_at - accepted_at) / 60000.0) AS m
    FROM orders WHERE delivered_at IS NOT NULL AND accepted_at IS NOT NULL
  `).get().m;

  const topProduct = db.prepare(`SELECT items_json FROM orders WHERE items_json IS NOT NULL`).all();
  const productCounts = {};
  for (const row of topProduct) {
    try {
      const items = JSON.parse(row.items_json) || [];
      for (const it of items) productCounts[it.name] = (productCounts[it.name] || 0) + (it.qty || 1);
    } catch { /* ignore malformed rows */ }
  }
  const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, qty]) => ({ name, qty }));

  // "أكثر منطقة" approximated by rounding delivery coordinates to a ~1km grid cell.
  const areaRows = db.prepare(`SELECT lat, lng FROM orders WHERE lat IS NOT NULL AND lng IS NOT NULL`).all();
  const areaCounts = {};
  for (const row of areaRows) {
    const key = `${row.lat.toFixed(2)},${row.lng.toFixed(2)}`;
    areaCounts[key] = (areaCounts[key] || 0) + 1;
  }
  const topAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([coords, count]) => ({ coords, count }));

  return {
    range,
    series: series.reverse(),
    byCourier,
    byRestaurant,
    byCustomer,
    avgDeliveryMinutes: avgDeliveryMinutes ? Math.round(avgDeliveryMinutes) : null,
    topProducts,
    topAreas,
  };
}

module.exports = { liveCounters, boardOrders, rangeReport };
