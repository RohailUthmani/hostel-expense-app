// ---------- DATA ----------
// Stored in localStorage under one key.
// data = {
//   members: [{ id, name }],
//   expenses: [{ id, amount, payerId, date, sharedBy: [memberId, ...] }],
//   settlements: [{ id, fromId, toId, amount, date }]
// }

const STORAGE_KEY = "hostelExpenseData";

let data = loadData();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Corrupt data, starting fresh.", e);
    }
  }
  return { members: [], expenses: [], settlements: [] };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- DOM REFERENCES ----------

const memberForm = document.getElementById("member-form");
const memberNameInput = document.getElementById("member-name-input");
const membersList = document.getElementById("members-list");

const expenseForm = document.getElementById("expense-form");
const expenseAmountInput = document.getElementById("expense-amount");
const expensePayerSelect = document.getElementById("expense-payer");
const expenseDateInput = document.getElementById("expense-date");
const expenseSharedByDiv = document.getElementById("expense-shared-by");
const expensesList = document.getElementById("expenses-list");

const totalAmountEl = document.getElementById("total-amount");
const balancesList = document.getElementById("balances-list");

const settlementForm = document.getElementById("settlement-form");
const settlementFromSelect = document.getElementById("settlement-from");
const settlementToSelect = document.getElementById("settlement-to");
const settlementAmountInput = document.getElementById("settlement-amount");
const settlementsList = document.getElementById("settlements-list");

const clearPeriodBtn = document.getElementById("clear-period-btn");

// ---------- MEMBERS ----------

memberForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = memberNameInput.value.trim();
  if (!name) return;

  data.members.push({ id: uid(), name: name });
  saveData();
  memberNameInput.value = "";
  renderAll();
});

function removeMember(memberId) {
  const usedInExpense = data.expenses.some(
    (exp) => exp.payerId === memberId || exp.sharedBy.includes(memberId)
  );
  const usedInSettlement = data.settlements.some(
    (s) => s.fromId === memberId || s.toId === memberId
  );

  if (usedInExpense || usedInSettlement) {
    alert(
      "This member is used in an existing expense or settlement and cannot be removed. Clear the current period first if you want to remove them."
    );
    return;
  }

  data.members = data.members.filter((m) => m.id !== memberId);
  saveData();
  renderAll();
}

function renderMembers() {
  membersList.innerHTML = "";
  if (data.members.length === 0) {
    membersList.innerHTML = '<li class="empty-msg">No members yet.</li>';
    return;
  }
  data.members.forEach((member) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = member.name;

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.className = "remove-btn";
    btn.addEventListener("click", () => removeMember(member.id));

    li.appendChild(span);
    li.appendChild(btn);
    membersList.appendChild(li);
  });
}

// ---------- EXPENSES ----------

function renderExpensePayerOptions() {
  expensePayerSelect.innerHTML = "";
  data.members.forEach((member) => {
    const opt = document.createElement("option");
    opt.value = member.id;
    opt.textContent = member.name;
    expensePayerSelect.appendChild(opt);
  });
}

function renderExpenseSharedByCheckboxes() {
  expenseSharedByDiv.innerHTML = "";
  if (data.members.length === 0) {
    expenseSharedByDiv.innerHTML = '<span class="empty-msg">Add members first.</span>';
    return;
  }
  data.members.forEach((member) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = member.id;
    checkbox.checked = true; // default: shared by everyone, user can uncheck
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(member.name));
    expenseSharedByDiv.appendChild(label);
  });
}

expenseForm.addEventListener("submit", function (e) {
  e.preventDefault();

  if (data.members.length === 0) {
    alert("Add at least one member before recording an expense.");
    return;
  }

  const amount = parseFloat(expenseAmountInput.value);
  const payerId = expensePayerSelect.value;
  const date = expenseDateInput.value;

  const checkedBoxes = expenseSharedByDiv.querySelectorAll(
    'input[type="checkbox"]:checked'
  );
  const sharedBy = Array.from(checkedBoxes).map((cb) => cb.value);

  if (!amount || amount <= 0) {
    alert("Enter a valid amount.");
    return;
  }
  if (!payerId) {
    alert("Select who paid.");
    return;
  }
  if (sharedBy.length === 0) {
    alert("Select at least one member who shares this expense.");
    return;
  }

  data.expenses.push({
    id: uid(),
    amount: amount,
    payerId: payerId,
    date: date,
    sharedBy: sharedBy,
  });

  saveData();
  expenseForm.reset();
  expenseDateInput.value = new Date().toISOString().slice(0, 10);
  renderAll();
});

function removeExpense(expenseId) {
  data.expenses = data.expenses.filter((exp) => exp.id !== expenseId);
  saveData();
  renderAll();
}

function memberName(memberId) {
  const m = data.members.find((mem) => mem.id === memberId);
  return m ? m.name : "(removed member)";
}

function renderExpenses() {
  expensesList.innerHTML = "";
  if (data.expenses.length === 0) {
    expensesList.innerHTML = '<li class="empty-msg">No expenses yet.</li>';
    return;
  }

  const sorted = [...data.expenses].sort((a, b) => (a.date < b.date ? 1 : -1));

  sorted.forEach((exp) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.style.width = "100%";

    const mainLine = document.createElement("div");
    mainLine.textContent =
      exp.amount.toFixed(2) + " paid by " + memberName(exp.payerId);

    const detailLine = document.createElement("div");
    detailLine.className = "expense-detail";
    const sharedNames = exp.sharedBy.map(memberName).join(", ");
    detailLine.textContent =
      (exp.date ? exp.date + " — " : "") + "Shared by: " + sharedNames;

    info.appendChild(mainLine);
    info.appendChild(detailLine);

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.className = "remove-btn";
    btn.addEventListener("click", () => removeExpense(exp.id));

    li.appendChild(info);
    li.appendChild(btn);
    expensesList.appendChild(li);
  });
}

// ---------- TOTAL ----------

function renderTotal() {
  const total = data.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  totalAmountEl.textContent = total.toFixed(2);
}

// ---------- BALANCES ----------

function calculateBalances() {
  const balances = {};
  data.members.forEach((m) => {
    balances[m.id] = 0;
  });

  data.expenses.forEach((exp) => {
    // payer gets credited the full amount
    if (balances[exp.payerId] !== undefined) {
      balances[exp.payerId] += exp.amount;
    }
    // each sharing member is debited their equal share
    const share = exp.amount / exp.sharedBy.length;
    exp.sharedBy.forEach((memberId) => {
      if (balances[memberId] !== undefined) {
        balances[memberId] -= share;
      }
    });
  });

  data.settlements.forEach((s) => {
    // "from" paid money directly to "to", so from's balance goes up
    // (they gave money) and to's balance goes down (they received money).
    if (balances[s.fromId] !== undefined) {
      balances[s.fromId] += s.amount;
    }
    if (balances[s.toId] !== undefined) {
      balances[s.toId] -= s.amount;
    }
  });

  return balances;
}

function renderBalances() {
  balancesList.innerHTML = "";
  if (data.members.length === 0) {
    balancesList.innerHTML = '<li class="empty-msg">No members yet.</li>';
    return;
  }

  const balances = calculateBalances();

  data.members.forEach((member) => {
    const bal = balances[member.id] || 0;
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = member.name;

    const balSpan = document.createElement("span");
    const rounded = Math.round(bal * 100) / 100;

    if (Math.abs(rounded) < 0.005) {
      balSpan.textContent = "Settled up";
      balSpan.className = "balance-zero";
    } else if (rounded > 0) {
      balSpan.textContent = "Is owed " + rounded.toFixed(2);
      balSpan.className = "balance-positive";
    } else {
      balSpan.textContent = "Owes " + Math.abs(rounded).toFixed(2);
      balSpan.className = "balance-negative";
    }

    li.appendChild(nameSpan);
    li.appendChild(balSpan);
    balancesList.appendChild(li);
  });
}

// ---------- SETTLEMENTS ----------

function renderSettlementOptions() {
  settlementFromSelect.innerHTML = "";
  settlementToSelect.innerHTML = "";
  data.members.forEach((member) => {
    const opt1 = document.createElement("option");
    opt1.value = member.id;
    opt1.textContent = member.name;
    settlementFromSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = member.id;
    opt2.textContent = member.name;
    settlementToSelect.appendChild(opt2);
  });
}

settlementForm.addEventListener("submit", function (e) {
  e.preventDefault();

  if (data.members.length < 2) {
    alert("You need at least two members to record a settlement.");
    return;
  }

  const fromId = settlementFromSelect.value;
  const toId = settlementToSelect.value;
  const amount = parseFloat(settlementAmountInput.value);

  if (!settlementAmountInput.value.trim() || isNaN(Number(settlementAmountInput.value))) {
    alert("Enter a valid numeric settlement amount.");
    return;
  }
  if (!amount || amount <= 0) {
    alert("Enter a valid settlement amount.");
    return;
  }
  if (fromId === toId) {
    alert("'From' and 'To' must be different members.");
    return;
  }

  data.settlements.push({
    id: uid(),
    fromId: fromId,
    toId: toId,
    amount: amount,
    date: new Date().toISOString().slice(0, 10),
  });

  saveData();
  settlementForm.reset();
  renderAll();
});

function removeSettlement(settlementId) {
  data.settlements = data.settlements.filter((s) => s.id !== settlementId);
  saveData();
  renderAll();
}

function renderSettlements() {
  settlementsList.innerHTML = "";
  if (data.settlements.length === 0) {
    settlementsList.innerHTML = '<li class="empty-msg">No settlements recorded.</li>';
    return;
  }

  const sorted = [...data.settlements].sort((a, b) => (a.date < b.date ? 1 : -1));

  sorted.forEach((s) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.textContent =
      memberName(s.fromId) +
      " → " +
      memberName(s.toId) +
      " " +
      s.amount.toFixed(2) +
      (s.date ? " (" + s.date + ")" : "");

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.className = "remove-btn";
    btn.addEventListener("click", () => removeSettlement(s.id));

    li.appendChild(info);
    li.appendChild(btn);
    settlementsList.appendChild(li);
  });
}

// ---------- CLEAR / RESET CURRENT PERIOD ----------

clearPeriodBtn.addEventListener("click", function () {
  const confirmed = confirm(
    "This will clear all expenses and settlements for the current period. Members will be kept. Continue?"
  );
  if (!confirmed) return;

  data.expenses = [];
  data.settlements = [];
  saveData();
  renderAll();
});

// ---------- RENDER ALL ----------

function renderAll() {
  renderMembers();
  renderExpensePayerOptions();
  renderExpenseSharedByCheckboxes();
  renderExpenses();
  renderTotal();
  renderBalances();
  renderSettlementOptions();
  renderSettlements();
}

// ---------- INIT ----------

expenseDateInput.value = new Date().toISOString().slice(0, 10);
renderAll();
