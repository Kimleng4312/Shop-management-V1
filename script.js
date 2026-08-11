
/* Login / Register */
const DEFAULT_ACCOUNT = { username: "Thina", password: "tlr88889999" };
const ACCOUNTS_KEY = "shop-management-accounts";

function getAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
}

function setupAuthPage() {
  let accounts = getAccounts();
  if (!accounts.some(a => a.username.toLowerCase() === DEFAULT_ACCOUNT.username.toLowerCase())) {
    accounts.unshift(DEFAULT_ACCOUNT);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginMessage = document.getElementById("login-message");
  const registerMessage = document.getElementById("register-message");

  document.querySelectorAll("[data-auth-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      const login = tab.dataset.authTab === "login";
      document.querySelectorAll("[data-auth-tab]").forEach(t => t.classList.toggle("active", t === tab));
      loginForm.style.display = login ? "" : "none";
      registerForm.style.display = login ? "none" : "";
      loginMessage.textContent = "";
      registerMessage.textContent = "";
    });
  });

  loginForm.addEventListener("submit", e => {
    e.preventDefault();
    const username = loginForm.elements.username.value.trim();
    const password = loginForm.elements.password.value;
    const account = getAccounts().find(
      a => a.username.toLowerCase() === username.toLowerCase() && a.password === password
    );

    if (!account) {
      loginMessage.textContent = "Incorrect username or password.";
      loginMessage.className = "auth-message error";
      return;
    }

    document.getElementById("auth-page").style.display = "none";
    document.getElementById("app-shell").style.display = "";
    loadData();
    render();
  });

  registerForm.addEventListener("submit", e => {
    e.preventDefault();
    const username = registerForm.elements.username.value.trim();
    const password = registerForm.elements.password.value;
    const confirm = registerForm.elements.confirmPassword.value;

    if (username.length < 3) {
      registerMessage.textContent = "Username must be at least 3 characters.";
      registerMessage.className = "auth-message error";
      return;
    }
    if (password.length < 6) {
      registerMessage.textContent = "Password must be at least 6 characters.";
      registerMessage.className = "auth-message error";
      return;
    }
    if (password !== confirm) {
      registerMessage.textContent = "Passwords do not match.";
      registerMessage.className = "auth-message error";
      return;
    }

    accounts = getAccounts();
    if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
      registerMessage.textContent = "That username is already registered.";
      registerMessage.className = "auth-message error";
      return;
    }

    accounts.push({ username, password });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    registerMessage.textContent = "Account created. You can now log in.";
    registerMessage.className = "auth-message success";
    registerForm.reset();
  });
}


const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_STYLES = {
  Completed: { bg: "#E4F3E8", fg: "#2F8552" },
  Pending: { bg: "#FCF1DC", fg: "#B8791E" },
  "Partially Sold": { bg: "#E4EEF7", fg: "#3D74A8" },
  Returned: { bg: "#FBE7E4", fg: "#C64B3C" },
};

let inventory = [];
let sales = [];
let view = "overview";
let loaded = false;
let charts = {};
let overviewMode = "month";
let reportsMode = "month";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);

const money = (n) => "$" + Number(n || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const moneyShort = (n) => {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
  return "$" + v.toFixed(0);
};

const monthKey = (d) => d.slice(0, 7);
const yearKey = (d) => d.slice(0, 4);
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return MONTHS[parseInt(m, 10) - 1] + " '" + y.slice(2);
};

function computeSale(s) {
  const revenue = (Number(s.soldOut) || 0) * (Number(s.sellPrice) || 0);
  const cost = (Number(s.soldOut) || 0) * (Number(s.costPrice) || 0);
  return { revenue, cost, profitLoss: revenue - cost };
}

function aggregateByPeriod(salesList, mode) {
  const buckets = {};
  salesList.forEach((s) => {
    const key = mode === "year" ? yearKey(s.date) : monthKey(s.date);
    if (!buckets[key]) buckets[key] = { revenue: 0, profit: 0, loss: 0, orders: 0 };
    const { revenue, profitLoss } = computeSale(s);
    buckets[key].revenue += revenue;
    buckets[key].orders += 1;
    if (profitLoss >= 0) buckets[key].profit += profitLoss;
    else buckets[key].loss += Math.abs(profitLoss);
  });
  return buckets;
}

function seedData() {
  const inv = [
    { id: uid(), product: "Roasted Coffee Beans 1kg", quantity: 34, stockInPrice: 9.5, targetSellingPrice: 18 },
    { id: uid(), product: "Ceramic Mug", quantity: 58, stockInPrice: 3.2, targetSellingPrice: 9 },
    { id: uid(), product: "Cold Brew Bottle 500ml", quantity: 12, stockInPrice: 2.1, targetSellingPrice: 5.5 },
    { id: uid(), product: "Pastry Box (6pc)", quantity: 20, stockInPrice: 6, targetSellingPrice: 14 },
  ];

  const d = new Date();
  const salesList = [];

  for (let i = 0; i < 22; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() - Math.floor(Math.random() * 60));
    const item = inv[Math.floor(Math.random() * inv.length)];
    const soldOut = 1 + Math.floor(Math.random() * 8);

    salesList.push({
      id: uid(),
      product: item.product,
      stockIn: soldOut + Math.floor(Math.random() * 6),
      soldOut,
      sellPrice: item.targetSellingPrice,
      costPrice: item.stockInPrice,
      status: ["Completed","Completed","Pending","Partially Sold"][Math.floor(Math.random()*4)],
      date: day.toISOString().slice(0, 10),
      otherDetail: "",
    });
  }

  return { inv, sales: salesList };
}

function saveData() {
  localStorage.setItem("shop-management-inventory", JSON.stringify(inventory));
  localStorage.setItem("shop-management-sales", JSON.stringify(sales));
}

function loadData() {
  try {
    const savedInv = localStorage.getItem("shop-management-inventory");
    const savedSales = localStorage.getItem("shop-management-sales");

    const seeded = seedData();
    inventory = savedInv ? JSON.parse(savedInv) : seeded.inv;
    sales = savedSales ? JSON.parse(savedSales) : seeded.sales;
  } catch {
    const seeded = seedData();
    inventory = seeded.inv;
    sales = seeded.sales;
  }

  loaded = true;
}

function icon(name, size = 16) {
  return `<i data-lucide="${name}" width="${size}" height="${size}"></i>`;
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function statCard(label, value, sub, iconName, color) {
  return `
    <div class="card">
      <div class="stat-top">
        <span class="stat-label">${label}</span>
        <span class="icon-badge" style="background:${color}22">${icon(iconName, 16)}</span>
      </div>
      <div class="num stat-num">${value}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ""}
    </div>
  `;
}

function pageHead(title, subtitle, right = "") {
  return `
    <div class="pagehead">
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      ${right}
    </div>
  `;
}

function toggleHtml(mode, target) {
  return `
    <div class="toggle">
      <button class="${mode === "month" ? "active" : ""}" data-toggle="${target}" data-mode="month">Monthly</button>
      <button class="${mode === "year" ? "active" : ""}" data-toggle="${target}" data-mode="year">Annually</button>
    </div>
  `;
}

function renderOverview() {
  const now = new Date();
  const currentKey = overviewMode === "year"
    ? String(now.getFullYear())
    : now.toISOString().slice(0, 7);

  const buckets = aggregateByPeriod(sales, overviewMode);
  const current = buckets[currentKey] || { revenue: 0, profit: 0, loss: 0, orders: 0 };

  const keys = Object.keys(buckets).sort();
  const take = overviewMode === "year" ? keys.slice(-5) : keys.slice(-6);
  const chartData = take.map(k => ({
    period: overviewMode === "year" ? k : monthLabel(k),
    Revenue: Math.round(buckets[k].revenue),
    Profit: Math.round(buckets[k].profit - buckets[k].loss)
  }));

  const inventoryRows = inventory.length === 0
    ? `<div class="empty">No inventory yet.</div>`
    : `
      <table>
        <thead><tr><th>Product</th><th>Quantity</th><th>Stock-in price</th><th>Target sell price</th></tr></thead>
        <tbody>
          ${inventory.slice(0, 5).map(i => `
            <tr>
              <td>${escapeHtml(i.product)}</td>
              <td>${i.quantity}${i.quantity <= 5 ? `<span class="badge" style="background:#FBE7E4;color:#C64B3C;margin-left:8px">Low</span>` : ""}</td>
              <td>${money(i.stockInPrice)}</td>
              <td>${money(i.targetSellingPrice)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

  return `
    ${pageHead("Overview", "How your shop is doing right now.", toggleHtml(overviewMode, "overview"))}
    <div class="cards">
      ${statCard("Revenue", money(current.revenue), overviewMode === "year" ? "This year" : "This month", "dollar-sign", "#4A85B8")}
      ${statCard("Profit", money(current.profit), "Positive sales margin", "trending-up", "#4C9A6A")}
      ${statCard("Loss", money(current.loss), "Negative sales margin", "trending-down", "#DD6B5C")}
      ${statCard("Orders", current.orders, overviewMode === "year" ? "This year" : "This month", "shopping-bag", "#DE9F3B")}
    </div>

    <div class="panel">
      <h3>Revenue &amp; profit — ${overviewMode === "year" ? "by year" : "last 6 months"}</h3>
      ${chartData.length === 0
        ? `<div class="empty">No sales recorded yet. Add a sale to see the trend.</div>`
        : `<div class="chart-wrap"><canvas id="overviewChart"></canvas></div>`}
    </div>

    <div class="panel" style="margin-bottom:0">
      <h3>Inventory at a glance</h3>
      ${inventoryRows}
    </div>
  `;
}

function renderSales() {
  const now = new Date();
  const thisMonthKey = now.toISOString().slice(0, 7);
  const monthSales = sales.filter(s => monthKey(s.date) === thisMonthKey);

  const totals = monthSales.reduce((acc, s) => {
    const { revenue, profitLoss } = computeSale(s);
    acc.revenue += revenue;
    if (profitLoss >= 0) acc.profit += profitLoss;
    else acc.loss += Math.abs(profitLoss);
    return acc;
  }, { revenue: 0, profit: 0, loss: 0 });

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayRevenue = sales
      .filter(s => s.date === key)
      .reduce((sum, s) => sum + computeSale(s).revenue, 0);

    last7.push({
      day: DOW[d.getDay()] + " " + (d.getMonth() + 1) + "/" + d.getDate(),
      Revenue: Math.round(dayRevenue)
    });
  }

  const sorted = [...sales].sort((a, b) => a.date < b.date ? 1 : -1);

  const rows = sorted.length === 0
    ? `<div class="empty">No sales yet — click "Add Sales" to log your first one.</div>`
    : `
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>No.</th><th>Product</th><th>Stock-in</th><th>Sold-out</th><th>Profit/Loss</th>
              <th>Status</th><th>Date</th><th>Detail</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((s, idx) => {
              const { profitLoss } = computeSale(s);
              const st = STATUS_STYLES[s.status] || STATUS_STYLES.Pending;
              return `
                <tr>
                  <td>${sorted.length - idx}</td>
                  <td>${escapeHtml(s.product)}</td>
                  <td>${s.stockIn}</td>
                  <td>${s.soldOut}</td>
                  <td class="${profitLoss >= 0 ? "pl-pos" : "pl-neg"}">
                    ${profitLoss >= 0 ? "+" : "-"}${money(Math.abs(profitLoss))}
                  </td>
                  <td><span class="badge" style="background:${st.bg};color:${st.fg}">${escapeHtml(s.status)}</span></td>
                  <td>${escapeHtml(s.date)}</td>
                  <td style="color:#7C8B7E">${escapeHtml(s.otherDetail || "—")}</td>
                  <td><button class="del-btn" data-delete-sale="${s.id}" aria-label="Delete sale">${icon("trash-2",15)}</button></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

  return `
    ${pageHead("Sales", "Track what's moving and what it's earning you.",
      `<button class="btn" id="add-sale-btn">${icon("plus",16)} Add Sales</button>`)}
    <div class="cards">
      ${statCard("Revenue (month)", money(totals.revenue), "", "dollar-sign", "#4A85B8")}
      ${statCard("Profit (month)", money(totals.profit), "", "trending-up", "#4C9A6A")}
      ${statCard("Loss (month)", money(totals.loss), "", "trending-down", "#DD6B5C")}
    </div>

    <div class="panel">
      <h3>Revenue — last 7 days</h3>
      <div class="chart-wrap short"><canvas id="salesChart"></canvas></div>
    </div>

    <div class="panel" style="margin-bottom:0">
      <h3>Sales detail</h3>
      ${rows}
    </div>
  `;
}

function renderInventory() {
  const rows = inventory.length === 0
    ? `<div class="empty">No products yet — click "Add Inventory" to get started.</div>`
    : `
      <table>
        <thead>
          <tr><th>Product</th><th>Quantity</th><th>Stock-in price</th><th>Target selling price</th><th>Est. margin</th><th></th></tr>
        </thead>
        <tbody>
          ${inventory.map(i => {
            const margin = i.targetSellingPrice - i.stockInPrice;
            return `
              <tr>
                <td>${escapeHtml(i.product)}</td>
                <td>${i.quantity}${i.quantity <= 5 ? `<span class="badge" style="background:#FBE7E4;color:#C64B3C;margin-left:8px">Low stock</span>` : ""}</td>
                <td>${money(i.stockInPrice)}</td>
                <td>${money(i.targetSellingPrice)}</td>
                <td class="${margin >= 0 ? "pl-pos" : "pl-neg"}">${money(margin)}</td>
                <td><button class="del-btn" data-delete-inventory="${i.id}" aria-label="Delete inventory">${icon("trash-2",15)}</button></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

  return `
    ${pageHead("Inventory", "What you're holding and what it should sell for.",
      `<button class="btn" id="add-inventory-btn">${icon("plus",16)} Add Inventory</button>`)}
    <div class="panel" style="margin-bottom:0">${rows}</div>
  `;
}

function renderReports() {
  const buckets = aggregateByPeriod(sales, reportsMode);

  const allTotals = sales.reduce((acc, s) => {
    const { revenue, profitLoss } = computeSale(s);
    acc.revenue += revenue;
    if (profitLoss >= 0) acc.profit += profitLoss;
    else acc.loss += Math.abs(profitLoss);
    return acc;
  }, { revenue: 0, profit: 0, loss: 0 });

  const net = allTotals.profit - allTotals.loss;
  const keys = Object.keys(buckets).sort();
  const take = reportsMode === "year" ? keys.slice(-5) : keys.slice(-6);

  const chartData = take.map(k => ({
    period: reportsMode === "year" ? k : monthLabel(k),
    Revenue: Math.round(buckets[k].revenue),
    Profit: Math.round(buckets[k].profit),
    Loss: Math.round(buckets[k].loss),
    Total: Math.round(buckets[k].profit - buckets[k].loss),
    Sales: buckets[k].orders
  }));

  return `
    ${pageHead("Reports", "The full picture, all time.", toggleHtml(reportsMode, "reports"))}
    <div class="cards">
      ${statCard("Total revenue", money(allTotals.revenue), "", "dollar-sign", "#4A85B8")}
      ${statCard("Total profit", money(allTotals.profit), "", "trending-up", "#4C9A6A")}
      ${statCard("Total loss", money(allTotals.loss), "", "trending-down", "#DD6B5C")}
      ${statCard("Total (net)", money(net), "", "wallet", net >= 0 ? "#4C9A6A" : "#DD6B5C")}
    </div>

    <div class="panel" style="margin-bottom:0">
      <h3>Performance — revenue, profit, loss, total &amp; sales</h3>
      ${chartData.length === 0
        ? `<div class="empty">No sales recorded yet.</div>`
        : `<div class="chart-wrap tall"><canvas id="reportsChart"></canvas></div>`}
    </div>
  `;
}

function render() {
  const main = document.getElementById("main-content");
  if (!loaded) {
    main.innerHTML = `<div class="empty">Loading your shop data…</div>`;
    return;
  }

  Object.values(charts).forEach(c => c?.destroy());
  charts = {};

  if (view === "overview") main.innerHTML = renderOverview();
  else if (view === "sales") main.innerHTML = renderSales();
  else if (view === "inventory") main.innerHTML = renderInventory();
  else main.innerHTML = renderReports();

  refreshIcons();
  bindViewEvents();

  if (view === "overview") drawOverviewChart();
  if (view === "sales") drawSalesChart();
  if (view === "reports") drawReportsChart();
}

function drawOverviewChart() {
  const canvas = document.getElementById("overviewChart");
  if (!canvas) return;

  const buckets = aggregateByPeriod(sales, overviewMode);
  const keys = Object.keys(buckets).sort();
  const take = overviewMode === "year" ? keys.slice(-5) : keys.slice(-6);

  charts.overview = new Chart(canvas, {
    type: "bar",
    data: {
      labels: take.map(k => overviewMode === "year" ? k : monthLabel(k)),
      datasets: [
        {
          type: "bar",
          label: "Revenue",
          data: take.map(k => Math.round(buckets[k].revenue)),
          backgroundColor: "#4A85B8",
          borderRadius: 6,
          barThickness: 28
        },
        {
          type: "line",
          label: "Profit",
          data: take.map(k => Math.round(buckets[k].profit - buckets[k].loss)),
          borderColor: "#4C9A6A",
          backgroundColor: "#4C9A6A",
          borderWidth: 2.5,
          pointRadius: 4,
          tension: 0.25
        }
      ]
    },
    options: chartOptions()
  });
}

function drawSalesChart() {
  const canvas = document.getElementById("salesChart");
  if (!canvas) return;

  const now = new Date();
  const last7 = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayRevenue = sales
      .filter(s => s.date === key)
      .reduce((sum, s) => sum + computeSale(s).revenue, 0);

    last7.push({
      day: DOW[d.getDay()] + " " + (d.getMonth()+1) + "/" + d.getDate(),
      Revenue: Math.round(dayRevenue)
    });
  }

  charts.sales = new Chart(canvas, {
    type: "line",
    data: {
      labels: last7.map(x => x.day),
      datasets: [{
        label: "Revenue",
        data: last7.map(x => x.Revenue),
        borderColor: "#4C9A6A",
        backgroundColor: "rgba(76,154,106,.15)",
        borderWidth: 2.5,
        pointRadius: 3,
        fill: true,
        tension: 0.3
      }]
    },
    options: chartOptions()
  });
}

function drawReportsChart() {
  const canvas = document.getElementById("reportsChart");
  if (!canvas) return;

  const buckets = aggregateByPeriod(sales, reportsMode);
  const keys = Object.keys(buckets).sort();
  const take = reportsMode === "year" ? keys.slice(-5) : keys.slice(-6);

  charts.reports = new Chart(canvas, {
    type: "bar",
    data: {
      labels: take.map(k => reportsMode === "year" ? k : monthLabel(k)),
      datasets: [
        {
          type: "bar",
          label: "Sales",
          data: take.map(k => buckets[k].orders),
          yAxisID: "count",
          backgroundColor: "rgba(222,159,59,.55)",
          borderRadius: 6,
          barThickness: 22
        },
        {
          type: "line",
          label: "Revenue",
          data: take.map(k => Math.round(buckets[k].revenue)),
          yAxisID: "money",
          borderColor: "#4A85B8",
          backgroundColor: "#4A85B8",
          borderWidth: 2.2,
          pointRadius: 3,
          tension: 0.25
        },
        {
          type: "line",
          label: "Profit",
          data: take.map(k => Math.round(buckets[k].profit)),
          yAxisID: "money",
          borderColor: "#4C9A6A",
          backgroundColor: "#4C9A6A",
          borderWidth: 2.2,
          pointRadius: 3,
          tension: 0.25
        },
        {
          type: "line",
          label: "Loss",
          data: take.map(k => Math.round(buckets[k].loss)),
          yAxisID: "money",
          borderColor: "#DD6B5C",
          backgroundColor: "#DD6B5C",
          borderWidth: 2.2,
          pointRadius: 3,
          tension: 0.25
        },
        {
          type: "line",
          label: "Total",
          data: take.map(k => Math.round(buckets[k].profit - buckets[k].loss)),
          yAxisID: "money",
          borderColor: "#2B3A2E",
          backgroundColor: "#2B3A2E",
          borderWidth: 2,
          borderDash: [5,3],
          pointRadius: 0,
          tension: 0.25
        }
      ]
    },
    options: {
      ...chartOptions(),
      scales: {
        ...chartOptions().scales,
        money: {
          ...chartOptions().scales.y,
          position: "left"
        },
        count: {
          position: "right",
          beginAtZero: true,
          ticks: { precision: 0, color: "#7C8B7E", font: { size: 12 } },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        labels: {
          font: { size: 12.5 },
          color: "#2B3A2E"
        }
      },
      tooltip: {
        backgroundColor: "#FFFFFF",
        titleColor: "#2B3A2E",
        bodyColor: "#2B3A2E",
        borderColor: "#E1EADC",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.dataset.label === "Sales" ? ctx.raw : money(ctx.raw)}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#7C8B7E", font: { size: 12 } },
        grid: { display: false },
        border: { color: "#E1EADC" }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#7C8B7E",
          font: { size: 12 },
          callback: value => moneyShort(value)
        },
        grid: { color: "#EEF3EC" },
        border: { display: false }
      }
    }
  };
}

function bindViewEvents() {
  document.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.toggle;
      if (target === "overview") overviewMode = btn.dataset.mode;
      if (target === "reports") reportsMode = btn.dataset.mode;
      render();
    });
  });

  const addSaleBtn = document.getElementById("add-sale-btn");
  if (addSaleBtn) addSaleBtn.addEventListener("click", openSaleModal);

  const addInventoryBtn = document.getElementById("add-inventory-btn");
  if (addInventoryBtn) addInventoryBtn.addEventListener("click", openInventoryModal);

  document.querySelectorAll("[data-delete-sale]").forEach(btn => {
    btn.addEventListener("click", () => {
      sales = sales.filter(s => s.id !== btn.dataset.deleteSale);
      saveData();
      render();
    });
  });

  document.querySelectorAll("[data-delete-inventory]").forEach(btn => {
    btn.addEventListener("click", () => {
      inventory = inventory.filter(i => i.id !== btn.dataset.deleteInventory);
      saveData();
      render();
    });
  });
}

function openSaleModal() {
  const root = document.getElementById("modal-root");
  const first = inventory[0];

  root.innerHTML = `
    <div class="modal-overlay" id="sale-overlay">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>Add sale</h2>
        <form id="sale-form">
          <div class="field">
            <label>Product</label>
            ${inventory.length === 0
              ? `<input name="product" placeholder="Product name" required />`
              : `<select name="product" id="sale-product">${inventory.map(i => `<option value="${escapeAttr(i.product)}">${escapeHtml(i.product)}</option>`).join("")}</select>`}
          </div>

          <div class="row-2">
            <div class="field"><label>Stock-in qty</label><input name="stockIn" type="number" min="0" value="${first?.quantity ?? ""}" /></div>
            <div class="field"><label>Sold-out qty</label><input name="soldOut" type="number" min="0" required /></div>
          </div>

          <div class="row-2">
            <div class="field"><label>Sell price / unit</label><input name="sellPrice" type="number" step="0.01" min="0" value="${first?.targetSellingPrice ?? ""}" /></div>
            <div class="field"><label>Cost price / unit</label><input name="costPrice" type="number" step="0.01" min="0" value="${first?.stockInPrice ?? ""}" /></div>
          </div>

          <div class="row-2">
            <div class="field">
              <label>Status</label>
              <select name="status">${Object.keys(STATUS_STYLES).map(s => `<option>${escapeHtml(s)}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Date</label><input name="date" type="date" value="${todayStr()}" /></div>
          </div>

          <div class="field"><label>Other detail</label><textarea name="otherDetail" rows="2" placeholder="Optional note"></textarea></div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancel-sale">Cancel</button>
            <button type="submit" class="btn-primary-full">Save sale</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("sale-overlay");
  overlay.addEventListener("click", closeModal);
  document.getElementById("cancel-sale").addEventListener("click", closeModal);

  const productSelect = document.getElementById("sale-product");
  if (productSelect) {
    productSelect.addEventListener("change", () => {
      const item = inventory.find(i => i.product === productSelect.value);
      if (!item) return;
      const form = document.getElementById("sale-form");
      form.elements.sellPrice.value = item.targetSellingPrice;
      form.elements.costPrice.value = item.stockInPrice;
      form.elements.stockIn.value = item.quantity;
    });
  }

  document.getElementById("sale-form").addEventListener("submit", e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const product = data.get("product");
    const soldOut = data.get("soldOut");

    if (!product || soldOut === "") return;

    sales.unshift({
      id: uid(),
      product,
      stockIn: Number(data.get("stockIn")) || 0,
      soldOut: Number(soldOut) || 0,
      sellPrice: Number(data.get("sellPrice")) || 0,
      costPrice: Number(data.get("costPrice")) || 0,
      status: data.get("status"),
      date: data.get("date"),
      otherDetail: data.get("otherDetail") || ""
    });

    inventory = inventory.map(it => it.product === product
      ? { ...it, quantity: Math.max(0, it.quantity - Number(soldOut || 0)) }
      : it
    );

    saveData();
    closeModal();
    render();
  });

  refreshIcons();
}

function openInventoryModal() {
  const root = document.getElementById("modal-root");

  root.innerHTML = `
    <div class="modal-overlay" id="inventory-overlay">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>Add inventory</h2>
        <form id="inventory-form">
          <div class="field"><label>Product name</label><input name="product" required autofocus /></div>
          <div class="field"><label>Quantity</label><input name="quantity" type="number" min="0" /></div>
          <div class="row-2">
            <div class="field"><label>Stock-in price</label><input name="stockInPrice" type="number" step="0.01" min="0" /></div>
            <div class="field"><label>Target selling price</label><input name="targetSellingPrice" type="number" step="0.01" min="0" /></div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancel-inventory">Cancel</button>
            <button type="submit" class="btn-primary-full">Save product</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const overlay = document.getElementById("inventory-overlay");
  overlay.addEventListener("click", closeModal);
  document.getElementById("cancel-inventory").addEventListener("click", closeModal);

  document.getElementById("inventory-form").addEventListener("submit", e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const product = data.get("product");
    if (!product) return;

    inventory.unshift({
      id: uid(),
      product,
      quantity: Number(data.get("quantity")) || 0,
      stockInPrice: Number(data.get("stockInPrice")) || 0,
      targetSellingPrice: Number(data.get("targetSellingPrice")) || 0
    });

    saveData();
    closeModal();
    render();
  });

  refreshIcons();
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

document.querySelectorAll(".navitem").forEach(btn => {
  btn.addEventListener("click", () => {
    view = btn.dataset.view;
    document.querySelectorAll(".navitem").forEach(n => n.classList.toggle("active", n === btn));
    render();
  });
});

setupAuthPage();
