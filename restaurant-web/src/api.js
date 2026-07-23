const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function authHeaders() {
  const token = localStorage.getItem("maestro_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) throw new Error((await res.json()).error || "حصل خطأ، حاول تاني");
  return res.json();
}

// ---------- Restaurant auth ----------
export async function loginRestaurant(code, password) {
  const data = await handle(await fetch(`${API_BASE}/api/auth/restaurant/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, password }),
  }));
  localStorage.setItem("maestro_token", data.token);
  return data.restaurant;
}

export function logout() {
  localStorage.removeItem("maestro_token");
}

export async function fetchOrders() {
  return handle(await fetch(`${API_BASE}/api/restaurants/me/orders`, { headers: authHeaders() }));
}

export async function updateOrderStatus(orderId, status) {
  return handle(await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  }));
}

// ---------- Admin auth & management ----------
export async function loginAdmin(username, password) {
  const data = await handle(await fetch(`${API_BASE}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }));
  localStorage.setItem("maestro_admin_token", data.token);
  return true;
}

function adminHeaders() {
  const token = localStorage.getItem("maestro_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminFetchRestaurants() {
  return handle(await fetch(`${API_BASE}/api/admin/restaurants`, { headers: adminHeaders() }));
}

export async function adminCreateRestaurant(payload) {
  return handle(await fetch(`${API_BASE}/api/admin/restaurants`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify(payload),
  }));
}

export async function adminAddMenuItem(restaurantId, name, price) {
  return handle(await fetch(`${API_BASE}/api/admin/restaurants/${restaurantId}/menu`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify({ name, price }),
  }));
}

export async function adminDeleteMenuItem(itemId) {
  return handle(await fetch(`${API_BASE}/api/admin/menu/${itemId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  }));
}

export async function adminSetPrinter(restaurantId, mode, ip, type) {
  return handle(await fetch(`${API_BASE}/api/admin/restaurants/${restaurantId}/printer`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify({ mode, ip, type }),
  }));
}

export { API_BASE };
