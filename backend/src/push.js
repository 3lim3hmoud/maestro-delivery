/**
 * Sends push notifications to customers' phones via Expo's push service.
 * Requires no account/API key — Expo's push endpoint is free and public — but the
 * mobile app must register the device and send its Expo push token with the order
 * (see mobile-app/src/api.js -> registerForPushAsync). If the order has no token,
 * this silently does nothing (the app still shows live status via socket.io while open).
 */
async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken")) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: pushToken, title, body, data, sound: "default" }),
    });
  } catch (err) {
    console.error("Push notification failed:", err.message);
  }
}

const STATUS_MESSAGES = {
  accepted: "المطعم وافق على طلبك وبيجهزه دلوقتي 🎼",
  preparing: "طلبك بيتحضر دلوقتي",
  out_for_delivery: "الكابتن في الطريق ليك 🛵",
  delivered: "طلبك وصل، بالهنا والشفا!",
  rejected: "للأسف المطعم مقدرش يقبل طلبك دلوقتي",
};

async function notifyOrderStatus(order) {
  const message = STATUS_MESSAGES[order.status];
  if (!message) return;
  await sendPushNotification(order.customer_push_token, "المايسترو", message, { orderId: order.id });
}

module.exports = { sendPushNotification, notifyOrderStatus };
