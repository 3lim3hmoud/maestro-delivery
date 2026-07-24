const db = require("./db");

/** Courier goes on shift / becomes ready for a new order: joins the back of the queue. */
function courierGoAvailable(courierId) {
  db.prepare("UPDATE couriers SET status = 'available', queue_ts = ? WHERE id = ?").run(Date.now(), courierId);
}

function courierGoOffDuty(courierId) {
  db.prepare("UPDATE couriers SET status = 'off_duty', queue_ts = NULL WHERE id = ?").run(courierId);
}

/** Called when a courier is handed an order: leaves the queue until they return to HQ. */
function courierGoBusy(courierId) {
  db.prepare("UPDATE couriers SET status = 'busy' WHERE id = ?").run(courierId);
}

/** Called when a courier finishes a delivery: must press "رجعت للمقر" before rejoining the queue. */
function courierGoReturning(courierId) {
  db.prepare("UPDATE couriers SET status = 'returning', queue_ts = NULL WHERE id = ?").run(courierId);
}

/** The next courier due for an order — oldest queue_ts among those truly 'available'. Skips busy/returning/off_duty. */
function nextInQueue() {
  return db
    .prepare("SELECT id, name, phone, status, queue_ts, rating_sum, rating_count FROM couriers WHERE status = 'available' ORDER BY queue_ts ASC LIMIT 1")
    .get();
}

/** Same lookup, but includes password_hash — only ever used internally for auth/state checks, never sent to clients. */
function nextInQueueInternal() {
  return db
    .prepare("SELECT * FROM couriers WHERE status = 'available' ORDER BY queue_ts ASC LIMIT 1")
    .get();
}

function fullQueue() {
  return db
    .prepare(`
      SELECT id, name, phone, status, queue_ts,
             CASE WHEN rating_count > 0 THEN ROUND(CAST(rating_sum AS REAL) / rating_count, 1) ELSE NULL END AS rating
      FROM couriers
      ORDER BY
        CASE status WHEN 'available' THEN 0 WHEN 'busy' THEN 1 WHEN 'returning' THEN 2 ELSE 3 END,
        queue_ts ASC
    `)
    .all();
}

module.exports = { courierGoAvailable, courierGoOffDuty, courierGoBusy, courierGoReturning, nextInQueue, nextInQueueInternal, fullQueue };
