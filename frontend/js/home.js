// Home page: hero ads, featured products, category cards. All content comes from data.js.
(() => {
  const el = (id) => document.getElementById(id);
  const rupee = (n) => "₹" + n.toLocaleString("en-IN");
  let i = Math.max(0, Math.min(BANNERS.length - 1, +new URLSearchParams(location.search).get("slide") || 0)), timer; // ?slide=N opens that ad

  /* Hero ad: everything comes from the linked product + the slide colours */
  const spin3d = HeroSpin.init(el("hCanvas"));
  let heroToken = 0;

  function renderHero() {
    const b = BANNERS[i];
    const p = byId(b.productId);
    const nxt = BANNERS[(i + 1) % BANNERS.length];
    const hero = el("hero");
    hero.style.setProperty("--h1", b.c1);
    hero.style.setProperty("--h2", b.c2);
    el("hKicker").textContent = b.kicker;
    el("hGiant").textContent = p.brand.toUpperCase();
    el("hLine1").textContent = p.brand;
    el("hHl").textContent = shortName(p);
    el("hTag").textContent = b.tagline;
    el("hPrice").textContent = rupee(p.price);
    el("hMrp").textContent = rupee(p.mrp);
    el("hOff").textContent = `${pctOff(p)}% off`;
    el("hText").textContent = p.specs.slice(0, 3).join(" · ");
    el("hChips").innerHTML = [p.assured ? "✔ Assured" : null, p.delivery, p.offer]
      .filter(Boolean).map(c => `<span>${c}</span>`).join("");
    el("hOptions").innerHTML = b.options.map((o, k) => `<button class="${k === 0 ? "on" : ""}">${o}</button>`).join("");
    el("hDeals").textContent = `More in ${p.category}`;
    el("hNextIcon").innerHTML = `<img src="${byId(nxt.productId).cut}" alt="">`;
    el("hNextName").textContent = byId(nxt.productId).brand;
    el("hDots").innerHTML = BANNERS.map((_, k) => `<span class="${k === i ? "on" : ""}" data-dot="${k}"></span>`).join("");
    const photo = el("hPhoto");
    photo.src = p.hd || p.cut; photo.alt = p.name;
    if (spin3d) {                                   // swap the flat cutout for the spinnable 3D body once it is ready
      const mine = ++heroToken;
      HeroSpin.show(p.hd || p.cut, { ...b, glb: `assets/models/p${p.id}.glb` }).then(ok => { if (mine === heroToken) { photo.hidden = ok; el("hCanvas").hidden = !ok; } });
    }
    // the next three products float around the main one, like the icons in the reference
    [1, 2, 3].forEach((k, n) => { const s = el("sat" + (n + 1)), q = byId(BANNERS[(i + k) % BANNERS.length].productId); s.src = q.cut; s.alt = q.name; });
    el("photoFrame").style.setProperty("--photo", `url("${p.image}")`);   // used by the motion-blur ghosts
    for (const n of [el("heroText"), el("heroArt"), el("heroRight")]) {
      n.classList.remove("swap"); void n.offsetWidth; n.classList.add("swap");
    }
  }
  const go = (d) => { i = (i + d + BANNERS.length) % BANNERS.length; renderHero(); restart(); };
  const restart = () => { clearInterval(timer); if (!/[?&]still/.test(location.search)) timer = setInterval(() => go(1), 7000); };   // ?still = no auto-slide (for testing)

  el("hPrev").addEventListener("click", () => go(-1));
  el("hNext").addEventListener("click", () => go(1));
  el("hNextCard").addEventListener("click", () => go(1));
  el("hDots").addEventListener("click", (e) => {
    const k = e.target.dataset.dot;
    if (k !== undefined) { i = +k; renderHero(); restart(); }
  });
  el("hOptions").addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    el("hOptions").querySelectorAll("button").forEach(b => b.classList.remove("on"));
    e.target.classList.add("on");
  });
  el("hShop").addEventListener("click", () => {
    Store.addToCart(BANNERS[i].productId);
    refreshAll();
    if (typeof openCheckoutModal === "function") {
      openCheckoutModal();
    } else {
      openDrawer("cartDrawer");
    }
  });
  el("hDeals").addEventListener("click", () => {
    setCategory(BANNERS[i].category);
    el("products").scrollIntoView({ behavior: "smooth" });
  });

  /* "Deal ends in" countdown to local midnight */
  function tick() {
    const end = new Date(); end.setHours(24, 0, 0, 0);
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const pad = (n) => String(n).padStart(2, "0");
    el("hTimer").textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
  }
  tick(); setInterval(tick, 1000);

  /* Featured products: round cart button uses data-add, handled by app.js */
  el("featured").innerHTML = FEATURED.map(({ id, badge }) => {
    const p = byId(id);
    return `
      <article class="card feat">
        <span class="tag">${badge}</span>
        ${productImage(p)}
        <div class="cat">${p.brand}</div>
        <h4 class="card-title" title="${p.name}">${p.name}</h4>
        <div class="rating"><span class="rpill">${p.rating} ★</span> (${p.reviews.toLocaleString("en-IN")})</div>
        <ul class="specs">${p.specs.map(s => `<li>${s}</li>`).join("")}</ul>
        <div class="price"><b>${rupee(p.price)}</b><s>${rupee(p.mrp)}</s><span class="off">${pctOff(p)}% off</span></div>
        <div class="feat-foot">
          <span class="delivery">${p.delivery}</span>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="btn-ghost small" data-qview="${p.id}" style="padding:6px 10px;font-size:0.78rem;" title="Quick View">👁️</button>
            <button class="round-cart" data-add="${p.id}" aria-label="Add to cart">🛒</button>
          </div>
        </div>
      </article>`;
  }).join("");

  /* Category cards */
  el("catCards").innerHTML = CATEGORIES.map(c => {
    const info = CATEGORY_INFO[c];
    return `
      <button class="cat-card glass" data-pick="${c}">
        <div>
          <h4>${c}</h4>
          <p>${info.desc}</p>
          <span class="blue">Min. ${info.minOff}% Off · ${info.count} items →</span>
        </div>
        ${productImage(info.cover, "cat-thumb")}
      </button>`;
  }).join("");
  el("catCards").addEventListener("click", (e) => {
    const b = e.target.closest("[data-pick]");
    if (!b) return;
    setCategory(b.dataset.pick);
    el("products").scrollIntoView({ behavior: "smooth" });
  });

  renderHero();
  restart();
})();
