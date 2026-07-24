import Constants from "expo-constants";

export const API_BASE = Constants.expoConfig?.extra?.apiBase || "http://localhost:4000";

let authToken = null; // kept in memory for the app session (re-login on restart)

async function handle(res) {
  if (!res.ok) throw new Error((await res.json()).error || "حصل خطأ، حاول تاني");
  return res.json();
}

export async function loginCourier(code, password) {
  const data = await handle(await fetch(`${API_BASE}/api/auth/courier/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, password }),
  }));
  authToken = data.token;
  return data.courier;
}

function authHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

export async function getAvailableOrders() {
  return handle(await fetch(`${API_BASE}/api/couriers/orders/available`, { headers: authHeaders() }));
}

export async function getMyOrders() {
  return handle(await fetch(`${API_BASE}/api/couriers/me/orders`, { headers: authHeaders() }));
}

export async function claimOrder(orderId) {
  return handle(await fetch(`${API_BASE}/api/couriers/orders/${orderId}/claim`, {
    method: "POST",
    headers: authHeaders(),
  }));
}

export async function setOrderStatus(orderId, status) {
  return handle(await fetch(`${API_BASE}/api/couriers/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  }));
}

export async function getMyStatus() {
  return handle(await fetch(`${API_BASE}/api/couriers/me`, { headers: authHeaders() }));
}

export async function goOnline() {
  return handle(await fetch(`${API_BASE}/api/couriers/me/go-online`, { method: "POST", headers: authHeaders() }));
}

export async function goOffline() {
  return handle(await fetch(`${API_BASE}/api/couriers/me/go-offline`, { method: "POST", headers: authHeaders() }));
}

// Captain presses this after physically returning to company HQ — only then do they rejoin the queue.
export async function returnToBase() {
  return handle(await fetch(`${API_BASE}/api/couriers/me/return-to-base`, { method: "POST", headers: authHeaders() }));
}

export async function rateCustomer(orderId, rating) {
  return handle(await fetch(`${API_BASE}/api/couriers/orders/${orderId}/rate-customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rating }),
  }));
}
