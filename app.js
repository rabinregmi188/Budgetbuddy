const STORAGE_KEY = "budgetbuddy.v1";
const categories = ["Housing", "Food", "Transport", "Utilities", "Health", "Entertainment", "Other"];

const state = loadState();

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
  categoryChart: document.getElementById("category-chart"),
  budgetProgress: document.getElementById("budget-progress"),
  heroExpense: document.getElementById("hero-expense"),
  heroRemaining: document.getElementById("hero-remaining"),
  heroTip: document.getElementById("hero-tip-text"),
  incomeTotal: document.getElementById("income-total"),
  expenseTotal: document.getElementById("expense-total"),
  balanceTotal: document.getElementById("balance-total"),
  budgetUsage: document.getElementById("budget-usage"),
};

init();

function init() {
  buildCategoryOptions();
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
    saveState();
    render();
  });
  elements.seedDemo.addEventListener("click", seedDemoData);
  elements.exportData.addEventListener("click", exportCsv);
  elements.resetData.addEventListener("click", resetAllData);
  elements.rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    state.transactions = state.transactions.filter((tx) => tx.id !== button.dataset.id);
    saveState();
    render();
  });
}

function buildCategoryOptions() {
  elements.categorySelect.innerHTML = categories
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
  const formData = new FormData(elements.form);
  const transaction = {
    id: crypto.randomUUID(),
    description: formData.get("description") || document.getElementById("description").value.trim(),
    amount: Number(document.getElementById("amount").value),
    type: document.getElementById("type").value,
    category: document.getElementById("category").value,
    date: document.getElementById("date").value,
  };

  if (!transaction.description || !transaction.amount || !transaction.date) return;

  state.transactions.unshift(transaction);
  saveState();
  elements.form.reset();
  document.getElementById("date").value = `${state.selectedMonth}-01`;
  render();
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
}

function exportCsv() {
  if (!state.transactions.length) return;
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
}

function resetAllData() {
  state.transactions = [];
  state.budgets = defaultBudgets();
  saveState();
  buildBudgetInputs();
  render();
}

function render() {
  const filteredTransactions = state.transactions.filter((tx) => tx.date.startsWith(state.selectedMonth));
  const totals = filteredTransactions.reduce(
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
    amount: filteredTransactions
      .filter((tx) => tx.type === "expense" && tx.category === category)
      .reduce((sum, tx) => sum + tx.amount, 0),
  }));

  const totalBudget = Object.values(state.budgets).reduce((sum, amount) => sum + Number(amount || 0), 0);
  const budgetUsed = totalBudget ? Math.min(100, (totals.expense / totalBudget) * 100) : 0;
  const budgetRemaining = totalBudget - totals.expense;
  const topCategory = spendingByCategory.sort((a, b) => b.amount - a.amount)[0];

  elements.incomeTotal.textContent = formatCurrency(totals.income);
  elements.expenseTotal.textContent = formatCurrency(totals.expense);
  elements.balanceTotal.textContent = formatCurrency(balance);
  elements.budgetUsage.textContent = `${Math.round(budgetUsed)}%`;
  elements.heroExpense.textContent = formatCurrency(totals.expense);
  elements.heroRemaining.textContent = formatCurrency(Math.max(budgetRemaining, 0));
  elements.heroTip.textContent = topCategory && topCategory.amount > 0
    ? `${topCategory.category} is your highest expense category this month. Review it first for savings opportunities.`
    : "Add your first transaction to start seeing spending insights.";

  renderCategoryChart(spendingByCategory);
  renderBudgetProgress(spendingByCategory);
  renderTransactions(filteredTransactions);
}

function renderCategoryChart(spendingByCategory) {
  const max = Math.max(...spendingByCategory.map((entry) => entry.amount), 1);
  const items = spendingByCategory
    .filter((entry) => entry.amount > 0)
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

function renderBudgetProgress(spendingByCategory) {
  const items = categories
    .map((category) => {
      const spent = spendingByCategory.find((item) => item.category === category)?.amount || 0;
      const budget = Number(state.budgets[category] || 0);
      if (!budget && !spent) return "";
      const percent = budget ? Math.min(140, (spent / budget) * 100) : spent > 0 ? 140 : 0;
      const remaining = budget - spent;
      return `
        <div class="progress-card">
          <div class="progress-header">
            <span>${category}</span>
            <strong>${formatCurrency(spent)} / ${formatCurrency(budget)}</strong>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${percent > 100 ? "over" : ""}" style="width:${Math.min(percent, 100)}%"></div>
          </div>
          <span class="empty-state">${remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over budget`}</span>
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
              <td><button class="delete-btn" data-id="${tx.id}">Delete</button></td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="6" class="empty-state">No transactions in ${state.selectedMonth} yet.</td></tr>`;
}

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
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
