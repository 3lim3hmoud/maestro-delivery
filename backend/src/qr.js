const QRCode = require("qrcode");
const db = require("./db");

/** Builds the human-facing order code: DLV-2026-000125 (sequential per year). */
function nextOrderCode() {
  const year = new Date().getFullYear();
  const prefix = `DLV-${year}-`;
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE order_code LIKE ?")
    .get(`${prefix}%`);
  const seq = (row.c + 1).toString().padStart(6, "0");
  return `${prefix}${seq}`;
}

/** Generates a QR code (as a data URL, ready to <img src=""> or print) encoding the order id + code. */
async function buildOrderQr(orderId, orderCode) {
  const payload = JSON.stringify({ orderId, orderCode });
  return QRCode.toDataURL(payload, { margin: 1, width: 240 });
}

module.exports = { nextOrderCode, buildOrderQr };
