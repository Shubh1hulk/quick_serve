// Cart + wishlist state, saved in localStorage.
const Store = (() => {
  const load = (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  };
  const save = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  };

  let cart = load("cart");       // [{id, qty}]
  let wishlist = load("wishlist"); // [id]

  return {
    get cart() { return cart; },
    get wishlist() { return wishlist; },

    addToCart(id) {
      const item = cart.find(i => i.id === id);
      item ? item.qty++ : cart.push({ id, qty: 1 });
      save("cart", cart);
    },
    changeQty(id, delta) {
      const item = cart.find(i => i.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
      save("cart", cart);
    },
    removeFromCart(id) {
      cart = cart.filter(i => i.id !== id);
      save("cart", cart);
    },
    clearCart() { cart = []; save("cart", cart); },

    toggleWish(id) {
      wishlist = wishlist.includes(id) ? wishlist.filter(w => w !== id) : [...wishlist, id];
      save("wishlist", wishlist);
      return wishlist.includes(id);
    },
    inWish(id) { return wishlist.includes(id); }
  };
})();
