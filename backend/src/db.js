const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "data", "maestro.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  lat REAL,
  lng REAL,
  printer_mode TEXT DEFAULT 'browser',
  printer_ip TEXT,
  printer_type TEXT DEFAULT 'epson',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS couriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'off_duty',   -- off_duty | available | busy | returning
  queue_ts INTEGER,                          -- timestamp used to order the queue (oldest = next turn)
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'dispatcher',   -- dispatcher | supervisor
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  phone TEXT PRIMARY KEY,
  name TEXT,
  rating_sum INTEGER NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_code TEXT UNIQUE,                    -- e.g. DLV-2026-000125
  type TEXT NOT NULL DEFAULT 'restaurant',   -- restaurant | custom
  restaurant_id TEXT REFERENCES restaurants(id),
  courier_id TEXT REFERENCES couriers(id),
  assigned_by TEXT REFERENCES employees(id),
  items_json TEXT,
  custom_description TEXT,
  pickup_lat REAL,
  pickup_lng REAL,
  pickup_address TEXT,
  total REAL NOT NULL DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  customer_push_token TEXT,
  payment_method TEXT DEFAULT 'cash',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address_text TEXT,
  maps_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  qr_data_url TEXT,
  customer_rating INTEGER,
  customer_rating_comment TEXT,
  courier_rating_of_customer INTEGER,
  created_at INTEGER NOT NULL,
  accepted_at INTEGER,
  out_for_delivery_at INTEGER,
  delivered_at INTEGER
);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id),
  actor_type TEXT,     -- customer | restaurant | courier | employee | admin
  actor_id TEXT,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`);

// ---------- Lightweight migration for DBs created before a column existed ----------
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn("restaurants", "active", "active INTEGER NOT NULL DEFAULT 1");
ensureColumn("couriers", "status", "status TEXT NOT NULL DEFAULT 'off_duty'");
ensureColumn("couriers", "queue_ts", "queue_ts INTEGER");
ensureColumn("couriers", "rating_sum", "rating_sum INTEGER NOT NULL DEFAULT 0");
ensureColumn("couriers", "rating_count", "rating_count INTEGER NOT NULL DEFAULT 0");
ensureColumn("orders", "order_code", "order_code TEXT");
ensureColumn("orders", "type", "type TEXT NOT NULL DEFAULT 'restaurant'");
ensureColumn("orders", "assigned_by", "assigned_by TEXT");
ensureColumn("orders", "custom_description", "custom_description TEXT");
ensureColumn("orders", "pickup_lat", "pickup_lat REAL");
ensureColumn("orders", "pickup_lng", "pickup_lng REAL");
ensureColumn("orders", "pickup_address", "pickup_address TEXT");
ensureColumn("orders", "address_text", "address_text TEXT");
ensureColumn("orders", "qr_data_url", "qr_data_url TEXT");
ensureColumn("orders", "customer_rating", "customer_rating INTEGER");
ensureColumn("orders", "customer_rating_comment", "customer_rating_comment TEXT");
ensureColumn("orders", "courier_rating_of_customer", "courier_rating_of_customer INTEGER");
ensureColumn("orders", "accepted_at", "accepted_at INTEGER");
ensureColumn("orders", "out_for_delivery_at", "out_for_delivery_at INTEGER");
ensureColumn("orders", "delivered_at", "delivered_at INTEGER");

// ---------- Seed (only runs once, on an empty database) ----------
const restaurantCount = db.prepare("SELECT COUNT(*) AS c FROM restaurants").get().c;
if (restaurantCount === 0) {
  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants (id, name, code, password_hash, phone, lat, lng, printer_mode, printer_ip, printer_type)
    VALUES (@id, @name, @code, @password_hash, @phone, @lat, @lng, @printer_mode, @printer_ip, @printer_type)
  `);
  const insertMenuItem = db.prepare(`
    INSERT INTO menu_items (id, restaurant_id, name, price) VALUES (@id, @restaurant_id, @name, @price)
  `);

  // Launch line-up requested for المايسترو (Alexandria-area demo coordinates).
  const seed = [
    {
      id: "rest_afandina", name: "أفندينا", code: "1001", password: "1001",
      phone: "01000000011", lat: 31.2001, lng: 29.9187,
      menu: [
        { id: "m_afn_1", name: "فتة لحمة", price: 120 },
        { id: "m_afn_2", name: "محشي ورق عنب", price: 65 },
        { id: "m_afn_3", name: "أرز باللبن", price: 25 },
      ],
    },
    {
      id: "rest_la_rose", name: "لاروز", code: "1002", password: "1002",
      phone: "01000000012", lat: 31.2156, lng: 29.9553,
      menu: [
        { id: "m_lrz_1", name: "باستا ألفريدو", price: 140 },
        { id: "m_lrz_2", name: "بيتزا مارجريتا", price: 110 },
        { id: "m_lrz_3", name: "سلطة سيزر", price: 70 },
      ],
    },
    {
      id: "rest_la_rotonda", name: "لاروتندا", code: "1003", password: "1003",
      phone: "01000000013", lat: 31.2231, lng: 29.9652,
      menu: [
        { id: "m_lrt_1", name: "ستيك لحم", price: 220 },
        { id: "m_lrt_2", name: "دجاج مشوي", price: 130 },
        { id: "m_lrt_3", name: "شوربة عدس", price: 30 },
      ],
    },
    {
      id: "rest_lorenzo", name: "لورينزو", code: "1004", password: "1004",
      phone: "01000000014", lat: 31.1975, lng: 29.9412,
      menu: [
        { id: "m_lor_1", name: "لازانيا", price: 135 },
        { id: "m_lor_2", name: "ريزوتو مشروم", price: 125 },
        { id: "m_lor_3", name: "تيراميسو", price: 55 },
      ],
    },
    {
      id: "rest_belban", name: "بلبن", code: "1005", password: "1005",
      phone: "01000000015", lat: 31.2298, lng: 29.9781,
      menu: [
        { id: "m_bel_1", name: "رز بلبن", price: 20 },
        { id: "m_bel_2", name: "أم علي", price: 35 },
        { id: "m_bel_3", name: "كريم كراميل", price: 25 },
      ],
    },
    {
      id: "rest_kunafa_basbousa", name: "كنافة وبسبوسة", code: "1006", password: "1006",
      phone: "01000000016", lat: 31.2044, lng: 29.9245,
      menu: [
        { id: "m_kb_1", name: "كنافة بالقشطة", price: 45 },
        { id: "m_kb_2", name: "بسبوسة بالقشطة", price: 30 },
        { id: "m_kb_3", name: "كنافة بالمكسرات", price: 55 },
      ],
    },
    {
      id: "rest_hadramout", name: "حضرموت", code: "1007", password: "1007",
      phone: "01000000017", lat: 31.1887, lng: 29.9034,
      menu: [
        { id: "m_had_1", name: "مندي لحم", price: 160 },
        { id: "m_had_2", name: "مندي فراخ", price: 130 },
        { id: "m_had_3", name: "سمبوسة لحمة", price: 15 },
      ],
    },
  ];

  const seedTx = db.transaction(() => {
    for (const r of seed) {
      insertRestaurant.run({
        id: r.id, name: r.name, code: r.code,
        password_hash: bcrypt.hashSync(r.password, 10),
        phone: r.phone, lat: r.lat, lng: r.lng,
        printer_mode: "browser", printer_ip: null, printer_type: "epson",
      });
      for (const m of r.menu) insertMenuItem.run({ ...m, restaurant_id: r.id });
    }
    // Demo couriers: code "9001".."9002" / same as password
    db.prepare(`INSERT INTO couriers (id, name, code, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, 'off_duty')`)
      .run("cap_1", "كابتن أحمد", "9001", bcrypt.hashSync("9001", 10), "01099999901");
    db.prepare(`INSERT INTO couriers (id, name, code, password_hash, phone, status) VALUES (?, ?, ?, ?, ?, 'off_duty')`)
      .run("cap_2", "كابتن محمود", "9002", bcrypt.hashSync("9002", 10), "01099999902");
    // Demo employee: code "8001" / password "8001"
    db.prepare(`INSERT INTO employees (id, name, code, password_hash, role) VALUES (?, ?, ?, ?, ?)`)
      .run("emp_1", "موظف الاستقبال", "8001", bcrypt.hashSync("8001", 10), "dispatcher");
    // Default admin: username "admin" / password from ADMIN_DEFAULT_PASSWORD env (or "changeme")
    const adminPass = process.env.ADMIN_DEFAULT_PASSWORD || "changeme";
    db.prepare(`INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)`)
      .run("admin_1", "admin", bcrypt.hashSync(adminPass, 10));
    // Company HQ + service radius, used to fence "اطلب أي شيء" + custom pickup requests.
    db.prepare(`INSERT INTO settings (key, value) VALUES ('hq_lat', '31.2089')`).run();
    db.prepare(`INSERT INTO settings (key, value) VALUES ('hq_lng', '29.9092')`).run();
    db.prepare(`INSERT INTO settings (key, value) VALUES ('service_radius_km', '15')`).run();
  });
  seedTx();

  console.log("🌱 Database seeded with real restaurant line-up.");
  console.log("   Restaurants: 1001..1007 (same code as password) | Couriers: 9001/9002 | Employee: 8001 | Admin: admin/" + (process.env.ADMIN_DEFAULT_PASSWORD || "changeme"));
}

module.exports = db;
