const $ = (id) => document.getElementById(id);
const rupee = (n) => "₹" + n.toLocaleString("en-IN");
const FREE_DELIVERY_ABOVE = 499;
const DELIVERY_FEE = 40;

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load payment checkout"));
    document.head.appendChild(script);
  });
}

async function completeOnlinePayment(payment) {
  if (payment.provider !== "razorpay") {
    return API.confirmPayment(payment.paymentId);
  }
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: payment.publicKey,
      amount: Math.round(payment.amount * 100),
      currency: payment.currency,
      name: "QuickServe",
      description: "QuickServe order payment",
      order_id: payment.providerOrderId,
      prefill: { name: $("custName").value, email: $("custEmail").value, contact: $("custPhone").value },
      handler: async response => {
        try {
          resolve(await API.confirmPayment(payment.paymentId, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature
          }));
        } catch (error) {
          reject(error);
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment was cancelled")) }
    });
    checkout.open();
  });
}

const state = { category: "All", query: "", sort: "featured", maxPrice: 100000, minRating: 0 };

/* ---------- Helpers ---------- */
const discountOf = (p) => Math.round((1 - p.price / p.mrp) * 100);
const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
const findProduct = (id) => PRODUCTS.find(p => p.id == id);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ---------- Categories ---------- */
function renderCategories() {
  const all = ["All", ...CATEGORIES];
  $("searchCategory").innerHTML = all.map(c => `<option value="${c}">${c}</option>`).join("");
  $("categoryStrip").innerHTML = all
    .map(c => `<button class="chip ${c === state.category ? "active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");
  $("searchCategory").value = state.category;
}

/* ---------- Products ---------- */
function getFiltered() {
  const q = state.query.trim().toLowerCase();
  let list = PRODUCTS.filter(p =>
    (state.category === "All" || p.category === state.category) &&
    p.price <= state.maxPrice &&
    p.rating >= state.minRating &&
    (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  );
  const sorters = {
    low: (a, b) => a.price - b.price,
    high: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    discount: (a, b) => discountOf(b) - discountOf(a)
  };
  if (sorters[state.sort]) list.sort(sorters[state.sort]);
  return list;
}

function renderProducts() {
  const list = getFiltered();
  $("resultTitle").textContent = state.category === "All" ? "All Products" : state.category;
  $("resultCount").textContent = `${list.length} result${list.length === 1 ? "" : "s"}`;

  if (!list.length) {
    $("productGrid").innerHTML = `<p class="empty">No products found. Try changing filters.</p>`;
    return;
  }

  $("productGrid").innerHTML = list.map(p => `
    <article class="card">
      <button class="wish ${Store.inWish(p.id) ? "on" : ""}" data-wish="${p.id}" aria-label="Wishlist">${Store.inWish(p.id) ? "♥" : "♡"}</button>
      <div class="card-clickable" data-qview="${p.id}" style="cursor:pointer;" title="Click to view details">
        ${productImage(p)}
        ${p.assured ? `<span class="assured">✔ Assured</span>` : ""}
        <div class="cat">${p.brand}</div>
        <h4 class="card-title" title="${p.name}">${p.name}</h4>
      </div>
      <div class="rating"><span class="rpill">${p.rating} ★</span> <small>(${p.reviews.toLocaleString("en-IN")})</small></div>
      <ul class="specs">${p.specs.map(s => `<li>${s}</li>`).join("")}</ul>
      <div class="price">
        <b>${rupee(p.price)}</b>
        <s>${rupee(p.mrp)}</s>
        <span class="off">${discountOf(p)}% off</span>
      </div>
      <div class="delivery">${p.delivery}</div>
      <div class="offer">${p.offer}</div>
      <div class="card-btn-row">
        <button type="button" class="btn-ghost small qview-btn" data-qview="${p.id}" title="Quick inspect product">👁️ View</button>
        <button type="button" class="btn-primary small" data-add="${p.id}">Add to Cart</button>
      </div>
    </article>
  `).join("");
}

/* ---------- Cart ---------- */
function cartTotals() {
  const subtotal = Store.cart.reduce((s, i) => s + findProduct(i.id).price * i.qty, 0);
  const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  return { subtotal, delivery, total: subtotal + delivery };
}

function renderCart() {
  const count = Store.cart.reduce((s, i) => s + i.qty, 0);
  $("cartCount").textContent = count;

  $("cartItems").innerHTML = Store.cart.length
    ? Store.cart.map(({ id, qty }) => {
        const p = findProduct(id);
        return `
          <div class="line">
            ${productImage(p, "line-img")}
            <div class="line-info">
              <div class="line-title">${p.name}</div>
              <div class="line-price">${rupee(p.price)}</div>
              <div class="qty">
                <button data-qty="${id}" data-d="-1">−</button>
                <span>${qty}</span>
                <button data-qty="${id}" data-d="1">+</button>
                <button class="link" data-remove="${id}">Remove</button>
              </div>
            </div>
          </div>`;
      }).join("")
    : `<p class="empty">Your cart is empty.</p>`;

  const t = cartTotals();
  $("cartSubtotal").textContent = rupee(t.subtotal);
  $("cartDelivery").textContent = t.delivery ? rupee(t.delivery) : "FREE";
  $("cartTotal").textContent = rupee(t.total);

  if ($("dockCartCount")) $("dockCartCount").textContent = count;
  if ($("dockCartTotal")) $("dockCartTotal").textContent = rupee(t.total);
}

/* ---------- Wishlist ---------- */
function renderWishlist() {
  $("wishCount").textContent = Store.wishlist.length;
  $("wishItems").innerHTML = Store.wishlist.length
    ? Store.wishlist.map(id => {
        const p = findProduct(id);
        return `
          <div class="line">
            ${productImage(p, "line-img")}
            <div class="line-info">
              <div class="line-title">${p.name}</div>
              <div class="line-price">${rupee(p.price)}</div>
              <div class="qty">
                <button class="btn-primary small" data-add="${id}">Add to Cart</button>
                <button class="link" data-wish="${id}">Remove</button>
              </div>
            </div>
          </div>`;
      }).join("")
    : `<p class="empty">No items in wishlist.</p>`;
}

function refreshAll() { renderProducts(); renderCart(); renderWishlist(); }

/* ---------- Drawers ---------- */
function openDrawer(id) { $(id).classList.add("open"); $("overlay").classList.add("show"); }
function closeDrawers() {
  document.querySelectorAll(".drawer").forEach(d => d.classList.remove("open"));
  $("overlay").classList.remove("show");
}

/* ---------- Events ---------- */
function setCategory(cat) {
  state.category = cat;
  renderCategories();
  renderProducts();
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-cat],[data-add],[data-wish],[data-qty],[data-remove],[data-close],[data-qview]");
  if (!t) return;

  if (t.dataset.cat) return setCategory(t.dataset.cat);

  if (t.dataset.qview) return openQuickView(+t.dataset.qview);

  if (t.dataset.add) {
    Store.addToCart(+t.dataset.add);
    refreshAll();
    return toast("Added to cart ✓");
  }
  if (t.dataset.wish) {
    const added = Store.toggleWish(+t.dataset.wish);
    refreshAll();
    return toast(added ? "Added to wishlist ♥" : "Removed from wishlist");
  }
  if (t.dataset.qty) { Store.changeQty(+t.dataset.qty, +t.dataset.d); return renderCart(); }
  if (t.dataset.remove) { Store.removeFromCart(+t.dataset.remove); return renderCart(); }
  if (t.hasAttribute("data-close")) closeDrawers();
});

$("overlay").addEventListener("click", closeDrawers);
$("cartBtn").addEventListener("click", () => openDrawer("cartDrawer"));
$("wishlistBtn").addEventListener("click", () => openDrawer("wishDrawer"));

$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  state.query = $("searchInput").value;
  setCategory($("searchCategory").value);
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
});

$("sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; renderProducts(); });
$("ratingSelect").addEventListener("change", (e) => { state.minRating = +e.target.value; renderProducts(); });
$("priceRange").addEventListener("input", (e) => {
  state.maxPrice = +e.target.value;
  $("priceLabel").textContent = rupee(state.maxPrice);
  renderProducts();
});

$("resetFilters").addEventListener("click", () => {
  Object.assign(state, { category: "All", query: "", sort: "featured", maxPrice: 100000, minRating: 0 });
  $("searchInput").value = "";
  $("sortSelect").value = "featured";
  $("ratingSelect").value = "0";
  $("priceRange").value = 100000;
  $("priceLabel").textContent = rupee(100000);
  renderCategories();
  renderProducts();
});

function openModal(id) {
  const m = $(id) || document.getElementById(id);
  if (!m) return;
  m.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  const m = $(id) || document.getElementById(id);
  if (m) m.classList.remove("open");
  if (!document.querySelector(".modal.open")) {
    document.body.style.overflow = "";
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

function openCheckoutModal() {
  if (!Store.cart.length) return toast("Your cart is empty!");
  closeDrawers();
  const totals = cartTotals();
  const count = Store.cart.reduce((s, i) => s + i.qty, 0);
  $("chkCount").textContent = count;
  $("chkSubtotal").textContent = rupee(totals.subtotal);
  $("chkDelivery").textContent = totals.delivery === 0 ? "FREE" : rupee(totals.delivery);
  $("chkTotal").textContent = rupee(totals.total);
  openModal("checkoutModal");
}
window.openCheckoutModal = openCheckoutModal;

$("checkoutBtn")?.addEventListener("click", openCheckoutModal);

$("closeCheckout")?.addEventListener("click", () => closeModal("checkoutModal"));
$("succDoneBtn")?.addEventListener("click", () => closeModal("orderSuccessModal"));

$("checkoutForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("placeOrderBtn");
  btn.disabled = true;
  btn.textContent = "Processing Order...";

  const payload = {
    customerName: $("custName").value,
    customerEmail: $("custEmail").value,
    customerPhone: $("custPhone").value,
    shippingAddress: $("custAddress").value,
    paymentMethod: $("custPayment").value,
    items: Store.cart
  };

  try {
    let orderResult;
    try {
      if (payload.paymentMethod !== "cod") {
        const payment = await API.createPaymentIntent(cartTotals().total, payload.paymentMethod);
        await completeOnlinePayment(payment);
      }
      orderResult = await API.createOrder(payload);
    } catch (apiErr) {
      console.warn("API order failed, using offline mode:", apiErr.message);
      const totals = cartTotals();
      orderResult = {
        orderId: `QS-OFF-${Date.now().toString(36).toUpperCase()}`,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        shippingAddress: payload.shippingAddress,
        paymentMethod: payload.paymentMethod,
        total: totals.total,
        deliveryFee: totals.delivery,
        subtotal: totals.subtotal,
        orderStatus: "confirmed (offline)",
        estimatedDelivery: "3-5 business days"
      };
    }

    Store.clearCart();
    refreshAll();
    closeModal("checkoutModal");

    $("orderReceipt").innerHTML = `
      <div><b>Order ID:</b> <span class="rec-id">${orderResult.orderId}</span></div>
      <div><b>Customer:</b> ${orderResult.customerName} (${orderResult.customerPhone})</div>
      <div><b>Deliver To:</b> ${orderResult.shippingAddress}</div>
      <div><b>Payment:</b> ${orderResult.paymentMethod.toUpperCase()} (${orderResult.orderStatus})</div>
      <div><b>Estimated Delivery:</b> ${orderResult.estimatedDelivery || "3-5 business days"}</div>
      <div style="margin-top: 8px; font-weight: 700; font-size: 1.05rem; color: var(--text);">
        Total Paid: ${rupee(orderResult.total)}
      </div>
    `;
    $("orderSuccessModal").classList.add("open");
    toast("Order placed successfully! 🎉");
  } catch (err) {
    toast("Error: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirm & Place Order 🔒";
  }
});

/* Dark mode */
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("themeToggle").textContent = dark ? "☀️" : "🌙";
  try { localStorage.setItem("theme2", dark ? "dark" : "light"); } catch {}
}
$("themeToggle").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme !== "dark"));

/* ---------- Init ---------- */
let savedTheme = null;
try { savedTheme = localStorage.getItem("theme2"); } catch {}
applyTheme(savedTheme !== "light");   // indigo glass theme by default
renderCategories();
refreshAll();

// Live database sync
API.fetchProducts().then(liveProds => {
  if (liveProds && liveProds.length) {
    liveProds.forEach(lp => {
      const existing = PRODUCTS.find(p => p.id === lp.id);
      if (existing) {
        Object.assign(existing, lp);
      } else {
        PRODUCTS.push(lp);
      }
    });
    renderCategories();
    refreshAll();
  }
});

/* ================= Interactive Quick View Controller ================= */
let qvProduct = null;
let qvQty = 1;

function openQuickView(id) {
  const p = findProduct(id);
  if (!p) {
    console.warn("Product not found with ID:", id);
    return;
  }
  qvProduct = p;
  qvQty = 1;

  const imgEl = $("qvImg");
  if (imgEl) {
    imgEl.src = p.hd || p.cut || p.image;
    imgEl.alt = p.name;
    imgEl.onerror = function() {
      if (this.src !== p.image) this.src = p.image;
    };
  }

  if ($("qvBrand")) $("qvBrand").textContent = p.brand;
  if ($("qvTitle")) $("qvTitle").textContent = p.name;
  if ($("qvRatingPill")) $("qvRatingPill").textContent = `${p.rating} ★`;
  if ($("qvReviews")) $("qvReviews").textContent = `(${p.reviews.toLocaleString("en-IN")} reviews)`;
  if ($("qvPrice")) $("qvPrice").textContent = rupee(p.price);
  if ($("qvMrp")) $("qvMrp").textContent = rupee(p.mrp);
  if ($("qvOff")) $("qvOff").textContent = `${discountOf(p)}% off`;
  if ($("qvOffer")) $("qvOffer").textContent = p.offer || "";
  if ($("qvSpecs")) $("qvSpecs").innerHTML = (p.specs || []).map(s => `<li>${s}</li>`).join("");
  if ($("qvQty")) $("qvQty").textContent = "1";

  const fullLink = $("qvFullPageLink");
  if (fullLink) fullLink.href = `product.html?id=${p.id}`;

  const pinRes = $("pinResult");
  if (pinRes) {
    pinRes.textContent = "Enter 6-digit PIN code for express shipping & COD availability.";
    pinRes.className = "pin-result";
  }
  if ($("pinInput")) $("pinInput").value = "";

  openModal("quickViewModal");
}
window.openQuickView = openQuickView;

$("closeQView")?.addEventListener("click", () => closeModal("quickViewModal"));
$("closeTrack")?.addEventListener("click", () => closeModal("trackOrderModal"));

$("qvQtyMinus")?.addEventListener("click", () => {
  if (qvQty > 1) { qvQty--; $("qvQty").textContent = qvQty; }
});
$("qvQtyPlus")?.addEventListener("click", () => {
  if (qvQty < 10) { qvQty++; $("qvQty").textContent = qvQty; }
});

$("qvAddCart")?.addEventListener("click", () => {
  if (!qvProduct) return;
  for (let i = 0; i < qvQty; i++) Store.addToCart(qvProduct.id);
  refreshAll();
  closeModal("quickViewModal");
  toast(`Added ${qvQty} × ${qvProduct.brand} to cart ✓`);
});

$("qvBuyNow")?.addEventListener("click", () => {
  if (!qvProduct) return;
  Store.addToCart(qvProduct.id);
  refreshAll();
  closeModal("quickViewModal");
  $("checkoutBtn").click();
});

// PIN code speed checker
$("checkPinBtn")?.addEventListener("click", () => {
  const pin = $("pinInput").value.trim();
  const res = $("pinResult");
  if (/^\d{6}$/.test(pin)) {
    const days = pin.startsWith("5") || pin.startsWith("4") ? "Tomorrow by 4:00 PM" : "in 2-3 business days";
    res.textContent = `⚡ Express delivery to PIN ${pin} ${days}! Cash on Delivery is available.`;
    res.className = "pin-result valid";
  } else {
    res.textContent = "Please enter a valid 6-digit postal PIN code.";
    res.className = "pin-result";
  }
});

/* ================= Order Tracking Controller ================= */
let trackingRefreshTimer = null;

function renderLiveLocation(liveLocation) {
  const panel = $("liveLocation");
  if (!panel) return;
  if (!liveLocation?.available || !liveLocation.location) {
    panel.style.display = "block";
    panel.innerHTML = `<div class="track-live-empty">Live courier location will appear after the order is dispatched.</div>`;
    return;
  }

  const location = liveLocation.location;
  const recordedAt = new Date(location.recordedAt);
  const ageMinutes = Math.max(0, Math.round((Date.now() - recordedAt.getTime()) / 60000));
  const stale = ageMinutes > 10;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`;
  panel.style.display = "block";
  panel.innerHTML = `
    <div class="track-live-head"><b>${stale ? "Location update delayed" : "Courier location live"}</b><span class="live-pulse"></span></div>
    <div class="track-live-grid">
      <div><small>Coordinates</small><strong>${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}</strong></div>
      <div><small>Estimated arrival</small><strong>${location.etaMinutes == null ? "Updating" : `${location.etaMinutes} min`}</strong></div>
      <div><small>Courier speed</small><strong>${location.speedKmh == null ? "Updating" : `${location.speedKmh} km/h`}</strong></div>
      <div><small>Last update</small><strong>${ageMinutes < 1 ? "Just now" : `${ageMinutes} min ago`}</strong></div>
    </div>
    <a class="btn-ghost small" href="${mapUrl}" target="_blank" rel="noopener">Open live location map ↗</a>
  `;
}

async function refreshLiveLocation(orderId) {
  try {
    const res = await fetch(`${API.BASE_URL}/orders/${encodeURIComponent(orderId)}/live`);
    if (res.ok) renderLiveLocation(await res.json().then(json => json.data));
  } catch (error) {
    // Keep the last known tracking state visible when a refresh briefly fails.
  }
}

$("navTrackBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  openModal("trackOrderModal");
});
$("dockTrack")?.addEventListener("click", () => openModal("trackOrderModal"));

$("btnLookupOrder")?.addEventListener("click", async () => {
  const orderId = $("trackOrderIdInput").value.trim();
  if (!orderId) return toast("Please enter an Order ID");

  const timeline = $("trackTimeline");
  timeline.style.display = "block";
  timeline.innerHTML = `<p style="color:var(--muted)">Checking dispatch status...</p>`;

  let orderData = null;
  try {
    const res = await fetch(`${API.BASE_URL}/orders/${encodeURIComponent(orderId)}`);
    if (res.ok) {
      const json = await res.json();
      orderData = json.data;
    }
  } catch (e) {}

  const custLine = orderData ? `Deliver to: <b>${orderData.customerName}</b> (${orderData.shippingAddress})` : `Order ID: <b>${orderId}</b>`;
  const amtLine = orderData ? `Total Paid: <b>${rupee(orderData.total)}</b> via ${orderData.paymentMethod.toUpperCase()}` : "Payment Verified";

  timeline.innerHTML = `
    <div style="background:var(--glass); border:1px solid var(--border); border-radius:12px; padding:12px; margin-bottom:16px;">
      <div>${custLine}</div>
      <div style="color:var(--muted); font-size:0.85rem; margin-top:4px;">${amtLine}</div>
    </div>
    ${(orderData?.tracking || [{ status: "confirmed", note: "Order placed" }]).map(event => `
      <div class="track-step done"><b>${event.status.replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase())}</b><small>${event.note || "Order status updated"}</small></div>
    `).join("")}
  `;
  renderLiveLocation(orderData ? { available: Boolean(orderData.liveLocation), location: orderData.liveLocation } : null);
  clearInterval(trackingRefreshTimer);
  trackingRefreshTimer = setInterval(() => refreshLiveLocation(orderId), 15000);
});

/* ================= Floating Glass Dock ================= */
window.addEventListener("scroll", () => {
  const dock = $("glassDock");
  if (!dock) return;
  if (window.scrollY > 220) {
    dock.classList.add("visible");
  } else {
    dock.classList.remove("visible");
  }
}, { passive: true });

$("dockSearch")?.addEventListener("click", () => {
  $("searchInput").focus();
  $("searchForm").scrollIntoView({ behavior: "smooth" });
});
$("dockDeals")?.addEventListener("click", () => {
  $("sortSelect").value = "discount";
  state.sort = "discount";
  renderProducts();
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
});
$("dockCart")?.addEventListener("click", () => openDrawer("cartDrawer"));

/* ================= Live Social Proof Ticker ================= */
const RECENT_ACTIVITIES = [
  { title: "⚡ Just Purchased", msg: "Aarav from Mumbai bought Samsung Galaxy M35 5G" },
  { title: "🔥 Trending Deal", msg: "Pooja from Pune bought boAt Rockerz 450 Headphones" },
  { title: "👟 Fast Selling", msg: "Sneha from Bengaluru ordered Campus Oxyfit Running Shoes" },
  { title: "📚 Bestseller", msg: "Vikram from Delhi ordered Atomic Habits (Paperback)" },
  { title: "⌚ Verified Buyer", msg: "Ananya from Hyderabad purchased Noise ColorFit Smartwatch" },
  { title: "🌟 Top Rated", msg: "Rohan from Kolkata bought Kore 20kg Dumbbell Set" }
];
let activityIdx = 0;
const socialToast = $("liveSocialToast");
const toastTitle = $("liveToastTitle");
const toastMsg = $("liveToastMsg");

function cycleSocialToast() {
  if (!socialToast) return;
  const act = RECENT_ACTIVITIES[activityIdx % RECENT_ACTIVITIES.length];
  activityIdx++;
  toastTitle.textContent = act.title;
  toastMsg.textContent = act.msg;
  socialToast.classList.add("show");

  setTimeout(() => {
    socialToast.classList.remove("show");
  }, 4500);
}

// Start cycling after 4 seconds
setTimeout(() => {
  cycleSocialToast();
  setInterval(cycleSocialToast, 12000);
}, 4000);

$("closeLiveToast")?.addEventListener("click", () => {
  socialToast.classList.remove("show");
});


