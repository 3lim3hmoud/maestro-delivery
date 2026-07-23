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
