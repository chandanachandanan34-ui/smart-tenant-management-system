const STORAGE_KEY = "tenanthub-demo-tenants-v1";

const starterTenants = [
  { id: "t101", name: "Ananya Sharma", email: "ananya@example.com", phone: "9876543210", property: "Lakeview Residency", unit: "A-204", rent: 18000, status: "Paid" },
  { id: "t102", name: "Rahul Menon", email: "rahul@example.com", phone: "9845012345", property: "Maple Heights", unit: "B-108", rent: 22000, status: "Pending" },
  { id: "t103", name: "Priya Nair", email: "priya@example.com", phone: "9900123456", property: "Greenwood Homes", unit: "C-302", rent: 16000, status: "Overdue" },
  { id: "t104", name: "Karthik Rao", email: "karthik@example.com", phone: "9880765432", property: "Lakeview Residency", unit: "A-105", rent: 19000, status: "Paid" },
  { id: "t105", name: "Meera Iyer", email: "meera@example.com", phone: "9739012345", property: "Maple Heights", unit: "B-206", rent: 21000, status: "Pending" }
];

let tenants = loadTenants();
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadTenants() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return JSON.parse(saved);
  } catch (error) {
    console.warn("Browser storage is unavailable; changes may not persist.", error);
  }
  return starterTenants.map((tenant) => ({ ...tenant }));
}

function saveTenants() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  } catch (error) {
    console.warn("Could not save tenant data in browser storage.", error);
  }
}

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function initials(name) {
  return String(name || "Tenant").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function avatarColor(index) {
  return ["", "pink", "gold", "green", "violet"][index % 5];
}

function statusBadge(status) {
  const safeStatus = ["Paid", "Pending", "Overdue"].includes(status) ? status : "Pending";
  return `<span class="status-badge ${safeStatus.toLowerCase()}">${safeStatus}</span>`;
}

function tenantCell(tenant, index) {
  return `<div class="tenant-cell">
    <div class="tenant-avatar ${avatarColor(index)}">${escapeHTML(initials(tenant.name))}</div>
    <div class="tenant-copy"><strong>${escapeHTML(tenant.name)}</strong><span>${escapeHTML(tenant.email || "No email provided")}</span></div>
  </div>`;
}

function getTotals() {
  return tenants.reduce((totals, tenant) => {
    const rent = Number(tenant.rent) || 0;
    totals.expected += rent;
    if (tenant.status === "Paid") totals.paid += rent;
    else if (tenant.status === "Overdue") totals.overdue += rent;
    else totals.pending += rent;
    return totals;
  }, { expected: 0, paid: 0, pending: 0, overdue: 0 });
}

function renderDashboard() {
  const totals = getTotals();
  $("#statTenants").textContent = tenants.length;
  $("#navTenantCount").textContent = tenants.length;
  $("#statCollected").textContent = money(totals.paid);
  $("#statPending").textContent = money(totals.pending + totals.overdue);
  $("#collectedLarge").textContent = money(totals.paid);
  const rate = totals.expected ? Math.round((totals.paid / totals.expected) * 100) : 0;
  $("#collectionRate").textContent = `${rate}%`;
  $("#collectionProgress").style.width = `${rate}%`;

  const recent = [...tenants].slice(-5).reverse();
  $("#recentTenantRows").innerHTML = recent.map((tenant) => {
    const index = tenants.findIndex((item) => item.id === tenant.id);
    return `<tr>
      <td>${tenantCell(tenant, index)}</td>
      <td>${escapeHTML(tenant.property)}<br><span class="muted">${escapeHTML(tenant.unit)}</span></td>
      <td>${money(tenant.rent)}</td>
      <td>${statusBadge(tenant.status)}</td>
      <td><button class="small-action" data-edit="${escapeHTML(tenant.id)}">Edit</button></td>
    </tr>`;
  }).join("");
  $("#recentEmpty").classList.toggle("hidden", recent.length > 0);
}

function renderTenants() {
  const query = ($("#tenantSearch").value || "").trim().toLowerCase();
  const status = $("#statusFilter").value;
  const filtered = tenants.filter((tenant) => {
    const haystack = [tenant.name, tenant.email, tenant.phone, tenant.property, tenant.unit].join(" ").toLowerCase();
    return haystack.includes(query) && (status === "all" || tenant.status === status);
  });
  $("#tenantCountLabel").textContent = filtered.length;
  $("#tenantRows").innerHTML = filtered.map((tenant) => {
    const index = tenants.findIndex((item) => item.id === tenant.id);
    return `<tr>
      <td>${tenantCell(tenant, index)}</td>
      <td>${escapeHTML(tenant.property)}<br><span class="muted">${escapeHTML(tenant.unit)}</span></td>
      <td>${escapeHTML(tenant.phone)}</td>
      <td>${money(tenant.rent)}</td>
      <td>${statusBadge(tenant.status)}</td>
      <td><div class="row-actions"><button class="small-action" data-edit="${escapeHTML(tenant.id)}">Edit</button><button class="small-action" data-delete="${escapeHTML(tenant.id)}">Delete</button></div></td>
    </tr>`;
  }).join("");
  $("#tenantEmpty").classList.toggle("hidden", filtered.length > 0);
}

function renderPayments() {
  const totals = getTotals();
  $("#paymentExpected").textContent = money(totals.expected);
  $("#paymentPaid").textContent = money(totals.paid);
  $("#paymentPending").textContent = money(totals.pending);
  $("#paymentOverdue").textContent = money(totals.overdue);
  $("#paymentRows").innerHTML = tenants.map((tenant, index) => {
    const action = tenant.status === "Paid"
      ? `<button class="small-action" data-set-status="${escapeHTML(tenant.id)}" data-status="Pending">Mark pending</button>`
      : `<button class="small-action" data-set-status="${escapeHTML(tenant.id)}" data-status="Paid">Mark paid</button>`;
    return `<tr>
      <td>${tenantCell(tenant, index)}</td>
      <td>${escapeHTML(tenant.property)}<br><span class="muted">${escapeHTML(tenant.unit)}</span></td>
      <td>October 2026</td><td>${money(tenant.rent)}</td><td>${statusBadge(tenant.status)}</td><td>${action}</td>
    </tr>`;
  }).join("");
  $("#paymentEmpty").classList.toggle("hidden", tenants.length > 0);
}

function renderProperties() {
  const properties = ["Lakeview Residency", "Maple Heights", "Greenwood Homes"];
  const ids = ["lakeOccupied", "mapleOccupied", "greenOccupied"];
  properties.forEach((property, index) => {
    const count = tenants.filter((tenant) => tenant.property === property).length;
    const target = document.getElementById(ids[index]);
    if (target) target.textContent = count;
  });
}

function renderAll() {
  renderDashboard();
  renderTenants();
  renderPayments();
  renderProperties();
}

function showPage(page) {
  const validPages = ["dashboard", "tenants", "properties", "payments"];
  if (!validPages.includes(page)) return;
  $$(".page-section").forEach((section) => section.classList.toggle("active", section.id === `page-${page}`));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.page === page));
  $("#breadcrumbPage").textContent = ({ dashboard: "Dashboard", tenants: "Tenants", properties: "Properties", payments: "Rent & Payments" })[page];
  $("#sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(tenant = null) {
  $("#tenantForm").reset();
  $("#formError").classList.add("hidden");
  $("#tenantId").value = tenant?.id || "";
  $("#modalTitle").textContent = tenant ? "Edit tenant" : "Add new tenant";
  $("#saveTenant").textContent = tenant ? "Save changes" : "Save tenant";
  $("#tenantName").value = tenant?.name || "";
  $("#tenantEmail").value = tenant?.email || "";
  $("#tenantPhone").value = tenant?.phone || "";
  $("#tenantProperty").value = tenant?.property || "";
  $("#tenantUnit").value = tenant?.unit || "";
  $("#tenantRent").value = tenant?.rent ?? "";
  $("#tenantStatus").value = tenant?.status || "Pending";
  $("#tenantModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#tenantName").focus(), 50);
}

function closeModal() {
  $("#tenantModal").classList.add("hidden");
  document.body.style.overflow = "";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function showFormError(message) {
  $("#formError").textContent = message;
  $("#formError").classList.remove("hidden");
}

function handleTenantSubmit(event) {
  event.preventDefault();
  const id = $("#tenantId").value;
  const name = $("#tenantName").value.trim();
  const email = $("#tenantEmail").value.trim();
  const phone = $("#tenantPhone").value.trim();
  const property = $("#tenantProperty").value;
  const unit = $("#tenantUnit").value.trim();
  const rent = Number($("#tenantRent").value);
  const status = $("#tenantStatus").value;

  if (!name || !phone || !property || !unit || !Number.isFinite(rent) || rent <= 0) {
    showFormError("Please complete all required fields with valid values.");
    return;
  }
  if (tenants.some((tenant) => tenant.id !== id && tenant.property === property && tenant.unit.toLowerCase() === unit.toLowerCase())) {
    showFormError("A tenant record already uses this unit in the selected property. Please check the unit number.");
    return;
  }

  const record = { id: id || `t${Date.now()}`, name, email, phone, property, unit, rent, status };
  if (id) {
    tenants = tenants.map((tenant) => tenant.id === id ? record : tenant);
    showToast("Tenant details updated.");
  } else {
    tenants.unshift(record);
    showToast("Tenant added successfully.");
  }
  saveTenants();
  renderAll();
  closeModal();
}

function deleteTenant(id) {
  const tenant = tenants.find((item) => item.id === id);
  if (!tenant) return;
  const confirmed = window.confirm(`Delete the tenant record for ${tenant.name}? This cannot be undone in this browser.`);
  if (!confirmed) return;
  tenants = tenants.filter((item) => item.id !== id);
  saveTenants();
  renderAll();
  showToast("Tenant record deleted.");
}

function updateStatus(id, status) {
  if (!["Paid", "Pending", "Overdue"].includes(status)) return;
  tenants = tenants.map((tenant) => tenant.id === id ? { ...tenant, status } : tenant);
  saveTenants();
  renderAll();
  showToast(`Payment status changed to ${status.toLowerCase()}.`);
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-page]");
  if (nav) showPage(nav.dataset.page);

  const goto = event.target.closest("[data-goto]");
  if (goto) showPage(goto.dataset.goto);

  const editButton = event.target.closest("[data-edit]");
  if (editButton) {
    const tenant = tenants.find((item) => item.id === editButton.dataset.edit);
    if (tenant) openModal(tenant);
  }

  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) deleteTenant(deleteButton.dataset.delete);

  const statusButton = event.target.closest("[data-set-status]");
  if (statusButton) updateStatus(statusButton.dataset.setStatus, statusButton.dataset.status);
});

$("#addTenantTop").addEventListener("click", () => openModal());
$("#quickAddTenant").addEventListener("click", () => openModal());
$("#addTenantPage").addEventListener("click", () => openModal());
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
$("#tenantModal").addEventListener("click", (event) => {
  if (event.target === $("#tenantModal")) closeModal();
});
$("#tenantForm").addEventListener("submit", handleTenantSubmit);
$("#tenantSearch").addEventListener("input", renderTenants);
$("#statusFilter").addEventListener("change", renderTenants);
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#notificationBtn").addEventListener("click", () => showToast("You're all caught up in this demo workspace."));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#tenantModal").classList.contains("hidden")) closeModal();
});

renderAll();
