const STORAGE_KEY = "budgetbuddy.v1";
const THEME_KEY = "budgetbuddy.theme";
const categories = ["Housing", "Food", "Transport", "Utilities", "Health", "Entertainment", "Other"];

const state = loadState();
const ui = { searchQuery: "", sortColumn: null, sortDirection: "asc" };
const animValues = {};

const elements = {
  form: document.getElementById("transaction-form"),
  budgetForm: document.getElementById("budget-form"),
  saveBudgets: document.getElementById("save-budgets"),
  rows: document.getElementById("transaction-rows"),
  categorySelect: document.getElementById("category"),
  monthFilter: document.getElementById("month-filter"),
  seedDemo: document.getElementById("seed-demo"),
  exportData: document.getElementById("export-data"),
  resetData: document.getElementById("reset-data"),
  themeToggle: document.getElementById("theme-toggle"),
  showShortcuts: document.getElementById("show-shortcuts"),
  closeShortcuts: document.getElementById("close-shortcuts"),
  shortcutsDialog: document.getElementById("shortcuts-dialog"),
  categoryChart: document.getElementById("category-chart"),
  categoryDonut: document.getElementById("category-donut"),
  budgetProgress: document.getElementById("budget-progress"),
  heroExpense: document.getElementById("hero-expense"),
  heroRemaining: document.getElementById("hero-remaining"),
  heroTip: document.getElementById("hero-tip-text"),
  incomeTotal: document.getElementById("income-total"),
  expenseTotal: document.getElementById("expense-total"),
  balanceTotal: document.getElementById("balance-total"),
  budgetUsage: document.getElementById("budget-usage"),
  editOverlay: document.getElementById("edit-overlay"),
  editForm: document.getElementById("edit-form"),
  editCancel: document.getElementById("edit-cancel"),
  searchInput: document.getElementById("search-transactions"),
  description: document.getElementById("description"),
};

initTheme();
init();

function init() {
  buildCategoryOptions();
  buildEditCategoryOptions();
  buildBudgetInputs();
  const defaultMonth = currentMonth();
  state.selectedMonth = state.selectedMonth || defaultMonth;
  elements.monthFilter.value = state.selectedMonth;
  document.getElementById("date").value = `${defaultMonth}-01`;
  bindEvents();
  render();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleTransactionSubmit);
  elements.saveBudgets.addEventListener("click", handleBudgetSave);
  elements.monthFilter.addEventListener("change", (event) => {
    state.selectedMonth = event.target.value;
    document.getElementById("date").value = `${state.selectedMonth}-01`;
    saveState();
    render();
  });
  elements.seedDemo.addEventListener("click", seedDemoData);
  elements.exportData.addEventListener("click", exportCsv);
  elements.resetData.addEventListener("click", resetAllData);
  elements.editForm.addEventListener("submit", handleEditSubmit);
  elements.editCancel.addEventListener("click", () => { elements.editOverlay.hidden = true; });
  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.showShortcuts.addEventListener("click", toggleShortcutsDialog);
  elements.closeShortcuts.addEventListener("click", closeShortcutsDialog);
  elements.shortcutsDialog.addEventListener("click", (e) => {
    if (e.target === elements.shortcutsDialog) closeShortcutsDialog();
  });

  let searchTimer;
  elements.searchInput.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      ui.searchQuery = event.target.value.trim().toLowerCase();
      render();
    }, 200);
  });

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (ui.sortColumn === col) {
        ui.sortDirection = ui.sortDirection === "asc" ? "desc" : "asc";
      } else {
        ui.sortColumn = col;
        ui.sortDirection = "asc";
      }
      document.querySelectorAll("th[data-sort]").forEach((h) => h.classList.remove("sort-asc", "sort-desc"));
      th.classList.add(ui.sortDirection === "asc" ? "sort-asc" : "sort-desc");
      render();
    });
  });

  elements.rows.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-edit-id]");
    if (editBtn) {
      openEditModal(editBtn.dataset.editId);
      return;
    }
    const button = event.target.closest("[data-id]");
    if (!button) return;
    const confirmed = await showConfirm("Delete this transaction?");
    if (!confirmed) return;
    state.transactions = state.transactions.filter((tx) => tx.id !== button.dataset.id);
    saveState();
    render();
    showToast("Transaction deleted");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!elements.editOverlay.hidden) elements.editOverlay.hidden = true;
      if (!elements.shortcutsDialog.hidden) closeShortcutsDialog();
      const cf = document.getElementById("confirm-overlay");
      if (cf && !cf.hidden) document.getElementById("confirm-cancel").click();
      return;
    }
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === "n") {
      event.preventDefault();
      elements.description.focus();
      elements.description.select();
    } else if (key === "k") {
      event.preventDefault();
      elements.searchInput.focus();
      elements.searchInput.select();
    } else if (key === "e") {
      event.preventDefault();
      exportCsv();
    } else if (event.key === "/") {
      event.preventDefault();
      toggleShortcutsDialog();
    }
  });
}

function buildCategoryOptions() {
  elements.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function buildEditCategoryOptions() {
  document.getElementById("edit-category").innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function buildBudgetInputs() {
  elements.budgetForm.innerHTML = categories
    .map((category) => {
      const amount = state.budgets?.[category] ?? "";
      return `
        <label class="budget-item">
          <span>${category}</span>
          <input data-budget-category="${category}" type="number" min="0" step="0.01" value="${amount}" placeholder="0" />
        </label>
      `;
    })
    .join("");
}

function handleTransactionSubmit(event) {
  event.preventDefault();
  const transaction = {
    id: crypto.randomUUID(),
    description: elements.description.value.trim(),
    amount: Number(document.getElementById("amount").value),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
  };

  if (!transaction.description || transaction.amount <= 0 || !transaction.date) return;

  state.transactions.unshift(transaction);
  saveState();
  elements.form.reset();
  document.getElementById("date").value = `${state.selectedMonth}-01`;
  render();
  showToast("Transaction added");
}

function handleBudgetSave() {
  const inputs = [...elements.budgetForm.querySelectorAll("[data-budget-category]")];
  inputs.forEach((input) => {
    const key = input.dataset.budgetCategory;
    const value = Number(input.value);
    state.budgets[key] = value > 0 ? value : 0;
  });
  saveState();
  render();
  showToast("Budgets saved");
}

function seedDemoData() {
  state.transactions = [
    { id: crypto.randomUUID(), description: "Paycheck", amount: 2400, type: "income", category: "Other", date: `${state.selectedMonth}-01` },
    { id: crypto.randomUUID(), description: "Apartment rent", amount: 780, type: "expense", category: "Housing", date: `${state.selectedMonth}-03` },
    { id: crypto.randomUUID(), description: "Groceries", amount: 128.45, type: "expense", category: "Food", date: `${state.selectedMonth}-05` },
    { id: crypto.randomUUID(), description: "Gas refill", amount: 46.2, type: "expense", category: "Transport", date: `${state.selectedMonth}-06` },
    { id: crypto.randomUUID(), description: "Electric bill", amount: 92.14, type: "expense", category: "Utilities", date: `${state.selectedMonth}-08` },
    { id: crypto.randomUUID(), description: "Weekend movies", amount: 24.0, type: "expense", category: "Entertainment", date: `${state.selectedMonth}-10` },
  ];
  state.budgets = {
    Housing: 850,
    Food: 300,
    Transport: 160,
    Utilities: 140,
    Health: 120,
    Entertainment: 90,
    Other: 100,
  };
  buildBudgetInputs();
  saveState();
  render();
  showToast("Demo data loaded");
}

function exportCsv() {
  if (!state.transactions.length) {
    showToast("No transactions to export", "error");
    return;
  }
  const header = ["description", "category", "type", "date", "amount"];
  const rows = state.transactions.map((tx) =>
    [tx.description, tx.category, tx.type, tx.date, tx.amount].map(escapeCsvCell).join(",")
  );
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `budgetbuddy-${state.selectedMonth}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("CSV exported");
}

async function resetAllData() {
  const confirmed = await showConfirm("Delete all transactions and budgets? This cannot be undone.");
  if (!confirmed) return;
  state.transactions = [];
  state.budgets = defaultBudgets();
  saveState();
  buildBudgetInputs();
  render();
  showToast("All data cleared");
}

function openEditModal(txId) {
  const tx = state.transactions.find((t) => t.id === txId);
  if (!tx) return;
  document.getElementById("edit-id").value = tx.id;
  document.getElementById("edit-description").value = tx.description;
  document.getElementById("edit-amount").value = tx.amount;
  document.getElementById("edit-type").value = tx.type;
  document.getElementById("edit-category").value = tx.category;
  document.getElementById("edit-date").value = tx.date;
  elements.editOverlay.hidden = false;
}

function handleEditSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("edit-id").value;
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  tx.description = document.getElementById("edit-description").value.trim();
  tx.amount = Number(document.getElementById("edit-amount").value);
  tx.type = document.getElementById("edit-type").value;
  tx.category = document.getElementById("edit-category").value;
  tx.date = document.getElementById("edit-date").value;
  saveState();
  render();
  elements.editOverlay.hidden = true;
  showToast("Transaction updated");
}

function render() {
  const monthTransactions = state.transactions.filter((tx) => tx.date.startsWith(state.selectedMonth));

  let filteredTransactions = monthTransactions;

  if (ui.searchQuery) {
    filteredTransactions = filteredTransactions.filter(
      (tx) => tx.description.toLowerCase().includes(ui.searchQuery) || tx.category.toLowerCase().includes(ui.searchQuery)
    );
  }

  if (ui.sortColumn) {
    const dir = ui.sortDirection === "asc" ? 1 : -1;
    filteredTransactions = [...filteredTransactions].sort((a, b) => {
      const av = a[ui.sortColumn], bv = b[ui.sortColumn];
      if (typeof av === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  const totals = monthTransactions.reduce(
    (acc, tx) => {
      if (tx.type === "income") acc.income += tx.amount;
      else acc.expense += tx.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const balance = totals.income - totals.expense;
  const spendingByCategory = categories.map((category) => ({
    category,
    amount: monthTransactions
      .filter((tx) => tx.type === "expense" && tx.category === category)
      .reduce((sum, tx) => sum + tx.amount, 0),
  }));

  const totalBudget = Object.values(state.budgets).reduce((sum, amount) => sum + Number(amount || 0), 0);
  const budgetUsed = totalBudget ? Math.min(100, (totals.expense / totalBudget) * 100) : 0;
  const budgetRemaining = totalBudget - totals.expense;
  const sortedSpending = [...spendingByCategory].sort((a, b) => b.amount - a.amount);
  const topCategory = sortedSpending[0];

  animateNumber(elements.incomeTotal, totals.income);
  animateNumber(elements.expenseTotal, totals.expense);
  animateNumber(elements.balanceTotal, balance);
  animateNumber(elements.heroExpense, totals.expense);
  animateNumber(elements.heroRemaining, Math.max(budgetRemaining, 0));

  const balanceCard = document.getElementById("balance-card");
  balanceCard.className = `summary-card ${balance >= 0 ? "summary-card--balance-positive" : "summary-card--balance-negative"}`;
  elements.budgetUsage.textContent = `${Math.round(budgetUsed)}%`;

  elements.heroTip.textContent = topCategory && topCategory.amount > 0
    ? `${topCategory.category} is your highest expense category this month. Review it first for savings opportunities.`
    : "Add your first transaction to start seeing spending insights.";

  renderDonut(spendingByCategory);
  renderCategoryChart(spendingByCategory);
  renderBudgetProgress(spendingByCategory);
  renderTransactions(filteredTransactions);
}

function renderCategoryChart(spendingByCategory) {
  const max = Math.max(...spendingByCategory.map((entry) => entry.amount), 1);
  const items = spendingByCategory
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((entry) => {
      const width = Math.max(6, (entry.amount / max) * 100);
      return `
        <div class="bar-card">
          <div class="bar-header">
            <span>${entry.category}</span>
            <strong>${formatCurrency(entry.amount)}</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        </div>
      `;
    })
    .join("");
  elements.categoryChart.innerHTML = items || `<p class="empty-state">No expense data for this month yet.</p>`;
}

function renderDonut(spendingByCategory) {
  const positive = spendingByCategory.filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = positive.reduce((s, e) => s + e.amount, 0);
  if (!total) {
    elements.categoryDonut.innerHTML = `<p class="donut-empty">Spending breakdown will appear here once you log expenses.</p>`;
    return;
  }
  const C = 2 * Math.PI * 40;
  let offset = 0;
  const slices = positive
    .map((e) => {
      const len = (e.amount / total) * C;
      const slice = `<circle class="donut-slice" cx="50" cy="50" r="40" fill="none" stroke="hsl(${categoryHue(e.category)} 75% 58%)" stroke-width="14" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 50 50)"><title>${e.category}: ${formatCurrency(e.amount)}</title></circle>`;
      offset += len;
      return slice;
    })
    .join("");

  const legend = positive
    .map(
      (e) => `
        <li>
          <span class="swatch" style="background: hsl(${categoryHue(e.category)} 75% 58%)"></span>
          <span>${e.category}</span>
          <span class="legend-amount">${formatCurrency(e.amount)}</span>
        </li>
      `
    )
    .join("");

  elements.categoryDonut.innerHTML = `
    <svg class="donut-svg" viewBox="0 0 100 100">
      <circle class="donut-track" cx="50" cy="50" r="40" fill="none" stroke-width="14" />
      ${slices}
      <text x="50" y="48" text-anchor="middle" class="donut-total">${formatCurrency(total)}</text>
      <text x="50" y="58" text-anchor="middle" class="donut-label">Total spent</text>
    </svg>
    <ul class="donut-legend">${legend}</ul>
  `;
}

function renderBudgetProgress(spendingByCategory) {
  const items = categories
    .map((category) => {
      const spent = spendingByCategory.find((item) => item.category === category)?.amount || 0;
      const budget = Number(state.budgets[category] || 0);
      if (!budget && !spent) return "";
      const percent = budget ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
      const remaining = budget - spent;
      const barPercent = budget ? Math.min(percent, 100) : 0;
      const status =
        percent >= 100 ? { label: "Over budget", cls: "over" }
        : percent >= 80 ? { label: "Near limit", cls: "warning" }
        : { label: "On track", cls: "good" };
      return `
        <div class="progress-card">
          <div class="progress-header">
            <span>${category}</span>
            <strong>${formatCurrency(spent)} / ${formatCurrency(budget)}</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${percent >= 100 ? "over" : ""}" style="width:${barPercent}%"></div>
          </div>
          <div class="progress-foot">
            <span class="empty-state" style="padding:0;text-align:left;">
              ${remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over budget`}
            </span>
            ${budget ? `<span class="progress-status ${status.cls}">${status.label}</span>` : ""}
          </div>
        </div>
      `;
    })
    .join("");
  elements.budgetProgress.innerHTML = items || `<p class="empty-state">Set a budget to start tracking progress.</p>`;
}

function renderTransactions(transactions) {
  elements.rows.innerHTML = transactions.length
    ? transactions
        .map(
          (tx) => `
            <tr>
              <td>${escapeHtml(tx.description)}</td>
              <td>${tx.category}</td>
              <td><span class="type-pill type-${tx.type}">${tx.type}</span></td>
              <td>${tx.date}</td>
              <td>${formatCurrency(tx.amount)}</td>
              <td>
                <button class="edit-btn" data-edit-id="${tx.id}" aria-label="Edit transaction">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                  Edit
                </button>
                <button class="delete-btn" data-id="${tx.id}" aria-label="Delete transaction">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  Delete
                </button>
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="6" class="empty-state">No transactions in ${state.selectedMonth} yet.</td></tr>`;
}

function loadState() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    setTimeout(() => showToast("Saved data was corrupted and has been reset", "error"), 500);
  }
  return {
    transactions: saved.transactions || [],
    budgets: { ...defaultBudgets(), ...(saved.budgets || {}) },
    selectedMonth: saved.selectedMonth || currentMonth(),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultBudgets() {
  return categories.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function escapeCsvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* Animated count-up for currency stats */
function animateNumber(el, target) {
  if (!el) return;
  const id = el.id;
  const start = animValues[id] ?? 0;
  if (Math.abs(target - start) < 0.005) {
    el.textContent = formatCurrency(target);
    animValues[id] = target;
    return;
  }
  const duration = 520;
  const startTime = performance.now();
  cancelAnimationFrame(el._anim);
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = start + (target - start) * eased;
    el.textContent = formatCurrency(value);
    if (t < 1) el._anim = requestAnimationFrame(step);
    else animValues[id] = target;
  }
  el._anim = requestAnimationFrame(step);
}

/* Theme */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  showToast(`${next === "dark" ? "Dark" : "Light"} mode`, "info");
}

/* Shortcuts dialog */
function openShortcutsDialog() { elements.shortcutsDialog.hidden = false; }
function closeShortcutsDialog() { elements.shortcutsDialog.hidden = true; }
function toggleShortcutsDialog() {
  elements.shortcutsDialog.hidden = !elements.shortcutsDialog.hidden;
}

/* Tag color hashing */
function categoryHue(category) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return hash % 360;
}

function showToast(message, type = "success", duration = 2600) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.animationDuration = "0.3s, 0.4s";
  toast.style.animationDelay = `0s, ${duration}ms`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration + 500);
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirm-overlay");
    const msg = document.getElementById("confirm-message");
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");
    msg.textContent = message;
    overlay.hidden = false;

    function cleanup(result) {
      overlay.hidden = true;
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}
