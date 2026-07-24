import Constants from "expo-constants";

export const API_BASE = Constants.expoConfig?.extra?.apiBase || "http://localhost:4000";

export async function getRestaurants() {
  const res = await fetch(`${API_BASE}/api/restaurants`);
  return res.json();
}

export async function placeOrder(payload) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || "حصل خطأ في إرسال الطلب");
  return res.json();
}

export async function getServiceArea() {
  const res = await fetch(`${API_BASE}/api/settings/service-area`);
  return res.json();
}

// "اطلب أي شيء" — non-restaurant delivery request (medicine, documents, a gift, anything).
export async function submitCustomRequest(payload) {
  const res = await fetch(`${API_BASE}/api/custom-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || "حصل خطأ في إرسال الطلب");
  return res.json();
}

export async function getCustomerOrders(phone) {
  const res = await fetch(`${API_BASE}/api/customers/orders?phone=${encodeURIComponent(phone)}`);
  if (!res.ok) throw new Error((await res.json()).error || "حصل خطأ في جلب طلباتك السابقة");
  return res.json();
}

export async function rateOrder(orderId, rating, comment) {
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, comment }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "حصل خطأ في إرسال التقييم");
  return res.json();
}
