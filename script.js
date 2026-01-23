// ======================================
// CONFIG
// ======================================

// Base Google Sheet CSV URL (ENTIRE DOCUMENT PUBLISHED)
const BASE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

// Google Apps Script Web App URL
const backendURL =
  "https://script.google.com/macros/s/AKfycbxLBqdNTuYFRhR56ND-_vSa7YYnPHgwpuerGBmTlKp5ybJHmcHRy6jBue4DqjF0Yv9noQ/exec";

// Reservation expiry (30 minutes)
const RESERVATION_DURATION = 30 * 60 * 1000;

// ======================================
// STATE
// ======================================
let allSlots = [];
let selectedSlotId = null;
let currentPlace = "";

// Load reservation memory
let bookedSlots = JSON.parse(localStorage.getItem("bookedSlots") || "{}");

// ======================================
// GET SHEET NAME FROM URL
// ======================================
function getSheetName() {
  const params = new URLSearchParams(window.location.search);
  return params.get("sheet") || "Sheet1"; // default
}

const SHEET_NAME = getSheetName();
const sheetURL =
  `${BASE_SHEET_URL}&sheet=${encodeURIComponent(SHEET_NAME)}`;

// ======================================
// CLEAN EXPIRED RESERVATIONS
// ======================================
function cleanExpiredBookings() {
  const now = Date.now();
  let changed = false;

  Object.keys(bookedSlots).forEach(slotId => {
    if (now - bookedSlots[slotId].reservedAt > RESERVATION_DURATION) {
      delete bookedSlots[slotId];
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));
  }
}

// ======================================
// LOAD SLOT DATA (DYNAMIC SLOT COUNT)
// ======================================
function loadSlotData() {
  cleanExpiredBookings();

  fetch(sheetURL + "&nocache=" + Date.now(), { cache: "no-store" })
    .then(res => res.text())
    .then(csv => {
      const rows = csv.trim().split("\n");
      if (rows.length < 2) return;

      const cells = rows[1].split(",");
      currentPlace = cells[0];

      // Slots start from column B onwards
      const slotStatuses = cells.slice(1);

      allSlots = slotStatuses.map((status, index) => {
        const slotId = `Slot ${index + 1}`;

        if (bookedSlots[slotId]) {
          return { id: slotId, finalState: "reserved" };
        }

        if (status === "FILLED") {
          return { id: slotId, finalState: "occupied" };
        }

        return { id: slotId, finalState: "available" };
      });

      displaySlots(allSlots);
    })
    .catch(err => console.error("CSV Load Error:", err));
}

// ======================================
// DISPLAY SLOTS
// ======================================
function displaySlots(slots) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  let free = 0;
  let busy = 0;
  let reserved = 0;

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.className = `slot ${slot.finalState}`;

    if (slot.finalState === "available") free++;
    if (slot.finalState === "occupied") busy++;
    if (slot.finalState === "reserved") reserved++;

    let label =
      slot.finalState === "occupied"
        ? "Occupied"
        : slot.finalState === "reserved"
        ? "Reserved"
        : "Available";

    let buttonHTML = "";
    if (slot.finalState === "available") {
      buttonHTML = `<button onclick="reserveSlot('${slot.id}')">Reserve</button>`;
    }
    if (slot.finalState === "reserved") {
      buttonHTML = `<button onclick="unreserveSlot('${slot.id}')">Unreserve</button>`;
    }

    div.innerHTML = `
      <div class="slot-inner">
        <h3>${slot.id}</h3>
        <p>${currentPlace}</p>
        <p>Status: ${label}</p>
        ${buttonHTML}
      </div>
    `;

    container.appendChild(div);
  });

  // Update counters
  document.getElementById("freeCount").innerText = free;
  document.getElementById("occupiedCount").innerText = busy;
  document.getElementById("reservedCount").innerText = reserved;
}

// ======================================
// RESERVE SLOT (OPEN MODAL)
// ======================================
function reserveSlot(slotId) {
  selectedSlotId = slotId;
  document.getElementById("bookingModal").style.display = "block";
}

function closeBooking() {
  document.getElementById("bookingModal").style.display = "none";
}

// ======================================
// CONFIRM BOOKING
// ======================================
function submitBooking() {
  const name = document.getElementById("userName").value;
  const time = document.getElementById("reserveTime").value;

  if (!name || !time || !selectedSlotId) {
    alert("❌ Please fill all details");
    return;
  }

  bookedSlots[selectedSlotId] = {
    name,
    time,
    reservedAt: Date.now(),
    sheet: SHEET_NAME
  };

  localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));

  // Optional backend logging
  fetch(backendURL, {
    method: "POST",
    body: JSON.stringify({
      source: "browser",
      sheet: SHEET_NAME,
      slotId: selectedSlotId,
      name,
      time
    })
  }).catch(() => {});

  allSlots = allSlots.map(slot =>
    slot.id === selectedSlotId
      ? { ...slot, finalState: "reserved" }
      : slot
  );

  closeBooking();
  alert("✅ Booking Confirmed");
  displaySlots(allSlots);
}

// ======================================
// UNRESERVE SLOT
// ======================================
function unreserveSlot(slotId) {
  if (!confirm(`Unreserve ${slotId}?`)) return;

  delete bookedSlots[slotId];
  localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));

  allSlots = allSlots.map(slot =>
    slot.id === slotId
      ? { ...slot, finalState: "available" }
      : slot
  );

  displaySlots(allSlots);
}

// ======================================
// INIT
// ======================================
loadSlotData();
