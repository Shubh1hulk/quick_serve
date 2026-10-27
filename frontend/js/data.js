// Sample marketplace listings for the storefront demo; replace with API data in production.
const CATEGORIES = ["Electronics", "Fashion", "Home", "Books", "Beauty", "Sports"];

const PRODUCTS = [
  { id: 1,  brand: "boAt", name: "Rockerz 450 Bluetooth Headphones (15 hrs Playback)", category: "Electronics", price: 1499,  mrp: 3990,  rating: 4.2, reviews: 18426, emoji: "🎧", image: "assets/products/p1.jpg" },
  { id: 2,  brand: "Samsung", name: "Galaxy M35 5G (6 GB RAM, 128 GB, Dark Blue)", category: "Electronics", price: 16999, mrp: 24499, rating: 4.3, reviews: 9214, emoji: "📱", image: "assets/products/p2.jpg" },
  { id: 3,  brand: "Lenovo", name: "IdeaPad Slim 3, Core i5 13th Gen (16 GB/512 GB SSD)", category: "Electronics", price: 57990, mrp: 82990, rating: 4.4, reviews: 1836, emoji: "💻", image: "assets/products/p3.jpg" },
  { id: 4,  brand: "Noise", name: "ColorFit Pulse 4 Smartwatch with Bluetooth Calling", category: "Electronics", price: 1799,  mrp: 5999,  rating: 4.1, reviews: 26348, emoji: "⌚", image: "assets/products/p4.jpg" },
  { id: 5,  brand: "Roadster", name: "Men's Solid Pure Cotton T-Shirt (Pack of 3)", category: "Fashion", price: 799, mrp: 1999, rating: 4.1, reviews: 3271, emoji: "👕", image: "assets/products/p5.jpg" },
  { id: 6,  brand: "Campus", name: "Oxyfit Running Shoes for Men", category: "Fashion", price: 1299, mrp: 2499, rating: 4.2, reviews: 11482, emoji: "👟", image: "assets/products/p6.jpg" },
  { id: 7,  brand: "Lavie", name: "Betula Medium Satchel Handbag", category: "Fashion", price: 1399, mrp: 3990, rating: 4.2, reviews: 2167, emoji: "👜", image: "assets/products/p7.jpg" },
  { id: 8,  brand: "Fastrack", name: "UV-Protected Square Sunglasses", category: "Fashion", price: 699, mrp: 1499, rating: 4.1, reviews: 846, emoji: "🕶️", image: "assets/products/p8.jpg" },
  { id: 9,  brand: "Prestige", name: "Omega Deluxe Granite Non-Stick Cookware Set (3 Pcs)", category: "Home", price: 1899, mrp: 3295, rating: 4.3, reviews: 2481, emoji: "🍳", image: "assets/products/p9.jpg" },
  { id: 10, brand: "Wipro", name: "Garnet 6W LED Desk Lamp with Flexible Neck", category: "Home", price: 549, mrp: 1090, rating: 4.1, reviews: 1294, emoji: "💡", image: "assets/products/p10.jpg" },
  { id: 11, brand: "Spaces", name: "Urban King Size Cotton Bedsheet with 2 Pillow Covers", category: "Home", price: 1199, mrp: 2499, rating: 4.2, reviews: 3482, emoji: "🛏️", image: "assets/products/p11.jpg" },
  { id: 12, brand: "Penguin", name: "Atomic Habits: The Life-Changing Million-Copy Bestseller (Paperback)", category: "Books", price: 399, mrp: 799, rating: 4.6, reviews: 28614, emoji: "📘", image: "assets/products/p12.jpg" },
  { id: 13, brand: "HarperCollins", name: "The Alchemist by Paulo Coelho (Paperback)", category: "Books", price: 249, mrp: 399, rating: 4.5, reviews: 17208, emoji: "📖", image: "assets/products/p13.jpg" },
  { id: 14, brand: "BPB Publications", name: "Let Us C by Yashavant Kanetkar (Paperback)", category: "Books", price: 399, mrp: 595, rating: 4.3, reviews: 7412, emoji: "📚", image: "assets/products/p14.jpg" },
  { id: 15, brand: "Mamaearth", name: "Ubtan Face Wash and Moisturizing Cream Combo", category: "Beauty", price: 399, mrp: 548, rating: 4.2, reviews: 5632, emoji: "🧴", image: "assets/products/p15.jpg" },
  { id: 16, brand: "Maybelline New York", name: "Color Sensational Creamy Matte Lipstick (Set of 2)", category: "Beauty", price: 599, mrp: 798, rating: 4.2, reviews: 1974, emoji: "💄", image: "assets/products/p16.jpg" },
  { id: 17, brand: "Boldfit", name: "Yoga Mat, 6 mm with Carrying Strap", category: "Sports", price: 699, mrp: 1499, rating: 4.3, reviews: 6948, emoji: "🧘", image: "assets/products/p17.jpg" },
  { id: 18, brand: "SG", name: "Cobra Kashmir Willow Cricket Bat, Short Handle", category: "Sports", price: 1499, mrp: 2499, rating: 4.1, reviews: 512, emoji: "🏏", image: "assets/products/p18.jpg" },
  { id: 19, brand: "Nivia", name: "Storm Football, Size 5", category: "Sports", price: 599, mrp: 999, rating: 4.3, reviews: 2473, emoji: "⚽", image: "assets/products/p19.jpg" },
  { id: 20, brand: "Kore", name: "PVC Adjustable Dumbbell Set, 20 kg", category: "Sports", price: 1999, mrp: 3499, rating: 4.2, reviews: 1587, emoji: "🏋️", image: "assets/products/p20.jpg" }
];

// Flipkart-style details (specs, offers) merged into PRODUCTS by id.
const EXTRA = {
  1:  { specs: ["15 hrs Playback", "Bluetooth 5.0 | Dual Pairing", "40 mm Dynamic Drivers"], offer: "Bank Offer: 5% cashback on Axis Bank Card" },
  2:  { specs: ["6 GB RAM | 128 GB ROM", "16.51 cm (6.5 inch) FHD+ sAMOLED", "50MP + 8MP + 2MP | 6000 mAh"] },
  3:  { specs: ["Intel Core i5 13th Gen | 16 GB RAM", "512 GB SSD | Windows 11 Home", "15.6 inch Full HD Display"] },
  4:  { specs: ["1.96 inch AMOLED Display", "Bluetooth Calling", "Up to 7 Days Battery Life"], offer: "Bank Offer: 10% off on HDFC Bank Credit Cards" },
  5:  { specs: ["Pack of 3", "Pure Cotton | Regular Fit", "Round Neck | Half Sleeve"], offer: "Buy 2 or more, extra 5% off" },
  6:  { specs: ["Mesh Upper | Lightweight", "EVA Cushioned Sole", "Lace-up | Running"] },
  7:  { specs: ["Satchel | Medium", "Zip Closure | 2 Compartments", "Faux Leather"] },
  8:  { specs: ["100% UV Protection", "Square Frame | Full Rim", "Polycarbonate Lens"] },
  9:  { specs: ["3 Pieces: Kadai, Tawa, Fry Pan", "Granite Non-Stick Coating", "Gas Stove Compatible"] },
  10: { specs: ["6 W LED | Flexible Neck", "Touch Dimmer | 3 Modes", "Energy Saving"] },
  11: { specs: ["King Size | 2 Pillow Covers", "100% Cotton | 144 Thread Count", "Machine Washable"] },
  12: { specs: ["Paperback | English", "Author: James Clear", "320 Pages"] },
  13: { specs: ["Paperback | English", "Author: Paulo Coelho", "208 Pages"] },
  14: { specs: ["Paperback | English", "Author: Yashavant Kanetkar", "Ideal for BCA / B.Tech students"] },
  15: { specs: ["Face Wash + Moisturizing Cream", "With Turmeric & Saffron", "For All Skin Types"] },
  16: { specs: ["Set of 2 Lipsticks", "Creamy Matte Finish", "Long-lasting Colour"] },
  17: { specs: ["6 mm Thick | Anti-Skid", "Carrying Strap Included", "Eco-friendly NBR Material"] },
  18: { specs: ["Kashmir Willow", "Short Handle", "For Leather Ball"] },
  19: { specs: ["Size 5 | Machine Stitched", "Rubberized PVC Cover", "For Training & Matches"] },
  20: { specs: ["Total Weight: 20 kg", "Adjustable PVC Plates", "2 Dumbbell Rods Included"] }
};
PRODUCTS.forEach(p => {
  const e = EXTRA[p.id] || {};
  p.specs = e.specs || [];
  p.assured = p.reviews >= 2000;                       // "Assured" badge for well-reviewed items
  p.delivery = p.price >= 499 ? "Free delivery" : "₹40 delivery";
  p.offer = e.offer || (p.price >= 10000
    ? `No cost EMI from ₹${Math.round(p.price / 6).toLocaleString("en-IN")}/month`
    : "Bank Offer: 5% cashback on Axis Bank Card");
});

// Transparent cutouts (background removed) - books are flat covers, so they keep their photo
PRODUCTS.forEach(p => { if (![12, 13, 14].includes(p.id)) p.cut = `assets/products/c${p.id}.png`; });

// High-resolution cutouts (about 2000px) for the big hero product, so it stays sharp when enlarged
PRODUCTS.forEach(p => { if ([1, 2, 4, 6, 8].includes(p.id)) p.hd = `assets/products/h${p.id}.png`; });

function productImage(product, className = "card-img") {
  if (!product.image) return `<div class="${className}"><span class="image-fallback">${product.emoji}</span></div>`;
  const src = product.cut || product.image;
  return `<div class="${className}${product.cut ? " cut" : ""}">
    <img src="${src}" alt="${product.name}" loading="lazy" onerror="if(this.src.indexOf('${product.image}')<0){this.src='${product.image}'}else{this.hidden=true;this.nextElementSibling.hidden=false}">
    <span class="image-fallback" hidden>${product.emoji}</span>
  </div>`;
}

// ---- Helpers for deriving real-looking home page content from PRODUCTS ----
const pctOff = (p) => Math.round((1 - p.price / p.mrp) * 100);
const byId = (id) => PRODUCTS.find(p => p.id === id);
const shortName = (p) => p.name.split(/ \(| with |, /)[0];

// Hero ads: each one is a real product from PRODUCTS (cutout, price, discount, offer all come from it).
const BANNERS = [
  { productId: 1, kicker: "TOP AUDIO DEAL",   tagline: "Silence the world, amplify yourself",
    options: ["Black", "Beige", "Blue"], depth: .22 },
  { productId: 6, kicker: "FASHION FEST",     tagline: "Run lighter. Look sharper.",
    options: ["UK 7", "UK 8", "UK 9", "UK 10"], depth: .15 },
  { productId: 2, kicker: "BIG SAVINGS SALE", tagline: "Power that keeps up with you",
    options: ["6GB | 128GB", "8GB | 256GB"], depth: .03 },
  { productId: 8, kicker: "SUMMER STYLE",     tagline: "See the world in style",
    options: ["Black", "Brown"], depth: .11 },
  { productId: 4, kicker: "NEW ARRIVAL",      tagline: "Your health, right on your wrist",
    options: ["42mm", "46mm"], depth: .2 }
].map(b => ({ ...b, category: byId(b.productId).category }));

// Featured products, picked from data: most reviewed, biggest discount, highest rated.
const FEATURED = (() => {
  const used = new Set(), pick = (list, badge) => {
    const p = list.find(x => !used.has(x.id)); used.add(p.id); return { id: p.id, badge };
  };
  return [
    pick([...PRODUCTS].sort((a, b) => b.reviews - a.reviews), "BEST SELLER"),
    pick([...PRODUCTS].sort((a, b) => pctOff(b) - pctOff(a)), "TOP DEAL"),
    pick([...PRODUCTS].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews), "TOP RATED")
  ];
})();

// Shop By Category cards: tagline is hand-written, offer line + photo come from the products.
const CATEGORY_INFO = {
  Electronics: { desc: "Mobiles, laptops, audio & smartwatches" },
  Fashion:     { desc: "Footwear, bags, eyewear & clothing" },
  Home:        { desc: "Kitchen, lighting & bedding essentials" },
  Books:       { desc: "Bestsellers & engineering textbooks" },
  Beauty:      { desc: "Skincare & makeup from top brands" },
  Sports:      { desc: "Fitness gear, cricket & football" }
};
Object.entries(CATEGORY_INFO).forEach(([cat, info]) => {
  const items = PRODUCTS.filter(p => p.category === cat);
  info.count = items.length;
  info.minOff = Math.min(...items.map(pctOff));
  info.cover = items.reduce((a, b) => (b.reviews > a.reviews ? b : a));
});
