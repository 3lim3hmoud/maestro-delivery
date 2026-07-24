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

// ---------- Employee auth & dashboard ----------
export async function loginEmployee(code, password) {
  const data = await handle(await fetch(`${API_BASE}/api/auth/employee/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, password }),
  }));
  localStorage.setItem("maestro_employee_token", data.token);
  return data.employee;
}
export function logoutEmployee() {
  localStorage.removeItem("maestro_employee_token");
}
function employeeHeaders() {
  const token = localStorage.getItem("maestro_employee_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function employeeFetchOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return handle(await fetch(`${API_BASE}/api/employees/orders${qs ? `?${qs}` : ""}`, { headers: employeeHeaders() }));
}
export async function employeeQueue() {
  return handle(await fetch(`${API_BASE}/api/employees/couriers/queue`, { headers: employeeHeaders() }));
}
export async function employeeAssign(orderId, courierId) {
  return handle(await fetch(`${API_BASE}/api/employees/orders/${orderId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...employeeHeaders() },
    body: JSON.stringify({ courierId: courierId || undefined }),
  }));
}
export async function employeeEditOrder(orderId, payload) {
  return handle(await fetch(`${API_BASE}/api/employees/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...employeeHeaders() },
    body: JSON.stringify(payload),
  }));
}
export async function employeeCancelOrder(orderId) {
  return handle(await fetch(`${API_BASE}/api/employees/orders/${orderId}/cancel`, {
    method: "POST",
    headers: employeeHeaders(),
  }));
}
export async function employeeReceipt(orderId) {
  return handle(await fetch(`${API_BASE}/api/employees/orders/${orderId}/receipt`, { headers: employeeHeaders() }));
}

// ---------- Admin: reports ----------
export async function adminLiveReport() {
  return handle(await fetch(`${API_BASE}/api/admin/reports/live`, { headers: adminHeaders() }));
}
export async function adminRangeReport(range) {
  return handle(await fetch(`${API_BASE}/api/admin/reports?range=${range}`, { headers: adminHeaders() }));
}

// ---------- Admin: couriers ----------
export async function adminFetchCouriers() {
  return handle(await fetch(`${API_BASE}/api/admin/couriers`, { headers: adminHeaders() }));
}
export async function adminCreateCourier(payload) {
  return handle(await fetch(`${API_BASE}/api/admin/couriers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify(payload),
  }));
}

// ---------- Admin: employees ----------
export async function adminFetchEmployees() {
  return handle(await fetch(`${API_BASE}/api/admin/employees`, { headers: adminHeaders() }));
}
export async function adminCreateEmployee(payload) {
  return handle(await fetch(`${API_BASE}/api/admin/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify(payload),
  }));
}
export async function adminSetEmployeeActive(id, active) {
  return handle(await fetch(`${API_BASE}/api/admin/employees/${id}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify({ active }),
  }));
}

// ---------- Admin: customers ----------
export async function adminFetchCustomers() {
  return handle(await fetch(`${API_BASE}/api/admin/customers`, { headers: adminHeaders() }));
}
export async function adminBlockCustomer(phone, blocked) {
  return handle(await fetch(`${API_BASE}/api/admin/customers/${phone}/block`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify({ blocked }),
  }));
}

// ---------- Admin: restaurant active toggle ----------
export async function adminSetRestaurantActive(id, active) {
  return handle(await fetch(`${API_BASE}/api/admin/restaurants/${id}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...adminHeaders() },
    body: JSON.stringify({ active }),
  }));
}

export { API_BASE };
