const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");

/**
 * Builds a clean, print-ready HTML receipt for an order.
 * The restaurant-web dashboard opens this in a hidden iframe/window and calls window.print(),
 * which sends it to whatever printer (thermal or regular) is set as default on that computer.
 */
function buildReceiptHtml(order, restaurant) {
  const rows = order.items
    .map(
      (it) => `
      <tr>
        <td>${it.qty}x</td>
        <td>${it.name}</td>
        <td style="text-align:left">${it.price * it.qty} جنيه</td>
      </tr>`
    )
    .join("");

  return `
  <html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 80mm auto; margin: 0; }
      body { font-family: 'Courier New', monospace; width: 78mm; padding: 6px; }
      h1 { text-align: center; font-size: 18px; margin: 4px 0; }
      .muted { text-align: center; font-size: 11px; color: #444; }
      hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      td { padding: 2px 0; }
      .total { font-weight: bold; font-size: 15px; }
      .footer { text-align: center; font-size: 11px; margin-top: 8px; }
    </style>
  </head>
  <body>
    <h1>المايسترو للتوصيل</h1>
    <div class="muted">${restaurant.name}</div>
    <div class="muted">أوردر رقم: ${order.id}</div>
    <div class="muted">${new Date(order.createdAt).toLocaleString("ar-EG")}</div>
    <hr />
    <table>${rows}</table>
    <hr />
    <table>
      <tr class="total"><td colspan="2">الإجمالي</td><td style="text-align:left">${order.total} جنيه</td></tr>
    </table>
    <hr />
    <div class="muted">العميل: ${order.customerName || "-"} - ${order.customerPhone || "-"}</div>
    <div class="muted">الموقع: ${order.location.lat.toFixed(5)}, ${order.location.lng.toFixed(5)}</div>
    <div class="muted">${order.mapsUrl}</div>
    <div class="footer">شكراً لطلبك من المايسترو 🎼</div>
  </body>
  </html>`;
}

/**
 * Sends the order directly to a network thermal printer using ESC/POS commands.
 * Used when a restaurant's printer.mode === "network" (configured with its IP in db.json).
 */
async function printToNetworkPrinter(order, restaurant) {
  const printer = new ThermalPrinter({
    type: PrinterTypes[restaurant.printer.type?.toUpperCase()] || PrinterTypes.EPSON,
    interface: `tcp://${restaurant.printer.ip}`,
    removeSpecialCharacters: false,
    options: { timeout: 5000 },
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) throw new Error(`Printer not reachable at ${restaurant.printer.ip}`);

  printer.alignCenter();
  printer.bold(true);
  printer.println("المايسترو للتوصيل");
  printer.bold(false);
  printer.println(restaurant.name);
  printer.println(`أوردر رقم: ${order.id}`);
  printer.drawLine();
  printer.alignRight();
  order.items.forEach((it) => {
    printer.println(`${it.qty}x ${it.name} - ${it.price * it.qty} جنيه`);
  });
  printer.drawLine();
  printer.bold(true);
  printer.println(`الإجمالي: ${order.total} جنيه`);
  printer.bold(false);
  printer.println(`العميل: ${order.customerName || "-"}`);
  printer.println(`الموقع: ${order.mapsUrl}`);
  printer.cut();

  await printer.execute();
}

module.exports = { buildReceiptHtml, printToNetworkPrinter };
