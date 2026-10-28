const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const port = 5101;
const baseUrl = `http://127.0.0.1:${port}/api`;
let server;
let customerToken;
let adminToken;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  return { response, body: await response.json() };
}

before(async () => {
  server = spawn(process.execPath, ["src/server.js"], {
    cwd: `${process.cwd()}/backend`,
    env: { ...process.env, PORT: String(port), ADMIN_EMAIL: "test-admin@quickserve.local", ADMIN_PASSWORD: "test-password-123" },
    stdio: "ignore"
  });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const health = await fetch(`${baseUrl}/health`);
      if (health.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Test server did not start");
});

after(() => server?.kill());

test("health reports a live database", async () => {
  const { response, body } = await request("/health");
  assert.equal(response.status, 200);
  assert.equal(body.status, "healthy");
  assert.match(body.database, /SQLite|PostgreSQL/);
});

test("customer can register and authenticate", async () => {
  const email = `test-${Date.now()}@quickserve.local`;
  const result = await request("/auth/register", { method: "POST", body: JSON.stringify({ name: "Test Customer", email, password: "customer-password" }) });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.data.user.role, "customer");
  customerToken = result.body.data.token;

  const me = await request("/auth/me", { headers: { authorization: `Bearer ${customerToken}` } });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.data.user.email, email);
});

test("payment intent and confirmation work", async () => {
  const intent = await request("/payments/intent", { method: "POST", body: JSON.stringify({ amount: 399, method: "upi" }) });
  assert.equal(intent.response.status, 201);
  const confirmation = await request(`/payments/${intent.body.data.paymentId}/confirm`, { method: "POST" });
  assert.equal(confirmation.response.status, 200);
  assert.equal(confirmation.body.data.status, "paid");
});

test("admin endpoints reject customers and allow admins", async () => {
  const blocked = await request("/admin/summary", { headers: { authorization: `Bearer ${customerToken}` } });
  assert.equal(blocked.response.status, 403);

  const login = await request("/auth/login", { method: "POST", body: JSON.stringify({ email: "test-admin@quickserve.local", password: "test-password-123" }) });
  assert.equal(login.response.status, 200);
  adminToken = login.body.data.token;
  const summary = await request("/admin/summary", { headers: { authorization: `Bearer ${adminToken}` } });
  assert.equal(summary.response.status, 200);
  assert.ok(Number.isInteger(summary.body.data.products));
});

test("order tracking returns a history list for a real order", async () => {
  const order = await request("/orders", {
    method: "POST",
    body: JSON.stringify({ customerName: "Test Customer", customerEmail: "tracking@quickserve.local", customerPhone: "9999999999", shippingAddress: "Test address, India", items: [{ id: 12, qty: 1 }] })
  });
  assert.equal(order.response.status, 201);
  const tracked = await request(`/orders/${order.body.data.orderId}`);
  assert.equal(tracked.response.status, 200);
  assert.ok(Array.isArray(tracked.body.data.tracking));
  assert.equal(tracked.body.data.tracking[0].status, "confirmed");
});

test("signed-in customers see only their own orders and can cancel eligible orders", async () => {
  const order = await request("/orders", {
    method: "POST",
    headers: { authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ customerName: "Test Customer", customerEmail: "owned@quickserve.local", customerPhone: "9999999999", shippingAddress: "Owned address, India", items: [{ id: 12, qty: 1 }] })
  });
  assert.equal(order.response.status, 201);
  const mine = await request("/orders/mine", { headers: { authorization: `Bearer ${customerToken}` } });
  assert.equal(mine.response.status, 200);
  assert.ok(mine.body.data.some(item => item.orderId === order.body.data.orderId));
  const cancelled = await request(`/orders/${order.body.data.orderId}/cancel`, { method: "PATCH", headers: { authorization: `Bearer ${customerToken}` } });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.data.orderStatus, "cancelled");
});

test("admins can read products and update stock", async () => {
  const products = await request("/admin/products", { headers: { authorization: `Bearer ${adminToken}` } });
  assert.equal(products.response.status, 200);
  assert.ok(products.body.data.length > 0);
  const product = products.body.data[0];
  const update = await request(`/admin/products/${product.id}/stock`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ stock: 42 })
  });
  assert.equal(update.response.status, 200);
  assert.equal(update.body.data.stock, 42);
});

test("admins can publish and customers can read live delivery location", async () => {
  const order = await request("/orders", {
    method: "POST",
    body: JSON.stringify({ customerName: "Location Customer", customerEmail: "location@quickserve.local", customerPhone: "9999999999", shippingAddress: "Location address, India", items: [{ id: 12, qty: 1 }] })
  });
  assert.equal(order.response.status, 201);
  const orderId = order.body.data.orderId;
  const update = await request(`/admin/orders/${orderId}/location`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ latitude: 28.6139, longitude: 77.209, accuracyM: 15, speedKmh: 24, etaMinutes: 18, provider: "test" })
  });
  assert.equal(update.response.status, 200);

  const live = await request(`/orders/${orderId}/live`);
  assert.equal(live.response.status, 200);
  assert.equal(live.body.data.available, true);
  assert.equal(live.body.data.location.etaMinutes, 18);
  assert.equal(live.body.data.location.provider, "test");
});
