const API_ROOT = window.location.port === "5000" ? "/api" : "http://localhost:5000/api";
const token = localStorage.getItem("quickserveToken");
const headers = { authorization: `Bearer ${token}` };
const money = value => `₹${Number(value).toLocaleString("en-IN")}`;

async function loadDashboard() {
  if (!token) return window.location.href = "auth.html";
  const summaryResponse = await fetch(`${API_ROOT}/admin/summary`, { headers });
  if (summaryResponse.status === 401 || summaryResponse.status === 403) return window.location.href = "auth.html";
  const summary = (await summaryResponse.json()).data;
  document.getElementById("metrics").innerHTML = [
    ["Orders", summary.orders], ["Products", summary.products], ["Customers", summary.customers], ["Revenue", money(summary.revenue)]
  ].map(([label, value]) => `<article class="metric glass"><span>${label}</span><b>${value}</b></article>`).join("");

  const ordersResponse = await fetch(`${API_ROOT}/admin/orders`, { headers });
  const orders = (await ordersResponse.json()).data || [];
  document.getElementById("orders").innerHTML = orders.length ? orders.map(order => `<tr><td>${order.id}</td><td>${order.customer_name}<br><small>${order.customer_email}</small></td><td>${money(order.total)}</td><td>${order.payment_status}</td><td><select data-order="${order.id}"><option ${order.order_status === "confirmed" ? "selected" : ""}>confirmed</option><option ${order.order_status === "processing" ? "selected" : ""}>processing</option><option ${order.order_status === "shipped" ? "selected" : ""}>shipped</option><option ${order.order_status === "out_for_delivery" ? "selected" : ""}>out_for_delivery</option><option ${order.order_status === "delivered" ? "selected" : ""}>delivered</option><option ${order.order_status === "cancelled" ? "selected" : ""}>cancelled</option></select></td></tr>`).join("") : `<tr><td colspan="5">No orders yet.</td></tr>`;

  const productsResponse = await fetch(`${API_ROOT}/admin/products`, { headers });
  const products = (await productsResponse.json()).data || [];
  document.getElementById("products").innerHTML = products.length ? products.map(product => `<tr><td>${product.brand}<br><small>${product.name}</small></td><td>${product.category}</td><td>${money(product.price)}</td><td><input class="stock-input" data-stock-id="${product.id}" type="number" min="0" value="${product.stock}" style="width:75px;padding:7px;border-radius:6px;border:1px solid var(--border);background:var(--glass);color:var(--text)"></td><td><button class="btn-ghost small" data-save-stock="${product.id}">Save</button></td></tr>`).join("") : `<tr><td colspan="5">No products found.</td></tr>`;
}

document.getElementById("orders").addEventListener("change", async event => {
  const orderId = event.target.dataset.order;
  if (!orderId) return;
  await fetch(`${API_ROOT}/admin/orders/${encodeURIComponent(orderId)}/status`, { method: "PATCH", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ status: event.target.value }) });
});
document.getElementById("products").addEventListener("click", async event => {
  const productId = event.target.dataset.saveStock;
  if (!productId) return;
  const input = document.querySelector(`[data-stock-id="${productId}"]`);
  const response = await fetch(`${API_ROOT}/admin/products/${productId}/stock`, { method: "PATCH", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ stock: Number(input.value) }) });
  const result = await response.json();
  document.getElementById("inventoryMessage").textContent = response.ok ? "Inventory updated." : (result.message || "Unable to update inventory.");
});
document.getElementById("locationForm").addEventListener("submit", async event => {
  event.preventDefault();
  const message = document.getElementById("locationMessage");
  const orderId = document.getElementById("locationOrderId").value.trim();
  const response = await fetch(`${API_ROOT}/admin/orders/${encodeURIComponent(orderId)}/location`, {
    method: "PATCH",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      latitude: Number(document.getElementById("locationLatitude").value),
      longitude: Number(document.getElementById("locationLongitude").value),
      etaMinutes: Number(document.getElementById("locationEta").value) || null,
      provider: "admin-dashboard"
    })
  });
  const result = await response.json();
  message.textContent = response.ok ? "Location published." : (result.message || "Unable to publish location.");
});
document.getElementById("logout").addEventListener("click", () => { localStorage.removeItem("quickserveToken"); window.location.href = "auth.html"; });
loadDashboard().catch(() => { window.location.href = "auth.html"; });
