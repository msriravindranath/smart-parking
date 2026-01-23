// ======================================
// CONFIG
// ======================================

// Google Sheet CSV (INITIAL SNAPSHOT ONLY)
const sheetURL =
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
// LOAD SLOT DATA (FROM SHEET)
// ======================================
function loadSlotData() {
  cleanExpiredBookings();

  fetch(sheetURL + "&nocache=" + Date.now(), { cache: "no-store" })
    .then(res => res.text())
    .then(csv => {
      const rows = csv.trim().split("\n");
      if (rows.length < 2) return;

      const c = rows[1].split(",");
      currentPlace = c[0];

      const incoming = [
        { id: "Slot 1", status: c[1] },
        { id: "Slot 2", status: c[3] },
        { id: "Slot 3", status: c[5] },
        { id: "Slot 4", status: c[7] }
      ];

      allSlots = incoming.map(slot => {
        if (bookedSlots[slot.id]) {
          return { ...slot, finalState: "reserved" };
        }
        if (slot.status === "FILLED") {
          return { ...slot, finalState: "occupied" };
        }
        return { ...slot, finalState: "available" };
      });

      displaySlots(allSlots);
    })
    .catch(err => console.error("CSV Load Error:", err));
}

// ======================================
// DISPLAY SLOTS (ANIMATION-SAFE)
// ======================================
function displaySlots(slots) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  let free = 0;
  let busy = 0;

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.className = `slot ${slot.finalState}`;

    let label =
      slot.finalState === "occupied"
        ? "Occupied"
        : slot.finalState === "reserved"
        ? "Reserved"
        : "Available";

    if (slot.finalState === "available") free++;
    if (slot.finalState === "occupied") busy++;

    let buttonHTML = "";
    if (slot.finalState === "available") {
      buttonHTML = `<button onclick="reserveSlot('${slot.id}')">Reserve</button>`;
    }
    if (slot.finalState === "reserved") {
      buttonHTML = `<button onclick="unreserveSlot('${slot.id}')">Unreserve</button>`;
    }

    // 🔥 IMPORTANT: slot-inner wrapper for animations
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

  // Update dashboard counters
  const freeEl = document.getElementById("freeCount");
  const busyEl = document.getElementById("occupiedCount");
  if (freeEl && busyEl) {
    freeEl.innerText = free;
    busyEl.innerText = busy;
  }
}

// ======================================
// RESERVE SLOT (OPEN FORM)
// ======================================
function reserveSlot(slotId) {
  selectedSlotId = slotId;
  document.getElementById("bookingForm").style.display = "block";
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
    reservedAt: Date.now()
  };
  localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));

  // Send reservation to backend
  fetch(backendURL, {
    method: "POST",
    body: JSON.stringify({
      source: "browser",
      slotId: selectedSlotId,
      name: name,
      time: time
    })
  }).catch(err => console.error("Backend error:", err));

  allSlots = allSlots.map(slot =>
    slot.id === selectedSlotId
      ? { ...slot, finalState: "reserved" }
      : slot
  );

  alert("✅ Booking Confirmed");
  document.getElementById("bookingForm").style.display = "none";
  displaySlots(allSlots);
}

// ======================================
// UNRESERVE SLOT
// ======================================
function unreserveSlot(slotId) {
  if (!confirm(`Unreserve ${slotId}?`)) return;

  delete bookedSlots[slotId];
  localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));

  fetch(backendURL, {
    method: "POST",
    body: JSON.stringify({
      source: "browser",
      slotId: slotId,
      name: "",
      time: ""
    })
  }).catch(() => {});

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
