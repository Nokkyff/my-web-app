// =============================================
//  vpsgiare — Game & Store Engine (VPS & Game Services)
// =============================================

(function () {
  "use strict";

  const STORAGE_KEYS = {
    theme: "vpsgiare_theme",
    products: "vpsgiare_products",
    prices: "vpsgiare_prices",
    gameState: "vpsgiare_gamestate",
  };

  // ---- DATA: Default VPS & Game Services (NO FOOD) ----
  const DEFAULT_CATALOG = [
    { id: "vps-basic",      emoji: "🖥️", name: "VPS Cloud Basic (1C/2GB)",      category: "VPS Cloud",        cost: 65000,   suggested: 100000, desc: "1 Core, 2GB RAM, 20GB NVMe, IPv4 riêng, 100Mbps" },
    { id: "vps-pro",        emoji: "⚡", name: "VPS Cloud Pro (2C/4GB)",        category: "VPS Cloud",        cost: 130000,  suggested: 190000, desc: "2 Core, 4GB RAM, 50GB NVMe, Auto Backup" },
    { id: "vps-turbo",      emoji: "🚀", name: "VPS NVMe Turbo (4C/8GB)",       category: "VPS Cloud",        cost: 260000,  suggested: 380000, desc: "4 Core, 8GB RAM, 100GB NVMe Gen4, 1Gbps Port" },
    { id: "vps-antiddos",   emoji: "🛡️", name: "VPS Game Anti-DDoS (4C/8GB)",   category: "VPS Game Anti-DDoS",cost: 320000, suggested: 490000, desc: "Lọc Anti-DDoS Game Layer 4 & Layer 7 chuyên dụng" },
    { id: "vps-dedicated",  emoji: "🏢", name: "VPS Dedicated Core (8C/16GB)",  category: "VPS Dedicated",    cost: 600000,  suggested: 890000, desc: "8 Core riêng biệt, 16GB RAM ECC, 200GB NVMe" },
    { id: "proxy-ipv4",     emoji: "🌐", name: "Proxy IPv4 Game Private",       category: "Proxy & Network",  cost: 25000,   suggested: 45000,  desc: "IP tĩnh Việt Nam/Quốc tế sạch, Ping < 20ms" },
    { id: "socks5-rotate",  emoji: "🔄", name: "Proxy SOCKS5 Dân Cư Xoay IP",   category: "Proxy & Network",  cost: 40000,   suggested: 70000,  desc: "SOCKS5 dân cư sạch, hỗ trợ tool game MMO" },
    { id: "mc-server",      emoji: "⛏️", name: "Server Minecraft 4GB",         category: "Game Hosting",     cost: 80000,   suggested: 130000, desc: "Purpur/Paper, Panel Pterodactyl dễ cấu hình" },
    { id: "palworld-server",emoji: "🐾", name: "Server Palworld / Rust 8GB",   category: "Game Hosting",     cost: 180000,  suggested: 270000, desc: "RAM 8GB mượt mà 32 người chơi, hỗ trợ Mod" },
    { id: "discord-bot",    emoji: "🤖", name: "Hosting Discord Bot 24/7",      category: "Bot Discord & NodeJS",cost: 30000,suggested: 50000,  desc: "Treo bot Discord, Telegram NodeJS/Python 24/7" },
    { id: "steam-key-vip",  emoji: "🎮", name: "Steam Key Random VIP AAA",      category: "Game Keys & Bản Quyền",cost: 45000,suggested: 80000, desc: "Key kích hoạt game Steam bản quyền chính hãng" },
    { id: "game-topup",     emoji: "💎", name: "Nạp Game / Steam Wallet 100k", category: "Dịch Vụ Game & Nạp Tiền",cost: 85000,suggested: 100000, desc: "Chiết khấu đại lý cực cao, nhận hàng 1 phút" },
  ];

  // Helper to get active catalog including published products from Admin
  function getFullCatalog() {
    let customProds = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.products);
      if (stored) customProds = JSON.parse(stored);
    } catch (e) {}

    const catalog = [...DEFAULT_CATALOG];

    customProds.forEach(p => {
      // Only include if published !== false
      if (p.published !== false && !catalog.some(x => x.id === p.id)) {
        catalog.push({
          id: p.id,
          name: p.name,
          category: p.category || "VPS Cloud",
          cost: p.cost,
          suggested: p.suggested || p.sell,
          emoji: p.emoji || "⚡",
          image: p.image || null,
          desc: p.desc || "",
          isCustom: true,
        });
      }
    });

    return catalog;
  }

  // ---- DATA: Upgrades (Tailored for VPS & Game Services) ----
  const UPGRADE_DEFS = [
    {
      id: "shelves",
      icon: "🗄️",
      name: "Tủ Rack & Server Slots",
      desc: "Nâng cấp hạ tầng Datacenter để chứa được nhiều máy chủ hơn.",
      levels: [
        { cost: 500000,   effect: "16 slots" },
        { cost: 1500000,  effect: "24 slots" },
        { cost: 4000000,  effect: "36 slots" },
        { cost: 10000000, effect: "50 slots" },
      ],
      apply(level) { return [10, 16, 24, 36, 50][level]; }
    },
    {
      id: "sign",
      icon: "📢",
      name: "Chiến Dịch Quảng Cáo Game",
      desc: "Chạy Ads Facebook / Discord / Youtube để kéo thêm game thủ.",
      levels: [
        { cost: 300000,  effect: "+3 khách mỗi ngày" },
        { cost: 800000,  effect: "+6 khách mỗi ngày" },
        { cost: 2000000, effect: "+10 khách mỗi ngày" },
        { cost: 5000000, effect: "+15 khách mỗi ngày" },
      ],
      apply(level) { return [0, 3, 6, 10, 15][level]; }
    },
    {
      id: "decor",
      icon: "⚡",
      name: "Cam Kết Uptime 99.99% & Hỗ Trợ 24/7",
      desc: "Dịch vụ chất lượng cao giúp khách hàng vui vẻ chi trả mức giá cao hơn.",
      levels: [
        { cost: 400000,  effect: "+15% giá trị sẵn lòng trả" },
        { cost: 1200000, effect: "+30% giá trị sẵn lòng trả" },
        { cost: 3000000, effect: "+50% giá trị sẵn lòng trả" },
      ],
      apply(level) { return [0, 0.15, 0.30, 0.50][level]; }
    },
    {
      id: "bulk",
      icon: "🏢",
      name: "Hợp Đồng Chiết Khấu Datacenter",
      desc: "Ký hợp đồng lưu lượng lớn để giảm giá nhập sỉ VPS và phần cứng.",
      levels: [
        { cost: 500000,  effect: "Giảm 5% giá vốn" },
        { cost: 1500000, effect: "Giảm 10% giá vốn" },
        { cost: 3500000, effect: "Giảm 15% giá vốn" },
      ],
      apply(level) { return [0, 0.05, 0.10, 0.15][level]; }
    },
  ];

  // ---- DATA: Customers (Gamers, Developers, Server Owners) ----
  const CUSTOMER_TYPES = [
    { emoji: "🧑‍💻", name: "Coder Nam",        budget: "high",   patience: "medium", need: "VPS chạy bot & web cá nhân" },
    { emoji: "🎮", name: "Gamer Duy",        budget: "medium", patience: "high",   need: "Proxy sạch ping thấp bắn game" },
    { emoji: "👑", name: "Admin Quốc Bảo",   budget: "high",   patience: "low",    need: "Server Minecraft 30 slot cho server cộng đồng" },
    { emoji: "🛡️", name: "Clan Leader Tuấn", budget: "high",   patience: "medium", need: "VPS Anti-DDoS máy chủ game Palworld" },
    { emoji: "🌾", name: "MMO Farmer Đức",   budget: "medium", patience: "high",   need: "Proxy SOCKS5 xoay IP nuôi tài khoản" },
    { emoji: "🎬", name: "Streamer Thảo",    budget: "high",   patience: "low",    need: "Gói nạp Steam Wallet chiết khấu cao" },
    { emoji: "👦", name: "Học Sinh Khang",   budget: "low",    patience: "high",   need: "Key Steam Random săn game hay" },
    { emoji: "🤖", name: "Dev Tuấn Anh",     budget: "medium", patience: "medium", need: "VPS Cloud cơ bản thử nghiệm project" },
  ];

  // ---- THEME MANAGEMENT -----------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);

    const btn = $("#btn-theme-toggle");
    if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";

    const sel = $("#storefront-theme-select");
    if (sel) sel.value = theme;
  }

  const activeTheme = localStorage.getItem(STORAGE_KEYS.theme) || "dark";
  applyTheme(activeTheme);

  const themeToggleBtn = $("#btn-theme-toggle");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      const next = cur === "light" ? "dark" : "light";
      applyTheme(next);
      toast(`🎨 Đã chuyển sang giao diện ${next === "light" ? "Sáng (Light)" : "Tối (Dark)"}`);
    });
  }

  const saveThemeBtn = $("#btn-storefront-save-theme");
  if (saveThemeBtn) {
    saveThemeBtn.addEventListener("click", () => {
      const sel = $("#storefront-theme-select");
      if (sel) {
        applyTheme(sel.value);
        toast(`✅ Đã lưu giao diện ${sel.value === "light" ? "Sáng" : "Tối"}!`);
      }
    });
  }

  // ---- GAME STATE ----------------------------
  let state = {
    money: 2000000,     // 2.000.000 ₫ starting cash
    day: 1,
    reputation: 50,     // 0–100
    level: 1,
    inventory: [],       // { itemId, qty, sellPrice }
    upgrades: { shelves: 0, sign: 0, decor: 0, bulk: 0 },
    log: [],
    totalEarned: 0,
  };

  // Load saved game state if valid
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.gameState);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.money === "number") {
        state = Object.assign(state, parsed);
        // Ensure upgrades object has all keys
        state.upgrades = Object.assign({ shelves: 0, sign: 0, decor: 0, bulk: 0 }, state.upgrades || {});
      }
    }
  } catch (e) {}

  function saveGameState() {
    try {
      localStorage.setItem(STORAGE_KEYS.gameState, JSON.stringify(state));
    } catch (e) {}
  }

  // ---- HELPERS --------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function formatVND(amount) {
    return (Math.round(amount) || 0).toLocaleString("vi-VN") + " ₫";
  }

  function getMaxShelves() {
    const u = UPGRADE_DEFS.find(x => x.id === "shelves");
    return u.apply(state.upgrades.shelves || 0);
  }

  function getExtraCustomers() {
    const u = UPGRADE_DEFS.find(x => x.id === "sign");
    return u.apply(state.upgrades.sign || 0);
  }

  function getPriceTolerance() {
    const u = UPGRADE_DEFS.find(x => x.id === "decor");
    return u.apply(state.upgrades.decor || 0);
  }

  function getBulkDiscount() {
    const u = UPGRADE_DEFS.find(x => x.id === "bulk");
    return u.apply(state.upgrades.bulk || 0);
  }

  function getUsedShelves() {
    return state.inventory.reduce((s, i) => s + (i.qty || 0), 0);
  }

  function getLevel() {
    if (state.totalEarned >= 50000000) return 5;
    if (state.totalEarned >= 20000000) return 4;
    if (state.totalEarned >= 8000000)  return 3;
    if (state.totalEarned >= 2000000)  return 2;
    return 1;
  }

  function getItemDef(id) {
    const catalog = getFullCatalog();
    return catalog.find(i => i.id === id);
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  function bumpStat(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  // ---- UI UPDATE ------------------------------
  function updateStats() {
    state.level = getLevel();
    $("#stat-money span").textContent = formatVND(state.money);
    $("#stat-day span").textContent = state.day;
    $("#stat-rep span").textContent = state.reputation;
    $("#stat-level span").textContent = state.level;
    $("#shelf-used").textContent = getUsedShelves();
    $("#shelf-max").textContent = getMaxShelves();

    const btn = $("#btn-open-shop");
    const hasStock = state.inventory.some(i => i.qty > 0 && i.sellPrice > 0);
    btn.disabled = !hasStock;
    if (!hasStock) {
      btn.title = "Vui lòng nhập dịch vụ và đặt giá bán trước khi mở cửa!";
    } else {
      btn.title = "Sẵn sàng đón khách hàng!";
    }

    const hint = $("#shop-empty-hint");
    if (state.inventory.length === 0 || !state.inventory.some(i => i.qty > 0)) {
      hint.style.display = "block";
    } else {
      hint.style.display = "none";
    }

    saveGameState();
  }

  // ---- RENDER: Shop Tab -----------------------
  function renderShop() {
    const grid = $("#shop-grid");
    grid.innerHTML = "";

    state.inventory.forEach((inv) => {
      if (inv.qty <= 0) return;
      const def = getItemDef(inv.itemId);
      if (!def) return;

      const card = document.createElement("div");
      card.className = "item-card";

      const discount = getBulkDiscount();
      const unitCost = Math.round(def.cost * (1 - discount));
      const profit = inv.sellPrice ? Math.round(inv.sellPrice - unitCost) : null;
      const profitClass = profit !== null && profit >= 0 ? "" : "loss";

      const mediaHtml = def.image
        ? `<img src="${def.image}" class="item-card-img" alt="${def.name}">`
        : `<span class="emoji">${def.emoji}</span>`;

      card.innerHTML = `
        <span class="qty-badge">×${inv.qty}</span>
        ${mediaHtml}
        <div class="name">${def.name}</div>
        <div class="category">${def.category}</div>
        <div class="price-row">
          <span class="cost">Vốn: ${formatVND(unitCost)}</span>
          <span class="sell-price">${inv.sellPrice ? `Bán: ${formatVND(inv.sellPrice)}` : "Chưa đặt giá"}</span>
        </div>
        ${profit !== null ? `<div class="profit-hint ${profitClass}">Lợi nhuận/máy chủ: +${formatVND(profit)}</div>` : '<div class="profit-hint loss">⚠ Hãy đặt giá bán!</div>'}
        <div class="btn-row">
          <button class="btn-price btn-small" data-item="${inv.itemId}">💲 Đặt Giá Bán</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".btn-price").forEach(btn => {
      btn.addEventListener("click", () => openPriceModal(btn.dataset.item));
    });

    updateStats();
  }

  // ---- RENDER: Wholesale Tab ------------------
  function renderWholesale() {
    const grid = $("#wholesale-grid");
    grid.innerHTML = "";

    const catalog = getFullCatalog();

    // Unlock items based on tier/cost or custom
    const unlocked = catalog.filter(item => {
      if (item.isCustom) return true;
      if (item.cost <= 100000) return true;
      if (item.cost <= 200000 && state.level >= 2) return true;
      if (item.cost <= 400000 && state.level >= 3) return true;
      if (state.level >= 4) return true;
      return false;
    });

    unlocked.forEach(item => {
      const discount = getBulkDiscount();
      const actualCost = Math.round(item.cost * (1 - discount));
      const card = document.createElement("div");
      card.className = "item-card";

      const existing = state.inventory.find(i => i.itemId === item.id);
      const ownedQty = existing ? existing.qty : 0;

      const mediaHtml = item.image
        ? `<img src="${item.image}" class="item-card-img" alt="${item.name}">`
        : `<span class="emoji">${item.emoji}</span>`;

      card.innerHTML = `
        ${mediaHtml}
        <div class="name">${item.name}</div>
        <div class="category">${item.category}</div>
        <div class="price-row">
          <span class="cost">${formatVND(actualCost)}${discount > 0 ? ` <s style="color:var(--text-dim);font-size:0.75rem">${formatVND(item.cost)}</s>` : ""}</span>
        </div>
        <div class="qty" style="font-size:0.8rem;color:var(--text-dim);margin-bottom:6px;">${item.desc || ""}</div>
        <div class="qty">Giá bán đề xuất: ${formatVND(item.suggested)} · Đang có: <strong>${ownedQty}</strong></div>
        <div class="btn-row">
          <button class="btn-buy" data-item="${item.id}" data-qty="1">Nhập 1</button>
          <button class="btn-buy" data-item="${item.id}" data-qty="5">Nhập 5</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".btn-buy").forEach(btn => {
      btn.addEventListener("click", () => {
        const itemId = btn.dataset.item;
        const qty = parseInt(btn.dataset.qty);
        buyItem(itemId, qty);
      });
    });
  }

  // ---- RENDER: Upgrades Tab -------------------
  function renderUpgrades() {
    const grid = $("#upgrades-grid");
    grid.innerHTML = "";

    UPGRADE_DEFS.forEach(upgDef => {
      const currentLvl = state.upgrades[upgDef.id] || 0;
      const isMaxed = currentLvl >= upgDef.levels.length;
      const nextLevel = isMaxed ? null : upgDef.levels[currentLvl];

      const card = document.createElement("div");
      card.className = `upgrade-card${isMaxed ? " maxed" : ""}`;

      card.innerHTML = `
        <div class="upgrade-icon">${upgDef.icon}</div>
        <div class="upgrade-name">${upgDef.name}</div>
        <div class="upgrade-desc">${upgDef.desc}</div>
        <div class="upgrade-level">${isMaxed ? "✅ ĐÃ NÂNG CẤP TỐI ĐA" : `Cấp ${currentLvl} → ${currentLvl + 1}: ${nextLevel.effect}`}</div>
        ${isMaxed ? "" : `<div class="upgrade-cost">Chi phí: ${formatVND(nextLevel.cost)}</div>`}
        ${isMaxed ? "" : `<button class="btn-primary btn-small" data-upgrade="${upgDef.id}" ${state.money < nextLevel.cost ? "disabled" : ""}>Nâng Cấp</button>`}
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("[data-upgrade]").forEach(btn => {
      btn.addEventListener("click", () => purchaseUpgrade(btn.dataset.upgrade));
    });
  }

  // ---- RENDER: Log Tab -------------------------
  function renderLog() {
    const container = $("#log-entries");
    container.innerHTML = "";

    if (state.log.length === 0) {
      container.innerHTML = '<p class="hint">Chưa có nhật ký bán hàng. Hãy mở cửa shop để bắt đầu!</p>';
      return;
    }

    [...state.log].reverse().forEach(entry => {
      const div = document.createElement("div");
      div.className = "log-day";
      const profitClass = entry.profit >= 0 ? "log-profit" : "log-loss";
      div.innerHTML = `
        <h4>📅 Ngày ${entry.day}</h4>
        <p>👥 Khách hàng ghé thăm: ${entry.customers} · 📦 Máy chủ/dịch vụ đã bán: ${entry.itemsSold}</p>
        <p>💵 Doanh thu: ${formatVND(entry.revenue)} · <span class="${profitClass}">Lợi nhuận ròng: ${formatVND(entry.profit)}</span></p>
        <p>⭐ Uy tín: ${entry.repChange >= 0 ? "+" : ""}${entry.repChange}</p>
      `;
      container.appendChild(div);
    });
  }

  // ---- ACTIONS: Buy Item ----------------------
  function buyItem(itemId, qty) {
    const def = getItemDef(itemId);
    if (!def) return;

    const discount = getBulkDiscount();
    const unitCost = Math.round(def.cost * (1 - discount));
    const totalCost = unitCost * qty;

    if (state.money < totalCost) {
      toast(`❌ Không đủ tiền! Cần ${formatVND(totalCost)}`);
      return;
    }

    if (getUsedShelves() + qty > getMaxShelves()) {
      toast(`❌ Hết slot máy chủ! (${getUsedShelves()}/${getMaxShelves()}) Hãy nâng cấp Tủ Rack.`);
      return;
    }

    state.money -= totalCost;

    let existing = state.inventory.find(i => i.itemId === itemId);
    if (existing) {
      existing.qty += qty;
    } else {
      state.inventory.push({ itemId, qty, sellPrice: def.suggested });
    }

    toast(`✅ Đã nhập ${qty}× ${def.name} (-${formatVND(totalCost)})`);
    bumpStat("#stat-money");
    updateStats();
    renderWholesale();
    renderShop();
  }

  // ---- ACTIONS: Purchase Upgrade ---------------
  function purchaseUpgrade(upgradeId) {
    const upgDef = UPGRADE_DEFS.find(u => u.id === upgradeId);
    const currentLvl = state.upgrades[upgradeId] || 0;
    if (currentLvl >= upgDef.levels.length) return;

    const cost = upgDef.levels[currentLvl].cost;
    if (state.money < cost) {
      toast("❌ Không đủ số dư ví để nâng cấp!");
      return;
    }

    state.money -= cost;
    state.upgrades[upgradeId] = currentLvl + 1;

    toast(`✅ Đã nâng cấp ${upgDef.name} lên cấp ${state.upgrades[upgradeId]}!`);
    bumpStat("#stat-money");
    updateStats();
    renderUpgrades();
    renderShop();
  }

  // ---- PRICE MODAL ----------------------------
  let pricingItemId = null;

  function openPriceModal(itemId) {
    pricingItemId = itemId;
    const def = getItemDef(itemId);
    const inv = state.inventory.find(i => i.itemId === itemId);

    const mediaHtml = def.image
      ? `<img src="${def.image}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px;">`
      : def.emoji + " ";

    $("#price-modal-item").innerHTML = `${mediaHtml}<strong>${def.name}</strong>`;
    $("#hint-cost-val").textContent = formatVND(Math.round(def.cost * (1 - getBulkDiscount())));
    $("#hint-suggested-val").textContent = formatVND(def.suggested);
    $("#price-input").value = inv.sellPrice || def.suggested;
    $("#price-modal").classList.remove("hidden");
    $("#price-input").focus();
  }

  $("#btn-set-price").addEventListener("click", () => {
    const price = parseFloat($("#price-input").value);
    if (isNaN(price) || price <= 0) {
      toast("❌ Vui lòng nhập giá bán hợp lệ!");
      return;
    }
    const inv = state.inventory.find(i => i.itemId === pricingItemId);
    inv.sellPrice = Math.round(price);
    $("#price-modal").classList.add("hidden");
    toast(`💲 Đã cập nhật giá bán "${getItemDef(pricingItemId).name}" thành ${formatVND(inv.sellPrice)}`);
    renderShop();
  });

  $("#btn-cancel-price").addEventListener("click", () => {
    $("#price-modal").classList.add("hidden");
  });

  $("#price-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#btn-set-price").click();
  });

  // ---- SELLING SIMULATION ---------------------
  function startSellingDay() {
    const overlay = $("#selling-overlay");
    overlay.classList.remove("hidden");
    $("#selling-feed").innerHTML = "";
    $("#selling-summary").classList.add("hidden");
    $("#customer-sprite").textContent = "";
    $("#customer-sprite").className = "";
    $("#customer-bubble").classList.add("hidden");

    const baseCustomers = 3 + Math.floor(state.reputation / 15);
    const extraCustomers = getExtraCustomers();
    const totalCustomers = baseCustomers + extraCustomers + Math.floor(Math.random() * 3);

    simulateCustomers(totalCustomers);
  }

  async function simulateCustomers(count) {
    let dayRevenue = 0;
    let dayCost = 0;
    let itemsSold = 0;
    let repChange = 0;

    for (let i = 0; i < count; i++) {
      const cust = CUSTOMER_TYPES[Math.floor(Math.random() * CUSTOMER_TYPES.length)];

      const sprite = $("#customer-sprite");
      const bubble = $("#customer-bubble");
      sprite.textContent = cust.emoji;
      sprite.className = "enter";
      bubble.classList.add("hidden");

      await sleep(500);

      const availableItems = state.inventory.filter(inv => inv.qty > 0 && inv.sellPrice > 0);
      if (availableItems.length === 0) {
        bubble.textContent = "Hết dịch vụ rồi à? Đi chỗ khác vậy!";
        bubble.classList.remove("hidden");
        addFeedEntry(`${cust.emoji} ${cust.name}: "Hết hàng rồi, thất vọng quá!" 😤`, "no-sale");
        repChange -= 2;
        await sleep(1000);
        sprite.className = "leave";
        await sleep(500);
        continue;
      }

      const wanted = availableItems[Math.floor(Math.random() * availableItems.length)];
      const def = getItemDef(wanted.itemId);

      let budgetMult = 1.0;
      if (cust.budget === "low") budgetMult = 0.85;
      if (cust.budget === "high") budgetMult = 1.4;

      const tolerance = getPriceTolerance();
      const maxPrice = def.suggested * budgetMult * (1 + tolerance);

      bubble.textContent = `Gói ${def.name} giá bao nhiêu vậy shop?`;
      bubble.classList.remove("hidden");
      await sleep(800);

      if (wanted.sellPrice <= maxPrice) {
        wanted.qty--;
        const revenue = wanted.sellPrice;
        const cost = Math.round(def.cost * (1 - getBulkDiscount()));
        dayRevenue += revenue;
        dayCost += cost;
        itemsSold++;

        if (wanted.sellPrice <= def.suggested * 1.1) {
          repChange += 1;
        }

        const margin = Math.round(((revenue - cost) / cost) * 100);
        bubble.textContent = `Giá rất hợp lý! Mình thanh toán luôn nhé! 😊`;
        addFeedEntry(
          `${cust.emoji} ${cust.name} đã mua ${def.name} với giá ${formatVND(revenue)} (lãi: +${margin}%)`,
          "sale"
        );

        bumpStat("#stat-money");
        state.money += revenue;
        updateStats();

      } else {
        const overprice = Math.round(((wanted.sellPrice / maxPrice) - 1) * 100);
        bubble.textContent = `${formatVND(wanted.sellPrice)} đắt quá! Không kham nổi! 😠`;
        addFeedEntry(
          `${cust.emoji} ${cust.name} từ chối mua ${def.name} (${overprice}% cao hơn ngân sách)`,
          "no-sale"
        );
        repChange -= 1;
      }

      await sleep(1000);
      sprite.className = "leave";
      await sleep(400);
    }

    const profit = dayRevenue - dayCost;
    state.totalEarned += Math.max(0, profit);
    state.reputation = Math.max(0, Math.min(100, state.reputation + repChange));
    state.inventory = state.inventory.filter(i => i.qty > 0);

    state.log.push({
      day: state.day,
      customers: count,
      itemsSold,
      revenue: dayRevenue,
      profit,
      repChange,
    });

    showDaySummary(count, itemsSold, dayRevenue, dayCost, profit, repChange);
  }

  function showDaySummary(customers, itemsSold, revenue, cost, profit, repChange) {
    const summary = $("#selling-summary");
    const content = $("#summary-content");

    content.innerHTML = `
      <div class="summary-row"><span>👥 Khách ghé thăm</span><span>${customers} game thủ</span></div>
      <div class="summary-row"><span>📦 Máy chủ / Gói đã bán</span><span>${itemsSold} gói</span></div>
      <div class="summary-row"><span>💵 Doanh thu ngày</span><span class="positive">${formatVND(revenue)}</span></div>
      <div class="summary-row"><span>📉 Giá vốn dịch vụ</span><span class="negative">-${formatVND(cost)}</span></div>
      <div class="summary-row total"><span>💰 Lợi nhuận ròng</span><span class="${profit >= 0 ? 'positive' : 'negative'}">${formatVND(profit)}</span></div>
      <div class="summary-row"><span>⭐ Điểm uy tín shop</span><span>${repChange >= 0 ? "+" : ""}${repChange} (Hiện tại: ${state.reputation}/100)</span></div>
    `;

    summary.classList.remove("hidden");
    addFeedEntry(`📊 Kết thúc Ngày ${state.day}!`, "info");
  }

  function addFeedEntry(text, type) {
    const feed = $("#selling-feed");
    const entry = document.createElement("div");
    entry.className = `feed-entry ${type}`;
    entry.textContent = text;
    feed.appendChild(entry);
    feed.scrollTop = feed.scrollHeight;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---- Close Day Button ----------------------
  $("#btn-close-day").addEventListener("click", () => {
    state.day++;
    $("#selling-overlay").classList.add("hidden");
    updateStats();
    renderShop();
    renderWholesale();
    renderUpgrades();
    renderLog();
  });

  // ---- Open Shop Button ----------------------
  $("#btn-open-shop").addEventListener("click", () => {
    startSellingDay();
  });

  // ---- TAB NAVIGATION -------------------------
  $$(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach(t => t.classList.remove("active"));
      $$(".tab-content").forEach(tc => tc.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      $(`#tab-${target}`).classList.add("active");

      if (target === "shop") renderShop();
      if (target === "wholesale") renderWholesale();
      if (target === "upgrades") renderUpgrades();
      if (target === "log") renderLog();
    });
  });

  // ---- INIT -----------------------------------
  updateStats();
  renderShop();
  renderWholesale();
  renderUpgrades();
  renderLog();

})();
