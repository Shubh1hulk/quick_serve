// Hero 3D spinner: turns a transparent product cutout into a photo-textured 3D body
// (the silhouette is inflated into a rounded volume, front and back carry the real photo)
// and lets the user spin it 360 degrees by touching / dragging / tapping it.
// Usage: HeroSpin.init(canvas) -> true/false;  await HeroSpin.show("assets/products/c1.png") -> true/false
const HeroSpin = (() => {
  if (!window.THREE) return { init: () => false, show: async () => false };
  const T = THREE;

  let renderer, scene, camera, holder, current, canvas, running = false, last = 0, token = 0;
  const st = { base: 0, v: 0, drag: false, x0: 0, moved: 0, spin: 0, enter: 1 };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cache = new Map();                                   // url -> Promise<{img, w, h}>

  function makeEnv() {                                       // soft studio reflections
    const env = new T.Scene(); env.background = new T.Color("#241a18");
    const panel = (w, h, x, y, z, rx, ry, c) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
    };
    panel(12, 4, 0, 6, 0, Math.PI / 2, 0, "#ffffff"); panel(4, 9, -7, 1, 2, 0, Math.PI / 2, "#fff4ea");
    panel(4, 9, 7, 1, -2, 0, -Math.PI / 2, "#ffd9c2"); panel(9, 4, 0, 0, -7, 0, 0, "#ffe6d4");
    const pm = new T.PMREMGenerator(renderer); const tex = pm.fromScene(env, .02).texture; pm.dispose(); return tex;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();                       // the canvas' own displayed size
    if (!r.width || !r.height) return;
    renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio || 1, 2), 3));   // always at least 2x so edges stay crisp
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }

  function init(el) {
    canvas = el;
    try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch { return false; }
    renderer.outputEncoding = T.sRGBEncoding;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(30, 1, .1, 60); camera.position.set(0, .1, 9.5);
    scene.environment = makeEnv();
    scene.add(new T.HemisphereLight("#ffffff", "#8a6a60", .55));
    const key = new T.DirectionalLight("#ffffff", .9); key.position.set(3, 4, 6); scene.add(key);
    holder = new T.Group(); scene.add(holder);
    new ResizeObserver(resize).observe(canvas); resize();

    canvas.addEventListener("pointerdown", (e) => { st.drag = true; st.x0 = e.clientX; st.moved = 0; st.v = 0; st.spin = 0; canvas.setPointerCapture(e.pointerId); canvas.classList.add("grab"); });
    canvas.addEventListener("pointermove", (e) => {
      if (!st.drag) return;
      const dx = e.clientX - st.x0; st.x0 = e.clientX; st.moved += Math.abs(dx);
      st.base += dx * .014; st.v = dx * .014;
    });
    const up = () => {
      if (!st.drag) return; st.drag = false; canvas.classList.remove("grab");
      if (st.moved < 5) st.spin = Math.PI * 2;               // a plain tap = one full turn
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    return true;
  }

  function start() { if (!running && renderer) { running = true; last = performance.now(); requestAnimationFrame(loop); } }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;   // browsers pause rAF in hidden tabs by themselves
    if (!st.drag) {
      if (st.spin > 0) {                                      // ease-out full turn after a tap
        const step = Math.max(st.spin * 6 * dt, .02); st.base += Math.min(step, st.spin); st.spin = Math.max(0, st.spin - step);
      }
      st.base += st.v; st.v *= .95;                           // inertia after a drag
    }
    const idle = reduceMotion || st.drag || st.spin > 0 || Math.abs(st.v) > .002 ? 0 : Math.sin(now / 1400) * .22;
    holder.rotation.y = st.base + idle;
    holder.position.y = Math.sin(now / 900) * .07;
    if (st.enter < 1) { st.enter = Math.min(1, st.enter + dt / .6); const e = 1 - Math.pow(1 - st.enter, 3); holder.scale.setScalar(.5 + .5 * e); }
    try { renderer.render(scene, camera); } catch (err) { console.error("HeroSpin render failed", err); running = false; return; }
    requestAnimationFrame(loop);
  }

  function loadImage(url) {
    if (!cache.has(url)) cache.set(url, new Promise((ok, fail) => {
      const img = new Image(); img.onload = () => ok(img); img.onerror = fail; img.src = url;
    }));
    return cache.get(url);
  }

  /* silhouette -> inflated 3D body: z = T * sqrt(distance-to-edge / max-distance) on the front, mirrored on the back */
  function buildBody(img, depth) {
    const G = 220, ar = img.width / img.height;
    const gw = ar >= 1 ? G : Math.round(G * ar), gh = ar >= 1 ? Math.round(G / ar) : G;
    const c = document.createElement("canvas"); c.width = gw; c.height = gh;
    const cx = c.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0, gw, gh);
    const px = cx.getImageData(0, 0, gw, gh).data;
    const inside = new Uint8Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) inside[i] = px[i * 4 + 3] > 40 ? 1 : 0;
    // distance transform (two-pass chamfer)
    const d = new Float32Array(gw * gh), INF = 1e6;
    for (let i = 0; i < d.length; i++) d[i] = inside[i] ? INF : 0;
    const at = (x, y) => (x < 0 || y < 0 || x >= gw || y >= gh) ? 0 : d[y * gw + x];
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = y * gw + x; if (!inside[i]) continue;
      d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414); }
    for (let y = gh - 1; y >= 0; y--) for (let x = gw - 1; x >= 0; x--) { const i = y * gw + x; if (!inside[i]) continue;
      d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414); }
    let dmax = 1; for (let i = 0; i < d.length; i++) if (d[i] < INF && d[i] > dmax) dmax = d[i];

    const H = 3.4, W = H * ar, sx = W / (gw - 1), sy = H / (gh - 1);
    const thick = Math.max(.04, depth * Math.max(W, H));                // half-thickness: real products are not paper thin
    // keep every cell that touches the silhouette (alphaTest trims the rest crisply)
    const keep = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      for (let oy = -1; oy <= 1 && !keep[y * gw + x]; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox, ny = y + oy; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && inside[ny * gw + nx]) { keep[y * gw + x] = 1; break; }
      }
    }
    const pos = [], uv = [], idxF = [], idxB = [], map = new Int32Array(gw * gh).fill(-1);
    let n = 0;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const i = y * gw + x; if (!keep[i]) continue;
      const dist = d[i] >= INF ? 0 : d[i]; const z = thick * Math.sqrt(dist / dmax);
      const X = x * sx - W / 2, Y = H / 2 - y * sy, u = x / (gw - 1), v = 1 - y / (gh - 1);
      pos.push(X, Y, z, X, Y, -z); uv.push(u, v, u, v); map[i] = n; n += 2;
    }
    for (let y = 0; y < gh - 1; y++) for (let x = 0; x < gw - 1; x++) {
      const a = map[y * gw + x], b = map[y * gw + x + 1], c2 = map[(y + 1) * gw + x], e = map[(y + 1) * gw + x + 1];
      if (a < 0 || b < 0 || c2 < 0 || e < 0) continue;
      idxF.push(a, c2, b, b, c2, e);                                   // front (z+)
      idxB.push(a + 1, b + 1, c2 + 1, b + 1, e + 1, c2 + 1);          // back (z-), flipped winding
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex([...idxF, ...idxB]); g.computeVertexNormals();
    return { g, W, H };
  }

  // A real .glb model (assets/models/p<id>.glb) beats the photo-based body whenever it exists.
  const glbCache = new Map();
  async function loadGlb(url) {
    if (!T.GLTFLoader) return null;
    if (!glbCache.has(url)) glbCache.set(url, (async () => {
      try { const head = await fetch(url, { method: "HEAD" }); if (!head.ok) return null; } catch { return null; }
      return new Promise(ok => new T.GLTFLoader().load(url, g => ok(g.scene), undefined, () => ok(null)));
    })());
    return glbCache.get(url);
  }

  // Resolves true when the product is on screen as a 3D body, false if anything failed.
  async function show(url, opts = {}) {
    if (!renderer) return false;
    const mine = ++token;
    const real = opts.glb ? await loadGlb(opts.glb) : null;
    if (mine !== token) return true;
    if (real) {
      const model = real.clone(true), box = new T.Box3().setFromObject(model), c = box.getCenter(new T.Vector3()), z = box.getSize(new T.Vector3());
      model.position.sub(c);
      const wrap = new T.Group(); wrap.add(model);
      wrap.scale.setScalar(Math.min(6.0 / Math.hypot(z.x, z.z), 4.4 / z.y));
      if (current) holder.remove(current);
      holder.add(wrap); current = wrap; st.base = -.35; st.v = 0; st.spin = 0; st.enter = 0; start();
      return true;
    }
    let img; try { img = await loadImage(url); } catch { return false; }
    if (mine !== token) return true;
    try {
      const { g, W, H } = buildBody(img, opts.depth ?? .15);
      const tex = new T.Texture(img); tex.needsUpdate = true; tex.encoding = T.sRGBEncoding; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
      const mat = new T.MeshStandardMaterial({ map: tex, alphaTest: .02, alphaToCoverage: true, roughness: .7, metalness: 0, side: T.DoubleSide,
        emissive: new T.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: .2 });   // keeps the photo's own look
      const mesh = new T.Mesh(g, mat);
      const wrap = new T.Group(); wrap.add(mesh);
      wrap.scale.setScalar(Math.min(6.2 / W, 4.6 / H));                   // fill the stage without clipping
      if (current) { holder.remove(current); current.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { o.material.map && o.material.map.dispose(); o.material.dispose(); } }); }
      holder.add(wrap); current = wrap;
      st.base = -.35; st.v = 0; st.spin = 0; st.enter = 0; start();
      return true;
    } catch (err) { console.error("HeroSpin: could not build 3D body", err); return false; }
  }

  return { init, show, debug: () => ({ running, base: +st.base.toFixed(3), v: +st.v.toFixed(4), drag: st.drag, spin: st.spin, enter: st.enter }) };
})();
