// ========= CONFIG =========

// READ Google Sheet (CSV)
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

// ========= STATE =========
let allSlots = [];
let selectedSlotId = null;
let currentPlace = "";

// 🔐 Booking memory (VERY IMPORTANT)
const bookedSlots = new Set();

// ========= LOAD SLOT DATA =========
function loadSlotData() {
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
        // 🔒 Booking has top priority
        if (bookedSlots.has(slot.id)) {
          return { ...slot, finalState: "reserved" };
        }

        // Sensor update only if NOT booked
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

// ========= BOOKING (FRONTEND ONLY) =========
function submitBooking() {
  const name = document.getElementById("userName").value;
  const time = document.getElementById("reserveTime").value;

  if (!name || !time || !selectedSlotId) {
    alert("❌ Please fill all details");
    return;
  }

  // 🔒 Lock slot permanently (frontend)
  bookedSlots.add(selectedSlotId);

  alert("✅ Booking Confirmed!");

  document.getElementById("bookingForm").style.display = "none";
  displaySlots(allSlots);
}

// ========= INIT =========
loadSlotData();

// 🔁 Auto-refresh ONLY affects non-booked slots
setInterval(loadSlotData, 15000);
