// ========= CONFIG =========

// Google Sheet CSV (initial snapshot only)
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

// Reservation expiry (30 minutes)
const RESERVATION_DURATION = 30 * 60 * 1000;

// ========= STATE =========
let allSlots = [];
let selectedSlotId = null;
let currentPlace = "";

// Load reservations
let bookedSlots = JSON.parse(localStorage.getItem("bookedSlots") || "{}");

// ========= CLEAN EXPIRED BOOKINGS =========
function cleanExpiredBookings() {
  const now = Date.now();
  let changed = false;

  Object.keys(bookedSlots).forEach(id => {
    if (now - bookedSlots[id].reservedAt > RESERVATION_DURATION) {
      delete bookedSlots[id];
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));
  }
}

// ========= LOAD FROM SHEET (ONLY SNAPSHOT) =========
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
    });
}

// ========= DISPLAY =========
function displaySlots(slots) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.className = `slot ${slot.finalState}`;

    let label =
      slot.finalState === "occupied"
        ? "Occupied"
        : slot.finalState === "reserved"
        ? "Reserved"
        : "Available";

    let button = "";
    if (slot.finalState === "available") {
      button = `<button onclick="reserveSlot('${slot.id}')">Reserve</button>`;
    }
    if (slot.finalState === "reserved") {
      button = `<button onclick="unreserveSlot('${slot.id}')">Unreserve</button>`;
    }

    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${currentPlace}</p>
      <p>Status: ${label}</p>
      ${button}
    `;

    container.appendChild(div);
  });
}

// ========= RESERVE =========
function reserveSlot(slotId) {
  selectedSlotId = slotId;
  document.getElementById("bookingForm").style.display = "block";
}

// ========= CONFIRM BOOKING =========
function submitBooking() {
  const name = document.getElementById("userName").value;
  const time = document.getElementById("reserveTime").value;

  if (!name || !time || !selectedSlotId) {
    alert("❌ Please fill all details");
    return;
  }

  // Save booking
  bookedSlots[selectedSlotId] = {
    name,
    time,
    reservedAt: Date.now()
  };
  localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));

  // 🔥 UPDATE SLOT STATE LOCALLY (KEY FIX)
  allSlots = allSlots.map(slot =>
    slot.id === selectedSlotId
      ? { ...slot, finalState: "reserved" }
      : slot
  );

  alert("✅ Booking Confirmed");
  document.getElementById("bookingForm").style.display = "none";

  displaySlots(allSlots); // ✅ color changes instantly
}

// ========= UNRESERVE =========
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

// ========= INIT =========
loadSlotData();
