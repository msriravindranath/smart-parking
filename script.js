// ========= CONFIG =========

// Google Sheet CSV (initial state only)
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

// Reservation expiry (30 minutes)
const RESERVATION_DURATION = 30 * 60 * 1000;

// ========= STATE =========
let allSlots = [];
let selectedSlotId = null;
let currentPlace = "";

// 🔐 Load reservations
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

// ========= LOAD SLOT DATA (MANUAL / ONCE) =========
function loadSlotData() {
  cleanExpiredBookings();

  fetch(sheetURL + "&nocache=" + new Date().getTime(), {
    cache: "no-store"
  })
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
        // Reservation has highest priority
        if (bookedSlots[slot.id]) {
          return { ...slot, finalState: "reserved" };
        }

        // Sensor snapshot (initial)
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
  places.forEach(place => {
    const option = document.createElement("option");
    option.value = place;
    option.textContent = place;
    dropdown.appendChild(option);
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

    let buttonHTML = "";

    if (slot.finalState === "available") {
      buttonHTML = `<button onclick="reserveSlot('${slot.id}')">Reserve</button>`;
    }

    if (slot.finalState === "reserved") {
      buttonHTML = `<button onclick="unreserveSlot('${slot.id}')">Unreserve</button>`;
    }

    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${currentPlace}</p>
      <p>Status: ${label}</p>
      ${buttonHTML}
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

// ========= CONFIRM BOOKING =========
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

  alert("✅ Booking Confirmed (Valid for 30 minutes)");
  document.getElementById("bookingForm").style.display = "none";

  displaySlots(allSlots);
}

// ========= UNRESERVE =========
function unreserveSlot(slotId) {
  const confirmUnreserve = confirm(
    `Are you sure you want to unreserve ${slotId}?`
  );

  if (!confirmUnreserve) return;

  delete bookedSlots[slotId];
  localStorage.setItem("bookedSlots", JSON.stringify(bookedSlots));

  alert(`✅ ${slotId} is now available`);
  displaySlots(allSlots);
}

// ========= INIT =========
loadSlotData(); // load ONCE
