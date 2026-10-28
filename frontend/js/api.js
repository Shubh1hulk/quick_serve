// QuickServe Backend API Connector
// Provides dynamic data sync with Express backend + SQLite/PostgreSQL database,
// with graceful fallback to cached data if backend is starting or offline.

const API = (() => {
  // Determine API base URL
  const isDirectBackend = window.location.port === "5000";
  const BASE_URL = isDirectBackend ? "/api" : "http://localhost:5000/api";

  let isConnected = false;

  async function checkHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        isConnected = true;
        updateBadge(true, data.database);
        return true;
      }
    } catch (e) {
      // Backend not yet reachable
    }
    isConnected = false;
    updateBadge(false);
    return false;
  }

  function updateBadge(live, dbType = "Live DB") {
    const el = document.getElementById("apiStatus");
    if (!el) return;
    if (live) {
      el.className = "api-badge live";
      el.innerHTML = `🟢 <b>API Live</b> · ${dbType.includes("PostgreSQL") ? "Postgres" : "SQLite"}`;
      el.title = `Connected to QuickServe Backend (${dbType})`;
    } else {
      el.className = "api-badge";
      el.innerHTML = `🟡 Offline Sync`;
      el.title = "Backend is offline. Using local storage & fast client cache.";
    }
  }

  async function fetchProducts(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${BASE_URL}/products?${query}`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.warn("API products fetch failed, using fallback:", e.message);
      return null;
    }
  }

  async function fetchBanners() {
    try {
      const res = await fetch(`${BASE_URL}/banners`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return null;
    }
  }

  async function fetchFeatured() {
    try {
      const res = await fetch(`${BASE_URL}/products/featured`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return null;
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`${BASE_URL}/categories`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      return null;
    }
  }

  async function createOrder(orderPayload) {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(localStorage.getItem("quickserveToken") ? { Authorization: `Bearer ${localStorage.getItem("quickserveToken")}` } : {}) },
      body: JSON.stringify(orderPayload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Failed to place order");
    }
    return json.data;
  }

  async function createPaymentIntent(amount, method) {
    const res = await fetch(`${BASE_URL}/payments/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method })
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Unable to create payment");
    return json.data;
  }

  async function confirmPayment(paymentId, details = {}) {
    const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(paymentId)}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details)
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || "Unable to confirm payment");
    return json.data;
  }

  // Periodic health check
  setTimeout(checkHealth, 50);
  setInterval(checkHealth, 15000);

  return {
    get BASE_URL() { return BASE_URL; },
    get isConnected() { return isConnected; },
    checkHealth,
    fetchProducts,
    fetchBanners,
    fetchFeatured,
    fetchCategories,
    createOrder,
    createPaymentIntent,
    confirmPayment
  };
})();
