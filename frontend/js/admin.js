// Zenith '26 - Admin Operations Dashboard

let allEvents = [];
let allRegistrations = [];
let pendingDeleteId = null;

// Category color mappings
const catBadgeStyles = {
  Technical: "bg-cyan-950/80 text-cyan-300 border-cyan-800/80",
  Cultural: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-800/80",
  Sports: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
  Gaming: "bg-amber-950/80 text-amber-300 border-amber-800/80",
  Workshop: "bg-purple-950/80 text-purple-300 border-purple-800/80",
};

// DOM Elements
const statTotalEvents = document.getElementById("stat-total-events");
const statTotalRegistrations = document.getElementById("stat-total-registrations");
const statUtilization = document.getElementById("stat-utilization");
const statCapacitySubtext = document.getElementById("stat-capacity-subtext");
const statUpcomingEvents = document.getElementById("stat-upcoming-events");
const categoryBreakdownContainer = document.getElementById("category-breakdown-container");

const eventsTableBody = document.getElementById("events-table-body");
const eventsTableLoading = document.getElementById("events-table-loading");
const tabEventsBadge = document.getElementById("tab-events-badge");
const tabRegsBadge = document.getElementById("tab-regs-badge");

const regsTableBody = document.getElementById("regs-table-body");
const regsEmptyState = document.getElementById("regs-empty-state");
const regsLoadingState = document.getElementById("regs-loading-state");
const regFilterEvent = document.getElementById("reg-filter-event");
const rosterCountLabel = document.getElementById("roster-count-label");

const refreshBtn = document.getElementById("refresh-dashboard-btn");
const tabEventsBtn = document.getElementById("tab-events-btn");
const tabRegsBtn = document.getElementById("tab-regs-btn");
const tabEventsSection = document.getElementById("tab-events-section");
const tabRegsSection = document.getElementById("tab-regs-section");

// Add Event Modal Elements
const openAddEventBtn = document.getElementById("open-add-event-btn");
const mobileAddEventBtn = document.getElementById("mobile-add-event-btn");
const addEventModal = document.getElementById("add-event-modal");
const closeAddEventModalBtn = document.getElementById("close-add-event-modal-btn");
const addEventForm = document.getElementById("add-event-form");
const addEventAlert = document.getElementById("add-event-alert");

// Delete Confirm Modal Elements
const deleteConfirmModal = document.getElementById("delete-confirm-modal");
const deleteConfirmText = document.getElementById("delete-confirm-text");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupAddEventModal();
  setupDeleteModal();
  loadAllDashboardData();

  refreshBtn.addEventListener("click", () => {
    loadAllDashboardData();
  });

  regFilterEvent.addEventListener("change", () => {
    loadRegistrations(regFilterEvent.value ? parseInt(regFilterEvent.value) : null);
  });
});

// Setup tab navigation
function setupTabs() {
  tabEventsBtn.addEventListener("click", () => {
    tabEventsBtn.className = "px-4 py-2.5 text-sm font-bold border-b-2 border-violet-500 text-white flex items-center gap-2 cursor-pointer transition";
    tabRegsBtn.className = "px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer transition";
    tabEventsSection.classList.remove("hidden");
    tabRegsSection.classList.add("hidden");
  });

  tabRegsBtn.addEventListener("click", () => {
    tabRegsBtn.className = "px-4 py-2.5 text-sm font-bold border-b-2 border-violet-500 text-white flex items-center gap-2 cursor-pointer transition";
    tabEventsBtn.className = "px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer transition";
    tabRegsSection.classList.remove("hidden");
    tabEventsSection.classList.add("hidden");
  });
}

// Master load function
async function loadAllDashboardData() {
  await Promise.all([
    loadStats(),
    loadEvents(),
    loadRegistrations(),
  ]);
}

// 1. Fetch & render Stats from GET /api/stats
async function loadStats() {
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error("Failed to fetch stats");
    const stats = await res.json();

    statTotalEvents.textContent = stats.total_events;
    statTotalRegistrations.textContent = stats.total_registrations;
    statUtilization.textContent = `${stats.overall_utilization_pct}%`;
    statCapacitySubtext.textContent = `${stats.total_registrations} of ${stats.total_capacity} total seats`;
    statUpcomingEvents.textContent = stats.upcoming_events_count;
    tabRegsBadge.textContent = stats.total_registrations;

    // Render category cards
    renderCategoryBreakdown(stats.events_by_category, stats.total_events);
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

function renderCategoryBreakdown(categories, totalEvents) {
  categoryBreakdownContainer.innerHTML = "";

  Object.entries(categories).forEach(([cat, count]) => {
    const catStyle = catBadgeStyles[cat] || "bg-slate-800 text-slate-300 border-slate-700";
    const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;

    const div = document.createElement("div");
    div.className = "bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between";
    div.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold px-2 py-0.5 rounded-full border ${catStyle}">${cat}</span>
        <span class="text-sm font-bold text-white">${count}</span>
      </div>
      <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div class="bg-violet-500 h-full rounded-full" style="width: ${pct}%"></div>
      </div>
      <span class="text-[10px] text-slate-400 mt-1">${pct}% of fest events</span>
    `;
    categoryBreakdownContainer.appendChild(div);
  });
}

// 2. Fetch & render Events from GET /api/events
async function loadEvents() {
  eventsTableLoading.classList.remove("hidden");
  eventsTableBody.innerHTML = "";

  try {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to load events");
    allEvents = await res.json();

    tabEventsBadge.textContent = allEvents.length;
    eventsTableLoading.classList.add("hidden");

    // Populate registration filter dropdown
    populateEventFilterDropdown(allEvents);

    // Compute utilization & sort by utilization percentage DESC
    const sorted = allEvents.map((e) => {
      const registered = e.capacity - e.available_seats;
      const utilPct = e.capacity > 0 ? Math.round((registered / e.capacity) * 1000) / 10 : 0;
      return { ...e, registered, utilPct };
    }).sort((a, b) => b.utilPct - a.utilPct);

    // Render table rows
    renderEventsTable(sorted);

  } catch (err) {
    console.error("Error loading events table:", err);
    eventsTableLoading.innerHTML = `<span class="text-red-400">Error loading events: ${err.message}</span>`;
  }
}

function renderEventsTable(events) {
  eventsTableBody.innerHTML = "";

  events.forEach((event) => {
    const isCritical = event.utilPct >= 90;
    const catStyle = catBadgeStyles[event.category] || "bg-slate-800 text-slate-300 border-slate-700";

    const tr = document.createElement("tr");
    tr.className = isCritical
      ? "bg-red-950/20 hover:bg-red-950/30 transition-colors border-l-4 border-l-red-500"
      : "hover:bg-slate-700/30 transition-colors";

    tr.innerHTML = `
      <td class="py-3 px-4">
        <div class="flex items-center gap-2">
          <span class="text-xl">${event.icon || "⚡"}</span>
          <div>
            <div class="font-bold text-white">${event.title}</div>
            <div class="text-[11px] text-slate-400">${event.fee > 0 ? `₹${event.fee}` : 'Free event'}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-3">
        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border ${catStyle}">
          ${event.category}
        </span>
      </td>
      <td class="py-3 px-3 text-slate-300">
        <div>${event.event_date}</div>
        <div class="text-[11px] text-slate-400">${event.event_time}</div>
      </td>
      <td class="py-3 px-3 text-slate-300">${event.venue}</td>
      <td class="py-3 px-3 text-center">
        <span class="font-bold text-white">${event.registered}</span>
        <span class="text-slate-400">/ ${event.capacity}</span>
      </td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-2">
          <div class="w-16 bg-slate-700 h-1.5 rounded-full overflow-hidden hidden sm:block">
            <div class="${isCritical ? 'bg-red-500' : 'bg-emerald-500'} h-full rounded-full" style="width: ${Math.min(100, event.utilPct)}%"></div>
          </div>
          <span class="font-bold text-xs ${isCritical ? 'text-red-400 font-extrabold' : 'text-slate-200'}">
            ${event.utilPct}%
          </span>
        </div>
        ${isCritical ? '<span class="text-[10px] uppercase font-bold text-red-400 tracking-wider">⚠️ HIGH DEMAND</span>' : ''}
      </td>
    `;

    eventsTableBody.appendChild(tr);
  });
}

function populateEventFilterDropdown(events) {
  const currentVal = regFilterEvent.value;
  regFilterEvent.innerHTML = `<option value="">All Events (${events.length})</option>`;
  events.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev.id;
    opt.textContent = `${ev.title} (${ev.category})`;
    regFilterEvent.appendChild(opt);
  });
  if (currentVal) regFilterEvent.value = currentVal;
}

// 3. Fetch & render Registrations from GET /api/registrations
async function loadRegistrations(eventId = null) {
  regsLoadingState.classList.remove("hidden");
  regsEmptyState.classList.add("hidden");
  regsTableBody.innerHTML = "";

  try {
    const url = eventId ? `/api/registrations?event_id=${eventId}` : "/api/registrations";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load registrations");
    allRegistrations = await res.json();

    regsLoadingState.classList.add("hidden");
    rosterCountLabel.textContent = `Showing ${allRegistrations.length} registrations`;

    if (allRegistrations.length === 0) {
      regsEmptyState.classList.remove("hidden");
      return;
    }

    renderRegistrationsTable(allRegistrations);
  } catch (err) {
    console.error("Error loading registrations:", err);
    regsLoadingState.innerHTML = `<span class="text-red-400">Error loading roster: ${err.message}</span>`;
  }
}

function renderRegistrationsTable(registrations) {
  regsTableBody.innerHTML = "";

  registrations.forEach((reg) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-700/30 transition-colors";

    tr.innerHTML = `
      <td class="py-3 px-4 font-mono text-xs text-violet-400">#${reg.id}</td>
      <td class="py-3 px-3 font-bold text-white">${reg.student_name}</td>
      <td class="py-3 px-3 font-mono text-xs text-slate-300">${reg.roll_number}</td>
      <td class="py-3 px-3 text-slate-300">
        <div>${reg.email}</div>
        ${reg.phone ? `<div class="text-[11px] text-slate-400">${reg.phone}</div>` : ''}
      </td>
      <td class="py-3 px-3">
        <span class="inline-block px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200">
          ${reg.event_title}
        </span>
      </td>
      <td class="py-3 px-3 text-[11px] text-slate-400">${reg.registered_at}</td>
      <td class="py-3 px-3 text-right">
        <button 
          onclick="promptCancelRegistration(${reg.id}, '${reg.student_name.replace(/'/g, "\\'")}', '${reg.event_title.replace(/'/g, "\\'")}')"
          class="px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:text-white hover:bg-red-600/80 rounded border border-red-900/60 transition cursor-pointer"
        >
          Cancel
        </button>
      </td>
    `;

    regsTableBody.appendChild(tr);
  });
}

// Stretch Goal: Cancel Registration Flow
window.promptCancelRegistration = function (regId, studentName, eventTitle) {
  pendingDeleteId = regId;
  deleteConfirmText.innerHTML = `Are you sure you want to cancel the registration for <strong>${studentName}</strong> in <em>${eventTitle}</em>? This will free up 1 seat immediately.`;
  deleteConfirmModal.classList.remove("hidden");
};

function setupDeleteModal() {
  cancelDeleteBtn.addEventListener("click", () => {
    deleteConfirmModal.classList.add("hidden");
    pendingDeleteId = null;
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    if (!pendingDeleteId) return;

    try {
      confirmDeleteBtn.textContent = "Cancelling...";
      confirmDeleteBtn.disabled = true;

      const res = await fetch(`/api/registrations/${pendingDeleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Cancellation failed");
      }

      deleteConfirmModal.classList.add("hidden");
      pendingDeleteId = null;

      // Refresh both stats and registrations immediately
      await loadAllDashboardData();
    } catch (err) {
      alert(`Error cancelling registration: ${err.message}`);
    } finally {
      confirmDeleteBtn.textContent = "Confirm Cancel";
      confirmDeleteBtn.disabled = false;
    }
  });
}

// Stretch Goal: Add Event Flow
function setupAddEventModal() {
  const openModal = () => {
    addEventAlert.className = "hidden mb-3 p-2.5 rounded-lg text-xs font-semibold";
    addEventAlert.textContent = "";
    addEventForm.reset();
    document.getElementById("new-event-icon").value = "⚡";
    document.getElementById("new-event-date").value = "2026-11-14";
    document.getElementById("new-event-time").value = "10:00 AM";
    document.getElementById("new-event-capacity").value = "50";
    document.getElementById("new-event-fee").value = "0";
    addEventModal.classList.remove("hidden");
  };

  if (openAddEventBtn) openAddEventBtn.addEventListener("click", openModal);
  if (mobileAddEventBtn) mobileAddEventBtn.addEventListener("click", openModal);
  if (closeAddEventModalBtn) {
    closeAddEventModalBtn.addEventListener("click", () => {
      addEventModal.classList.add("hidden");
    });
  }

  addEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("new-event-title").value.trim();
    const category = document.getElementById("new-event-category").value;
    const icon = document.getElementById("new-event-icon").value.trim() || "⚡";
    const event_date = document.getElementById("new-event-date").value.trim();
    const event_time = document.getElementById("new-event-time").value.trim();
    const venue = document.getElementById("new-event-venue").value.trim();
    const capacity = parseInt(document.getElementById("new-event-capacity").value);
    const fee = parseInt(document.getElementById("new-event-fee").value) || 0;
    const description = document.getElementById("new-event-desc").value.trim();

    const submitBtn = document.getElementById("new-event-submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Event...";

    try {
      const payload = {
        title,
        category,
        icon,
        event_date,
        event_time,
        venue,
        capacity,
        fee,
        description,
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 201) {
        addEventAlert.className = "mb-3 p-2.5 rounded-lg text-xs font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300 block";
        addEventAlert.textContent = `Event "${data.title}" successfully added!`;
        addEventForm.reset();

        setTimeout(() => {
          addEventModal.classList.add("hidden");
          loadAllDashboardData();
        }, 1200);
      } else {
        throw new Error(data.detail || "Failed to create event");
      }
    } catch (err) {
      addEventAlert.className = "mb-3 p-2.5 rounded-lg text-xs font-semibold bg-red-950/80 border border-red-800 text-red-300 block";
      addEventAlert.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Event";
    }
  });
}
