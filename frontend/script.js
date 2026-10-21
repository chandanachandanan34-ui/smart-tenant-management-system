const API_BASE_URL = "http://localhost:8080/api/tenants";
const PROPERTY_API_BASE_URL = "http://localhost:8080/api/properties";

let tenants = [];
let properties = [];
let toastTimer;
let isSubmittingTenant = false;
let isSubmittingProperty = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

/**
 * Format number into Indian Rupee currency string
 */
function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

/**
 * Generate 1-2 letter initials from a tenant name
 */
function initials(name) {
  return String(name || "Tenant")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

/**
 * Escape HTML to prevent XSS injection
 */
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

/**
 * Pick an avatar theme color based on index
 */
function avatarColor(index) {
  return ["", "pink", "gold", "green", "violet"][index % 5];
}

/**
 * Build a styled status badge
 */
function statusBadge(status) {
  const safeStatus = ["Paid", "Pending", "Overdue"].includes(status) ? status : "Pending";
  return `<span class="status-badge ${safeStatus.toLowerCase()}">${escapeHTML(safeStatus)}</span>`;
}

/**
 * Build the tenant name + avatar cell HTML
 */
function tenantCell(tenant, index) {
  return `<div class="tenant-cell">
    <div class="tenant-avatar ${avatarColor(index)}">${escapeHTML(initials(tenant.name))}</div>
    <div class="tenant-copy"><strong>${escapeHTML(tenant.name)}</strong><span>${escapeHTML(tenant.email || "No email provided")}</span></div>
  </div>`;
}

/**
 * Compute aggregate financial totals from loaded tenants
 */
function getTotals() {
  return tenants.reduce(
    (totals, tenant) => {
      const rent = Number(tenant.rent) || 0;
      totals.expected += rent;
      if (tenant.status === "Paid") totals.paid += rent;
      else if (tenant.status === "Overdue") totals.overdue += rent;
      else totals.pending += rent;
      return totals;
    },
    { expected: 0, paid: 0, pending: 0, overdue: 0 }
  );
}

/**
 * Render the main dashboard overview
 */
function renderDashboard() {
  const totals = getTotals();
  $("#statTenants").textContent = tenants.length;
  $("#navTenantCount").textContent = tenants.length;
  $("#statProperties").textContent = properties.length;
  $("#statCollected").textContent = money(totals.paid);
  $("#statPending").textContent = money(totals.pending + totals.overdue);
  $("#collectedLarge").textContent = money(totals.paid);

  const rate = totals.expected ? Math.round((totals.paid / totals.expected) * 100) : 0;
  $("#collectionRate").textContent = `${rate}%`;
  $("#collectionProgress").style.width = `${rate}%`;

  const recent = [...tenants].slice(-5).reverse();
  $("#recentTenantRows").innerHTML = recent
    .map((tenant, idx) => {
      return `<tr>
      <td>${tenantCell(tenant, idx)}</td>
      <td>${escapeHTML(tenant.property)}<br><span class="muted">${escapeHTML(tenant.unit)}</span></td>
      <td>${money(tenant.rent)}</td>
      <td>${statusBadge(tenant.status)}</td>
      <td><button class="small-action" data-edit="${escapeHTML(tenant.id)}">Edit</button></td>
    </tr>`;
    })
    .join("");

  $("#recentEmpty").classList.toggle("hidden", recent.length > 0);
}

/**
 * Render the full tenants directory with search & status filters
 */
function renderTenants() {
  const query = ($("#tenantSearch").value || "").trim().toLowerCase();
  const status = $("#statusFilter").value;

  const filtered = tenants.filter((tenant) => {
    const haystack = [tenant.name, tenant.email, tenant.phone, tenant.property, tenant.unit]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query) && (status === "all" || tenant.status === status);
  });

  $("#tenantCountLabel").textContent = filtered.length;
  $("#tenantRows").innerHTML = filtered
    .map((tenant, idx) => {
      return `<tr>
      <td>${tenantCell(tenant, idx)}</td>
      <td>${escapeHTML(tenant.property)}<br><span class="muted">${escapeHTML(tenant.unit)}</span></td>
      <td>${escapeHTML(tenant.phone)}</td>
      <td>${money(tenant.rent)}</td>
      <td>${statusBadge(tenant.status)}</td>
      <td>
        <div class="row-actions">
          <button class="small-action" data-edit="${escapeHTML(tenant.id)}">Edit</button>
          <button class="small-action" data-delete="${escapeHTML(tenant.id)}">Delete</button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  $("#tenantEmpty").classList.toggle("hidden", filtered.length > 0);
}

/**
 * Render the payments register table
 */
function renderPayments() {
  const totals = getTotals();
  $("#paymentExpected").textContent = money(totals.expected);
  $("#paymentPaid").textContent = money(totals.paid);
  $("#paymentPending").textContent = money(totals.pending);
  $("#paymentOverdue").textContent = money(totals.overdue);

  $("#paymentRows").innerHTML = tenants
    .map((tenant, idx) => {
      const action =
        tenant.status === "Paid"
          ? `<button class="small-action" data-set-status="${escapeHTML(tenant.id)}" data-status="Pending">Mark pending</button>`
          : `<button class="small-action" data-set-status="${escapeHTML(tenant.id)}" data-status="Paid">Mark paid</button>`;

      return `<tr>
      <td>${tenantCell(tenant, idx)}</td>
      <td>${escapeHTML(tenant.property)}<br><span class="muted">${escapeHTML(tenant.unit)}</span></td>
      <td>October 2026</td>
      <td>${money(tenant.rent)}</td>
      <td>${statusBadge(tenant.status)}</td>
      <td>${action}</td>
    </tr>`;
    })
    .join("");

  $("#paymentEmpty").classList.toggle("hidden", tenants.length > 0);
}

/**
 * Dynamically populate the Property dropdown inside the Tenant modal form
 */
function updateTenantPropertyDropdown(selectedPropertyName = "") {
  const select = $("#tenantProperty");
  if (!select) return;

  const options = ['<option value="">Choose property</option>'];
  const knownNames = new Set();

  properties.forEach((p) => {
    knownNames.add(p.name);
    options.push(`<option value="${escapeHTML(p.name)}">${escapeHTML(p.name)}</option>`);
  });

  // Preserve selected property even if not yet in properties list
  if (selectedPropertyName && !knownNames.has(selectedPropertyName)) {
    options.push(`<option value="${escapeHTML(selectedPropertyName)}" selected>${escapeHTML(selectedPropertyName)}</option>`);
  }

  select.innerHTML = options.join("");
  if (selectedPropertyName) {
    select.value = selectedPropertyName;
  }
}

/**
 * Render real property cards with calculated occupancy from actual tenant records
 */
function renderProperties() {
  const grid = $("#propertyGrid");
  const emptyState = $("#propertyEmpty");
  if (!grid) return;

  if (properties.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  const visualThemes = ["visual-one", "visual-two", "visual-three"];

  grid.innerHTML = properties
    .map((prop, idx) => {
      const theme = visualThemes[idx % visualThemes.length];
      const propName = prop.name || "Untitled Property";

      // Calculate real occupancy directly from assigned tenants
      const assignedTenants = tenants.filter(
        (t) => t.property && t.property.trim().toLowerCase() === propName.trim().toLowerCase()
      );
      const occupiedUnits = assignedTenants.length;
      const totalUnits = Number(prop.totalUnits) || 0;
      const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
      const occupancyRate = totalUnits > 0 ? Math.min(100, Math.round((occupiedUnits / totalUnits) * 100)) : 0;

      // Calculate real average rent from assigned tenants
      const avgRent =
        occupiedUnits > 0
          ? Math.round(assignedTenants.reduce((sum, t) => sum + (Number(t.rent) || 0), 0) / occupiedUnits)
          : 0;

      return `
      <article class="property-card">
        <div class="property-visual ${theme}">
          <span>${escapeHTML(prop.propertyType ? prop.propertyType.toUpperCase() : "RESIDENTIAL")}</span>
          <div class="building-art">▥</div>
        </div>
        <div class="property-info">
          <div class="property-title">
            <h3>${escapeHTML(prop.name)}</h3>
            <span class="property-status">Active</span>
          </div>
          <p class="muted small">${escapeHTML(prop.address || "No address specified")}</p>
          <div class="property-metrics">
            <div><strong>${totalUnits}</strong><span>Units</span></div>
            <div><strong>${occupiedUnits}</strong><span>Occupied</span></div>
            <div><strong>${vacantUnits}</strong><span>Vacant</span></div>
            <div><strong>${avgRent > 0 ? money(avgRent) : "—"}</strong><span>Avg. rent</span></div>
          </div>
          <div class="property-progress"><span style="width:${occupancyRate}%"></span></div>
          <small class="muted">${occupancyRate}% occupied (${vacantUnits} vacant)</small>
          <div class="property-actions">
            <button class="small-action" data-edit-property="${escapeHTML(prop.id)}">Edit</button>
            <button class="small-action" data-delete-property="${escapeHTML(prop.id)}">Delete</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

/**
 * Re-render all views
 */
function renderAll() {
  renderDashboard();
  renderTenants();
  renderPayments();
  renderProperties();
}

/**
 * Show placeholder while fetching data from backend
 */
function renderLoadingState() {
  const loadingHtml = `<tr><td colspan="6" style="text-align:center; padding: 26px; color: var(--muted);">Loading records from backend...</td></tr>`;
  $("#recentTenantRows").innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 26px; color: var(--muted);">Loading records from backend...</td></tr>`;
  $("#tenantRows").innerHTML = loadingHtml;
  $("#paymentRows").innerHTML = loadingHtml;
  $("#propertyGrid").innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--muted);">Loading property portfolio...</div>`;
}

/**
 * Show error state if backend is unreachable
 */
function renderErrorState(message) {
  const errorHtml = `<tr><td colspan="6" style="text-align:center; padding: 26px; color: var(--red);">
    <strong>Unable to connect to backend:</strong> ${escapeHTML(message)}<br>
    <small style="color: var(--muted); margin-top: 6px; display:inline-block;">Make sure Spring Boot is running on http://localhost:8080</small>
  </td></tr>`;

  $("#recentTenantRows").innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 26px; color: var(--red);">Backend unreachable.</td></tr>`;
  $("#tenantRows").innerHTML = errorHtml;
  $("#paymentRows").innerHTML = errorHtml;
  $("#propertyGrid").innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--red);">Unable to load properties from backend.</div>`;

  const statusPill = $("#workspaceStatusLabel");
  if (statusPill) statusPill.textContent = "Backend Offline";
  const liveDot = $("#liveDot");
  if (liveDot) liveDot.style.background = "var(--red)";
}

/**
 * Fetch all properties from Spring Boot: GET /api/properties
 */
async function fetchProperties() {
  try {
    const response = await fetch(PROPERTY_API_BASE_URL);
    if (!response.ok) {
      throw new Error(`Properties API returned HTTP ${response.status}`);
    }
    properties = await response.json();
    renderProperties();
    updateTenantPropertyDropdown();
  } catch (error) {
    console.error("Failed to load properties:", error);
  }
}

/**
 * Fetch all tenants and properties from Spring Boot
 */
async function fetchAllData() {
  renderLoadingState();
  try {
    const [tenantRes, propRes] = await Promise.all([
      fetch(API_BASE_URL),
      fetch(PROPERTY_API_BASE_URL)
    ]);

    if (!tenantRes.ok) {
      throw new Error(`Tenants API returned HTTP ${tenantRes.status}`);
    }
    if (!propRes.ok) {
      throw new Error(`Properties API returned HTTP ${propRes.status}`);
    }

    tenants = await tenantRes.json();
    properties = await propRes.json();

    renderAll();
    updateTenantPropertyDropdown();

    const statusPill = $("#workspaceStatusLabel");
    if (statusPill) statusPill.textContent = "Connected to API";
    const liveDot = $("#liveDot");
    if (liveDot) liveDot.style.background = "var(--green)";
  } catch (error) {
    console.error("Failed to load initial data from backend:", error);
    renderErrorState(error.message || "Failed to fetch");
    showToast("Could not connect to backend server. Make sure Spring Boot is running on port 8080.", true);
  }
}

/**
 * Switch page navigation
 */
function showPage(page) {
  const validPages = ["dashboard", "tenants", "properties", "payments"];
  if (!validPages.includes(page)) return;
  $$(".page-section").forEach((section) =>
    section.classList.toggle("active", section.id === `page-${page}`)
  );
  $$(".nav-link").forEach((link) =>
    link.classList.toggle("active", link.dataset.page === page)
  );
  $("#breadcrumbPage").textContent = {
    dashboard: "Dashboard",
    tenants: "Tenants",
    properties: "Properties",
    payments: "Rent & Payments"
  }[page];
  $("#sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Open tenant modal (for add or edit)
 */
function openModal(tenant = null) {
  $("#tenantForm").reset();
  $("#formError").classList.add("hidden");
  $("#tenantId").value = tenant?.id != null ? tenant.id : "";
  $("#modalTitle").textContent = tenant ? "Edit tenant" : "Add new tenant";
  $("#saveTenant").textContent = tenant ? "Save changes" : "Save tenant";
  $("#saveTenant").disabled = false;

  updateTenantPropertyDropdown(tenant?.property || "");

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

/**
 * Close tenant modal
 */
function closeModal() {
  $("#tenantModal").classList.add("hidden");
  document.body.style.overflow = "";
}

/**
 * Open property modal (for add or edit)
 */
function openPropertyModal(property = null) {
  $("#propertyForm").reset();
  $("#propertyFormError").classList.add("hidden");
  $("#propertyId").value = property?.id != null ? property.id : "";
  $("#propertyModalTitle").textContent = property ? "Edit property" : "Add new property";
  $("#saveProperty").textContent = property ? "Save changes" : "Save property";
  $("#saveProperty").disabled = false;

  $("#propertyName").value = property?.name || "";
  $("#propertyAddress").value = property?.address || "";
  $("#propertyType").value = property?.propertyType || "Residential";
  $("#propertyTotalUnits").value = property?.totalUnits ?? "";
  $("#propertyDescription").value = property?.description || "";

  $("#propertyModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#propertyName").focus(), 50);
}

/**
 * Close property modal
 */
function closePropertyModal() {
  $("#propertyModal").classList.add("hidden");
  document.body.style.overflow = "";
}

/**
 * Show temporary toast message
 */
function showToast(message, isError = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("error");
  }, 3400);
}

/**
 * Show error inside the tenant modal form
 */
function showFormError(message) {
  $("#formError").textContent = message;
  $("#formError").classList.remove("hidden");
}

/**
 * Show error inside the property modal form
 */
function showPropertyFormError(message) {
  $("#propertyFormError").textContent = message;
  $("#propertyFormError").classList.remove("hidden");
}

/**
 * Handle Add/Edit Tenant form submission: POST or PUT /api/tenants
 */
async function handleTenantSubmit(event) {
  event.preventDefault();
  if (isSubmittingTenant) return;

  const id = $("#tenantId").value.trim();
  const name = $("#tenantName").value.trim();
  const email = $("#tenantEmail").value.trim();
  const phone = $("#tenantPhone").value.trim();
  const property = $("#tenantProperty").value;
  const unit = $("#tenantUnit").value.trim();
  const rent = Number($("#tenantRent").value);
  const status = $("#tenantStatus").value;

  // Client-side validations
  if (!name || !phone || !property || !unit || !Number.isFinite(rent) || rent <= 0) {
    showFormError("Please complete all required fields with valid values.");
    return;
  }

  // Check unit uniqueness in local list
  const hasConflict = tenants.some(
    (t) =>
      String(t.id) !== String(id) &&
      t.property.toLowerCase() === property.toLowerCase() &&
      t.unit.toLowerCase() === unit.toLowerCase()
  );
  if (hasConflict) {
    showFormError("A tenant record already uses this unit in the selected property. Please check the unit number.");
    return;
  }

  const payload = {
    name,
    email: email || null,
    phone,
    property,
    unit,
    rent,
    status
  };

  const saveButton = $("#saveTenant");
  const isEditing = Boolean(id);
  const originalButtonText = saveButton.textContent;

  try {
    isSubmittingTenant = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const url = isEditing ? `${API_BASE_URL}/${id}` : API_BASE_URL;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let message = "Failed to save tenant.";
      try {
        const errorData = await response.json();
        if (errorData?.message) message = errorData.message;
      } catch (_) {
        if (response.status === 409) {
          message = "A tenant already occupies this unit in the selected property.";
        } else if (response.status === 400) {
          message = "Invalid tenant details. Please check your inputs.";
        } else if (response.status === 404) {
          message = "Tenant record was not found on the server.";
        }
      }
      showFormError(message);
      return;
    }

    const savedTenant = await response.json();

    if (isEditing) {
      tenants = tenants.map((item) => (String(item.id) === String(id) ? savedTenant : item));
      showToast("Tenant details updated.");
    } else {
      tenants.unshift(savedTenant);
      showToast("Tenant added successfully.");
    }

    renderAll();
    closeModal();
  } catch (error) {
    console.error("Save tenant network failure:", error);
    showFormError("Network error: Could not connect to backend server at http://localhost:8080.");
  } finally {
    isSubmittingTenant = false;
    saveButton.disabled = false;
    saveButton.textContent = originalButtonText;
  }
}

/**
 * Handle Add/Edit Property form submission: POST or PUT /api/properties
 */
async function handlePropertySubmit(event) {
  event.preventDefault();
  if (isSubmittingProperty) return;

  const id = $("#propertyId").value.trim();
  const name = $("#propertyName").value.trim();
  const address = $("#propertyAddress").value.trim();
  const propertyType = $("#propertyType").value;
  const totalUnits = Number($("#propertyTotalUnits").value);
  const description = $("#propertyDescription").value.trim();

  // Client-side validations
  if (!name || !address || !propertyType || !Number.isInteger(totalUnits) || totalUnits <= 0) {
    showPropertyFormError("Please enter a valid property name, address, and positive unit count.");
    return;
  }

  // Check duplicate property name in local list
  const hasDuplicate = properties.some(
    (p) => String(p.id) !== String(id) && p.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (hasDuplicate) {
    showPropertyFormError(`A property named "${name}" already exists. Please choose a different name.`);
    return;
  }

  const payload = {
    name,
    address,
    propertyType,
    totalUnits,
    description: description || null
  };

  const saveButton = $("#saveProperty");
  const isEditing = Boolean(id);
  const originalButtonText = saveButton.textContent;

  try {
    isSubmittingProperty = true;
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const url = isEditing ? `${PROPERTY_API_BASE_URL}/${id}` : PROPERTY_API_BASE_URL;
    const method = isEditing ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let message = "Failed to save property.";
      try {
        const errorData = await response.json();
        if (errorData?.message) message = errorData.message;
      } catch (_) {
        if (response.status === 409) {
          message = `A property named "${name}" already exists in the database.`;
        } else if (response.status === 400) {
          message = "Invalid property details. Please verify your entries.";
        } else if (response.status === 404) {
          message = "Property record was not found on the server.";
        }
      }
      showPropertyFormError(message);
      return;
    }

    const savedProperty = await response.json();

    if (isEditing) {
      properties = properties.map((p) => (String(p.id) === String(id) ? savedProperty : p));
      showToast("Property details updated.");
    } else {
      properties.push(savedProperty);
      showToast("Property added successfully.");
    }

    renderProperties();
    renderDashboard();
    updateTenantPropertyDropdown();
    closePropertyModal();
  } catch (error) {
    console.error("Save property network failure:", error);
    showPropertyFormError("Network error: Could not connect to backend server at http://localhost:8080.");
  } finally {
    isSubmittingProperty = false;
    saveButton.disabled = false;
    saveButton.textContent = originalButtonText;
  }
}

/**
 * Delete a tenant: DELETE /api/tenants/{id}
 */
async function deleteTenant(id) {
  const tenant = tenants.find((item) => String(item.id) === String(id));
  if (!tenant) return;

  const confirmed = window.confirm(
    `Delete the tenant record for ${tenant.name}? This will permanently remove it from the database.`
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      let message = "Failed to delete tenant.";
      try {
        const errorData = await response.json();
        if (errorData?.message) message = errorData.message;
      } catch (_) {}
      showToast(message, true);
      return;
    }

    tenants = tenants.filter((item) => String(item.id) !== String(id));
    renderAll();
    showToast("Tenant record deleted.");
  } catch (error) {
    console.error("Delete tenant network failure:", error);
    showToast("Network error: Could not reach backend server.", true);
  }
}

/**
 * Delete a property safely: DELETE /api/properties/{id}
 * Rejects deletion if tenants are currently assigned to this property.
 */
async function deleteProperty(id) {
  const property = properties.find((p) => String(p.id) === String(id));
  if (!property) return;

  // Check client-side first for immediate user clarity
  const assignedCount = tenants.filter(
    (t) => t.property && t.property.trim().toLowerCase() === property.name.trim().toLowerCase()
  ).length;

  if (assignedCount > 0) {
    showToast(
      `Cannot delete "${property.name}" because ${assignedCount} tenant(s) are currently assigned to it. Please reassign or delete the tenants first.`,
      true
    );
    return;
  }

  const confirmed = window.confirm(
    `Delete property "${property.name}"? This action cannot be undone.`
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`${PROPERTY_API_BASE_URL}/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      let message = "Failed to delete property.";
      try {
        const errorData = await response.json();
        if (errorData?.message) message = errorData.message;
      } catch (_) {
        if (response.status === 409) {
          message = `Cannot delete property "${property.name}": tenants are currently assigned to it.`;
        }
      }
      showToast(message, true);
      return;
    }

    properties = properties.filter((p) => String(p.id) !== String(id));
    renderProperties();
    renderDashboard();
    updateTenantPropertyDropdown();
    showToast("Property deleted successfully.");
  } catch (error) {
    console.error("Delete property network failure:", error);
    showToast("Network error: Could not reach backend server.", true);
  }
}

/**
 * Update payment status: PATCH /api/tenants/{id}/status
 */
async function updateStatus(id, status) {
  if (!["Paid", "Pending", "Overdue"].includes(status)) return;

  try {
    const response = await fetch(`${API_BASE_URL}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      let message = "Failed to update payment status.";
      try {
        const errorData = await response.json();
        if (errorData?.message) message = errorData.message;
      } catch (_) {}
      showToast(message, true);
      return;
    }

    const updated = await response.json();
    tenants = tenants.map((item) => (String(item.id) === String(id) ? updated : item));
    renderAll();
    showToast(`Payment status changed to ${status.toLowerCase()}.`);
  } catch (error) {
    console.error("Status update network failure:", error);
    showToast("Network error: Could not reach backend server.", true);
  }
}

// Global click event delegation
document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-page]");
  if (nav) showPage(nav.dataset.page);

  const goto = event.target.closest("[data-goto]");
  if (goto) showPage(goto.dataset.goto);

  const editTenantBtn = event.target.closest("[data-edit]");
  if (editTenantBtn) {
    const tenant = tenants.find((item) => String(item.id) === String(editTenantBtn.dataset.edit));
    if (tenant) openModal(tenant);
  }

  const deleteTenantBtn = event.target.closest("[data-delete]");
  if (deleteTenantBtn) {
    deleteTenant(deleteTenantBtn.dataset.delete);
  }

  const statusButton = event.target.closest("[data-set-status]");
  if (statusButton) {
    updateStatus(statusButton.dataset.setStatus, statusButton.dataset.status);
  }

  const editPropBtn = event.target.closest("[data-edit-property]");
  if (editPropBtn) {
    const property = properties.find((p) => String(p.id) === String(editPropBtn.dataset.editProperty));
    if (property) openPropertyModal(property);
  }

  const deletePropBtn = event.target.closest("[data-delete-property]");
  if (deletePropBtn) {
    deleteProperty(deletePropBtn.dataset.deleteProperty);
  }
});

// Event listeners for Tenant modal
$("#addTenantTop").addEventListener("click", () => openModal());
$("#quickAddTenant").addEventListener("click", () => openModal());
$("#addTenantPage").addEventListener("click", () => openModal());
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
$("#tenantModal").addEventListener("click", (event) => {
  if (event.target === $("#tenantModal")) closeModal();
});
$("#tenantForm").addEventListener("submit", handleTenantSubmit);

// Event listeners for Property modal
const addPropertyBtn = $("#addPropertyBtn");
if (addPropertyBtn) addPropertyBtn.addEventListener("click", () => openPropertyModal());
const closePropertyBtn = $("#closePropertyModal");
if (closePropertyBtn) closePropertyBtn.addEventListener("click", closePropertyModal);
const cancelPropertyBtn = $("#cancelPropertyModal");
if (cancelPropertyBtn) cancelPropertyBtn.addEventListener("click", closePropertyModal);
const propertyModal = $("#propertyModal");
if (propertyModal) {
  propertyModal.addEventListener("click", (event) => {
    if (event.target === propertyModal) closePropertyModal();
  });
}
const propertyForm = $("#propertyForm");
if (propertyForm) propertyForm.addEventListener("submit", handlePropertySubmit);

// Event listeners for filters and controls
$("#tenantSearch").addEventListener("input", renderTenants);
$("#statusFilter").addEventListener("change", renderTenants);
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#notificationBtn").addEventListener("click", () => showToast("You're all caught up."));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!$("#tenantModal").classList.contains("hidden")) closeModal();
    if (propertyModal && !propertyModal.classList.contains("hidden")) closePropertyModal();
  }
});

// Load tenant list and property portfolio on page open
fetchAllData();
