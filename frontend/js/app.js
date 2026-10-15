// Zenith '26 - Student Event Portal Client Application

let currentCategory = "All";
let currentSearch = "";
let searchDebounceTimer = null;
let allEventsCache = [];

// Category badge styling dictionary
const categoryStyles = {
  Technical: "bg-cyan-950/80 text-cyan-300 border-cyan-800/80",
  Cultural: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-800/80",
  Sports: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
  Gaming: "bg-amber-950/80 text-amber-300 border-amber-800/80",
  Workshop: "bg-purple-950/80 text-purple-300 border-purple-800/80",
};

// DOM Elements
const eventsGrid = document.getElementById("events-grid");
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const emptyState = document.getElementById("empty-state");
const retryBtn = document.getElementById("retry-btn");
const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const resetFiltersBtn = document.getElementById("reset-filters-btn");
const categoryFilterBtns = document.querySelectorAll(".filter-btn");

// Modal Elements
const eventModal = document.getElementById("event-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const modalIcon = document.getElementById("modal-event-icon");
const modalTitle = document.getElementById("modal-event-title");
const modalBadge = document.getElementById("modal-event-badge");
const modalDatetime = document.getElementById("modal-event-datetime");
const modalVenue = document.getElementById("modal-event-venue");
const modalFee = document.getElementById("modal-event-fee");
const modalSeats = document.getElementById("modal-event-seats");
const modalDesc = document.getElementById("modal-event-desc");
const registrationForm = document.getElementById("registration-form");
const regEventIdInput = document.getElementById("reg-event-id");
const regStudentName = document.getElementById("reg-student-name");
const regRollNumber = document.getElementById("reg-roll-number");
const regEmail = document.getElementById("reg-email");
const regPhone = document.getElementById("reg-phone");
const regSubmitBtn = document.getElementById("reg-submit-btn");
const modalFormAlert = document.getElementById("modal-form-alert");

// Inline error labels
const errStudentName = document.getElementById("err-student-name");
const errRollNumber = document.getElementById("err-roll-number");
const errEmail = document.getElementById("err-email");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  fetchEvents();
});

function setupEventListeners() {
  // Category buttons
  categoryFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selected = btn.dataset.category;
      if (currentCategory === selected) return;
      currentCategory = selected;

      // Update button visual styles
      categoryFilterBtns.forEach((b) => {
        if (b.dataset.category === currentCategory) {
          b.className = "filter-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-violet-600 text-white shadow-sm transition-all duration-150";
        } else {
          b.className = "filter-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all duration-150";
        }
      });

      fetchEvents();
    });
  });

  // Search input with 300ms debounce
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value.trim();
    if (currentSearch.length > 0) {
      clearSearchBtn.classList.remove("hidden");
    } else {
      clearSearchBtn.classList.add("hidden");
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      fetchEvents();
    }, 300);
  });

  // Clear search button
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearch = "";
    clearSearchBtn.classList.add("hidden");
    fetchEvents();
  });

  // Reset filters button
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      currentCategory = "All";
      currentSearch = "";
      searchInput.value = "";
      clearSearchBtn.classList.add("hidden");

      categoryFilterBtns.forEach((b) => {
        b.className = b.dataset.category === "All"
          ? "filter-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-violet-600 text-white shadow-sm transition-all duration-150"
          : "filter-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all duration-150";
      });

      fetchEvents();
    });
  }

  // Retry button
  retryBtn.addEventListener("click", () => {
    fetchEvents();
  });

  // Modal close handlers
  closeModalBtn.addEventListener("click", closeModal);
  eventModal.addEventListener("click", (e) => {
    if (e.target === eventModal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !eventModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // Form submit handler
  registrationForm.addEventListener("submit", handleRegistrationSubmit);
}

// Fetch events from API
async function fetchEvents() {
  showLoading(true);
  hideError();
  hideEmpty();
  eventsGrid.innerHTML = "";

  try {
    const params = new URLSearchParams();
    if (currentCategory && currentCategory !== "All") {
      params.append("category", currentCategory);
    }
    if (currentSearch) {
      params.append("search", currentSearch);
    }

    const url = `/api/events${params.toString() ? "?" + params.toString() : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    const events = await response.json();
    allEventsCache = events;
    showLoading(false);

    if (events.length === 0) {
      showEmpty();
    } else {
      renderEvents(events);
    }
  } catch (err) {
    console.error("Error fetching events:", err);
    showLoading(false);
    showError(err.message || "Failed to load events. Please verify the backend is running.");
  }
}

// Render event cards to grid
function renderEvents(events) {
  eventsGrid.innerHTML = "";

  events.forEach((event, idx) => {
    const isFull = event.available_seats === 0;
    const catClass = categoryStyles[event.category] || "bg-slate-800 text-slate-300 border-slate-700";
    const feeText = event.fee > 0 ? `₹${event.fee}` : "Free";
    
    const card = document.createElement("div");
    card.className = "bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-violet-500/50 rounded-2xl p-5 shadow-lg shadow-black/20 hover:shadow-violet-950/20 transition-all duration-200 flex flex-col justify-between group animate-fade-in";
    card.style.animationDelay = `${idx * 40}ms`;

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <span class="text-3xl p-2 bg-slate-900/80 rounded-xl border border-slate-700/60 shadow-inner group-hover:scale-105 transition-transform duration-200">
            ${event.icon || "⚡"}
          </span>
          <div class="flex flex-col items-end gap-1.5">
            <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${catClass}">
              ${event.category}
            </span>
            ${
              isFull
                ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/90 text-red-400 border border-red-800 uppercase tracking-wider">FULL</span>`
                : `<span class="text-[11px] font-medium text-emerald-400">${event.available_seats} seats left</span>`
            }
          </div>
        </div>

        <h3 class="text-lg font-bold text-white group-hover:text-violet-300 transition-colors line-clamp-1 mb-1">
          ${event.title}
        </h3>
        <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          ${event.description || "No description provided."}
        </p>
      </div>

      <div class="pt-4 border-t border-slate-700/60 space-y-3">
        <div class="grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-violet-400 text-sm">📅</span>
            <span class="truncate">${event.event_date.replace("2026-", "")} • ${event.event_time}</span>
          </div>
          <div class="flex items-center gap-1.5 truncate">
            <span class="text-violet-400 text-sm">📍</span>
            <span class="truncate" title="${event.venue}">${event.venue}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <div>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider block">Entry Fee</span>
            <span class="text-xs font-bold ${event.fee === 0 ? 'text-emerald-400' : 'text-amber-300'}">${feeText}</span>
          </div>

          <button 
            onclick="openEventDetail(${event.id})"
            class="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-violet-600/30 transition-all duration-150 active:scale-95 cursor-pointer"
          >
            View Details
          </button>
        </div>
      </div>
    `;

    eventsGrid.appendChild(card);
  });
}

// Open modal with event details
window.openEventDetail = async function (eventId) {
  // Reset form and alerts
  resetRegistrationForm();

  // Try finding from cache first for instant render
  let event = allEventsCache.find((e) => e.id === eventId);

  // Always fetch fresh event detail to ensure latest available_seats
  try {
    const res = await fetch(`/api/events/${eventId}`);
    if (res.ok) {
      event = await res.json();
    }
  } catch (err) {
    console.warn("Could not fetch latest event details, using cache:", err);
  }

  if (!event) return;

  regEventIdInput.value = event.id;
  modalIcon.textContent = event.icon || "⚡";
  modalTitle.textContent = event.title;
  modalDesc.textContent = event.description || "Join us for this exciting fest event!";
  modalDatetime.textContent = `${event.event_date} at ${event.event_time}`;
  modalVenue.textContent = event.venue;
  modalFee.textContent = event.fee > 0 ? `₹${event.fee}` : "Free";
  
  const catClass = categoryStyles[event.category] || "bg-slate-800 text-slate-300 border-slate-700";
  modalBadge.className = `inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1 border ${catClass}`;
  modalBadge.textContent = event.category;

  const isFull = event.available_seats === 0;
  if (isFull) {
    modalSeats.innerHTML = `<span class="text-red-400 font-bold">FULL (0 / ${event.capacity})</span>`;
    regSubmitBtn.disabled = true;
    regSubmitBtn.textContent = "Registration Closed (Full)";
  } else {
    modalSeats.innerHTML = `<span class="text-emerald-400 font-bold">${event.available_seats}</span> / ${event.capacity} seats`;
    regSubmitBtn.disabled = false;
    regSubmitBtn.textContent = "Confirm Registration";
  }

  eventModal.classList.remove("hidden");
};

function closeModal() {
  eventModal.classList.add("hidden");
  resetRegistrationForm();
}

function resetRegistrationForm() {
  registrationForm.reset();
  modalFormAlert.className = "hidden mb-4 p-3 rounded-xl text-xs font-medium";
  modalFormAlert.innerHTML = "";
  
  errStudentName.classList.add("hidden");
  errRollNumber.classList.add("hidden");
  errEmail.classList.add("hidden");
  
  regStudentName.classList.remove("border-red-500");
  regRollNumber.classList.remove("border-red-500");
  regEmail.classList.remove("border-red-500");
  
  regSubmitBtn.disabled = false;
  regSubmitBtn.textContent = "Confirm Registration";
}

// Handle form submission with client-side & server-side validation
async function handleRegistrationSubmit(e) {
  e.preventDefault();

  const eventId = parseInt(regEventIdInput.value);
  const studentName = regStudentName.value.trim();
  const rollNumber = regRollNumber.value.trim();
  const email = regEmail.value.trim();
  const phone = regPhone.value.trim();

  // Reset errors
  let hasClientError = false;
  errStudentName.classList.add("hidden");
  errRollNumber.classList.add("hidden");
  errEmail.classList.add("hidden");
  regStudentName.classList.remove("border-red-500");
  regRollNumber.classList.remove("border-red-500");
  regEmail.classList.remove("border-red-500");
  modalFormAlert.classList.add("hidden");

  // Client-side validation
  if (!studentName) {
    errStudentName.textContent = "Student name is required.";
    errStudentName.classList.remove("hidden");
    regStudentName.classList.add("border-red-500");
    hasClientError = true;
  }

  if (!rollNumber) {
    errRollNumber.textContent = "Roll / Student ID is required.";
    errRollNumber.classList.remove("hidden");
    regRollNumber.classList.add("border-red-500");
    hasClientError = true;
  }

  if (!email) {
    errEmail.textContent = "Email is required.";
    errEmail.classList.remove("hidden");
    regEmail.classList.add("border-red-500");
    hasClientError = true;
  } else if (!email.includes("@")) {
    errEmail.textContent = "Please enter a valid email containing '@'.";
    errEmail.classList.remove("hidden");
    regEmail.classList.add("border-red-500");
    hasClientError = true;
  }

  if (hasClientError) return;

  // Set submitting state
  regSubmitBtn.disabled = true;
  regSubmitBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Processing...
  `;

  try {
    const payload = {
      student_name: studentName,
      roll_number: rollNumber,
      email: email,
      phone: phone || null,
    };

    const response = await fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (response.status === 201) {
      // 201 Success
      modalFormAlert.className = "mb-4 p-3 rounded-xl text-xs font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center gap-2";
      modalFormAlert.innerHTML = `
        <span class="text-base">🎉</span>
        <span>Registered successfully! Confirmation ID #${responseData.id} for <strong>${modalTitle.textContent}</strong>.</span>
      `;
      modalFormAlert.classList.remove("hidden");

      regSubmitBtn.textContent = "Registered!";
      registrationForm.reset();

      // Refresh event data immediately on screen
      await fetchEvents();

      // Close modal automatically after 1.8 seconds
      setTimeout(() => {
        closeModal();
      }, 1800);

    } else {
      // Server returned error (400, 409, 404, etc.)
      const errorMsg = responseData.detail || "Registration failed. Please check your inputs.";
      modalFormAlert.className = "mb-4 p-3 rounded-xl text-xs font-semibold bg-red-950/80 border border-red-800 text-red-300 flex items-center gap-2";
      modalFormAlert.innerHTML = `
        <span class="text-base">❌</span>
        <span>${errorMsg}</span>
      `;
      modalFormAlert.classList.remove("hidden");

      regSubmitBtn.disabled = false;
      regSubmitBtn.textContent = "Try Again";
    }
  } catch (err) {
    console.error("Network or submission error:", err);
    modalFormAlert.className = "mb-4 p-3 rounded-xl text-xs font-semibold bg-red-950/80 border border-red-800 text-red-300 flex items-center gap-2";
    modalFormAlert.innerHTML = `
      <span class="text-base">⚠️</span>
      <span>Network error: Could not reach the server. Please try again.</span>
    `;
    modalFormAlert.classList.remove("hidden");
    regSubmitBtn.disabled = false;
    regSubmitBtn.textContent = "Confirm Registration";
  }
}

// UI State Helpers
function showLoading(show) {
  if (show) loadingState.classList.remove("hidden");
  else loadingState.classList.add("hidden");
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove("hidden");
}

function hideError() {
  errorState.classList.add("hidden");
}

function showEmpty() {
  emptyState.classList.remove("hidden");
}

function hideEmpty() {
  emptyState.classList.add("hidden");
}
