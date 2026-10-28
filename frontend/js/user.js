const API_ROOT = window.location.port === "5000" ? "/api" : "http://localhost:5000/api";
const token = localStorage.getItem("quickserveToken");
const headers = { authorization: `Bearer ${token}` };
const money = value => `₹${Number(value).toLocaleString("en-IN")}`;
const label = value => value.replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());

async function api(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body.data;
}

async function load() {
  if (!token) return window.location.href = "auth.html";
  try {
    const user = (await api("/auth/me")).user;
    if (user.role === "admin") return window.location.href = "admin.html";
    document.getElementById("profileName").value = user.name;
    document.getElementById("profileEmail").value = user.email;
    const orders = await api("/orders/mine");
    document.getElementById("orderList").innerHTML = orders.length ? orders.map(order => `<article class="order-row"><div><b>${order.orderId}</b><br><small>${new Date(order.createdAt).toLocaleString()}</small></div><strong>${money(order.total)}</strong><span>${label(order.orderStatus)}</span><button class="btn-ghost small" data-view="${order.orderId}">View</button></article>`).join("") : "No orders yet. Start shopping to see them here.";
  } catch (error) {
    localStorage.removeItem("quickserveToken");
    window.location.href = "auth.html";
  }
}

document.getElementById("profileForm").addEventListener("submit", async event => {
  event.preventDefault();
  try { await api("/auth/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: document.getElementById("profileName").value }) }); document.getElementById("profileMessage").textContent = "Profile updated."; } catch (error) { document.getElementById("profileMessage").textContent = error.message; }
});

document.getElementById("orderList").addEventListener("click", async event => {
  const orderId = event.target.dataset.view;
  if (!orderId) return;
  const detail = document.getElementById("orderDetail");
  try {
    const order = await api(`/orders/${encodeURIComponent(orderId)}`);
    const canCancel = ["confirmed", "processing"].includes(order.orderStatus);
    detail.hidden = false;
    detail.innerHTML = `<h2>${order.orderId}</h2><p>Status: <b>${label(order.orderStatus)}</b> · ${money(order.total)}</p><p>${order.shippingAddress}</p><p>${(order.tracking || []).map(event => `${label(event.status)}: ${event.note || "Updated"}`).join("<br>")}</p>${order.liveLocation ? `<p>Courier: ${order.liveLocation.latitude.toFixed(5)}, ${order.liveLocation.longitude.toFixed(5)}${order.liveLocation.etaMinutes == null ? "" : ` · ETA ${order.liveLocation.etaMinutes} min`}</p>` : ""}${canCancel ? `<button class="btn-ghost" id="cancelOrder" data-order="${order.orderId}">Cancel order</button>` : ""}`;
  } catch (error) { detail.hidden = false; detail.textContent = error.message; }
});

document.getElementById("orderDetail").addEventListener("click", async event => {
  const orderId = event.target.dataset.order;
  if (!orderId) return;
  await api(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: "PATCH" });
  await load();
  document.getElementById("orderDetail").hidden = true;
});
document.getElementById("logout").addEventListener("click", async () => { try { await api("/auth/logout", { method: "POST" }); } finally { localStorage.removeItem("quickserveToken"); window.location.href = "auth.html"; } });
load();
