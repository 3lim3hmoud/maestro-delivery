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
  printer_type TEXT DEFAULT 'epson'
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
  phone TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  courier_id TEXT REFERENCES couriers(id),
  items_json TEXT NOT NULL,
  total REAL NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_push_token TEXT,
  payment_method TEXT DEFAULT 'cash',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  maps_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
`);

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

  const seed = [
    {
      id: "rest_afandina", name: "أفندينا", code: "1001", password: "1001",
      phone: "01000000001", lat: 30.0444, lng: 31.2357,
      menu: [],
    },
    {
      id: "rest_la_rose", name: "لاروز", code: "1002", password: "1002",
      phone: "01000000002", lat: 30.0470, lng: 31.2360,
      menu: [],
    },
    {
      id: "rest_la_rotonda", name: "لاروتندا", code: "1003", password: "1003",
      phone: "01000000003", lat: 30.0500, lng: 31.2400,
      menu: [],
    },
    {
      id: "rest_lorenzo", name: "لورينزو", code: "1004", password: "1004",
      phone: "01000000004", lat: 30.0530, lng: 31.2430,
      menu: [],
    },
    {
      id: "rest_belban", name: "بلبن", code: "1005", password: "1005",
      phone: "01000000005", lat: 30.0560, lng: 31.2460,
      menu: [],
    },
    {
      id: "rest_kunafa_basbousa", name: "كنافة وبسبوسة", code: "1006", password: "1006",
      phone: "01000000006", lat: 30.0590, lng: 31.2480,
      menu: [],
    },
    {
      id: "rest_hadramout", name: "حضرموت", code: "1007", password: "1007",
      phone: "01000000007", lat: 30.0620, lng: 31.2500,
      menu: [],
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
    // Demo courier: code "9999" / password "9999"
    db.prepare(`INSERT INTO couriers (id, name, code, password_hash, phone) VALUES (?, ?, ?, ?, ?)`)
      .run("cap_1", "كابتن أحمد", "9999", bcrypt.hashSync("9999", 10), "01099999999");
    // Default admin: username "admin" / password from ADMIN_DEFAULT_PASSWORD env (or "changeme")
    const adminPass = process.env.ADMIN_DEFAULT_PASSWORD || "changeme";
    db.prepare(`INSERT INTO admins (id, username, password_hash) VALUES (?, ?, ?)`)
      .run("admin_1", "admin", bcrypt.hashSync(adminPass, 10));
  });
  seedTx();

  console.log("🌱 Database seeded. Restaurants: أفندينا 1001 | لاروز 1002 | لاروتندا 1003 | لورينزو 1004 | بلبن 1005 | كنافة وبسبوسة 1006 | حضرموت 1007 | Courier: 9999/9999 | Admin: admin/" + (process.env.ADMIN_DEFAULT_PASSWORD || "changeme"));
}

module.exports = db;
