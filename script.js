// ========= CONFIG =========

// READ Google Sheet (CSV)
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

// Reservation expiry time (30 mins)
const RESERVATION_DURATION = 30 * 60 * 1000;

// ========= STATE =========
let allSlots = [];
let selectedSlotId = null;
let currentPlace = "";

// 🔐 Persistent booking memory with time
let bookedSlots = JSON.parse(localStorage.getItem("bookedSlots") || "{}");

// ========= CLEAN EXPIRED BOOKINGS =========
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

// ========= LOAD SLOT DATA =========
function loadSlotData() {
  cleanExpiredBookings();

  fetch(sheetURL + "&t=" + Date.now())
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
        // 🔒 Booking check (with expiry)
        if (bookedSlots[slot.id]) {
          return { ...slot, finalState: "reserved" };
        }

        // Sensor-based update
        if (slot.status === "FILLED") {
          return { ...slot, finalState: "occupied" };
        }

        return { ...slot, finalState: "available" };
      });

      populateDropdown([currentPlace]);
      displaySlots(allSlots);
    })
    .catch(err => console.error("CSV error:", err));
}

// ========= DROPDOWN =========
function populateDropdown(places) {
  const dropdown = document.getElementById("placeFilter");
  if (dropdown.options.length > 1) return;

  dropdown.innerHTML = `<option value="All">All Places</option>`;
  places.forEach(p => {
    const o = document.createElement("option");
    o.value = p;
    o.textContent = p;
    dropdown.appendChild(o);
  });
}

// ========= DISPLAY =========
function displaySlots(slots) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  slots.forEach(slot => {
    let label = "Available";
    if (slot.finalState === "occupied") label = "Occupied";
    if (slot.finalState === "reserved") label = "Reserved";

    const div = document.createElement("div");
    div.className = `slot ${slot.finalState}`;

    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${currentPlace}</p>
      <p>Status: ${label}</p>
      ${
        slot.finalState === "available"
          ? `<button onclick="reserveSlot('${slot.id}')">Reserve</button>`
          : ""
      }
    `;

    container.appendChild(div);
  });
}

// ========= RESERVE =========
function reserveSlot(slotId) {
  selectedSlotId = slotId;
  document.getElementById("formSlotId").value = slotId;
  document.getElementById("bookingForm").style.display = "block";
}

// ========= BOOKING (FRONTEND ONLY + TIMED) =========
function submitBooking() {
  const name = document.getElementById("userName").value;
  const time = document.getElementById("reserveTime").value;

  if (!name || !time || !selectedSlotId) {
    alert("❌ Please fill all details");
    return;
  }

  // 🔒 Save booking with timestamp
  bookedSlots[selectedSlotId] = {
    name,
    time,
    reservedAt: Date.now()
  };

  localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));

  alert("✅ Booking Confirmed (Valid for 30 minutes)");

  document.getElementById("bookingForm").style.display = "none";
  displaySlots(allSlots);
}

// ========= INIT =========
loadSlotData();

// 🔁 Auto-refresh
setInterval(loadSlotData, 10000);
