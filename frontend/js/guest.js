const API_ROOT = window.location.port === "5000" ? "/api" : "http://localhost:5000/api";
const result = document.getElementById("guestResult");
const statusLabel = status => status.replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());

document.getElementById("guestTrackForm").addEventListener("submit", async event => {
  event.preventDefault();
  const orderId = document.getElementById("guestOrderId").value.trim();
  result.textContent = "Loading order...";
  try {
    const response = await fetch(`${API_ROOT}/orders/${encodeURIComponent(orderId)}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Order not found");
    const order = body.data;
    result.innerHTML = `<div class="order-receipt glass"><b>${order.orderId}</b><p>Status: <strong>${statusLabel(order.orderStatus)}</strong></p><p>Total: ₹${Number(order.total).toLocaleString("en-IN")}</p><p>${(order.tracking || []).map(event => `${statusLabel(event.status)}: ${event.note || "Updated"}`).join("<br>")}</p>${order.liveLocation ? `<p>Live location: ${order.liveLocation.latitude.toFixed(5)}, ${order.liveLocation.longitude.toFixed(5)}${order.liveLocation.etaMinutes == null ? "" : ` · ETA ${order.liveLocation.etaMinutes} min`}</p>` : ""}</div>`;
  } catch (error) {
    result.textContent = error.message;
  }
});
