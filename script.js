// ========= CONFIG =========

// READ Google Sheet (CSV)
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

// WRITE Google Apps Script (booking)
const apiURL =
  "https://script.google.com/macros/s/AKfycbzKV2VN5xWNb3esWUBLBCnyXa5-iO-zBPDkhQ8AF0n947qwawG6wZJPlMKczjJTngx0XQ/exec";

// ========= STATE =========
let allSlots = [];
let selectedSlotId = null;
let currentPlace = null;

// Stabilization memory
let stableState = {};
let changeCounter = {};

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
        { id: "Slot 1", status: c[1], booked: c[2] },
        { id: "Slot 2", status: c[3], booked: c[4] },
        { id: "Slot 3", status: c[5], booked: c[6] },
        { id: "Slot 4", status: c[7], booked: c[8] }
      ];

      incoming.forEach(slot => {
        const key = slot.id;

        const rawState =
          slot.booked === "YES"
            ? "reserved"
            : slot.status === "FILLED"
            ? "occupied"
            : "available";

        if (!stableState[key]) {
          stableState[key] = rawState;
          changeCounter[key] = 0;
        }

        if (rawState !== stableState[key]) {
          changeCounter[key]++;
          if (changeCounter[key] >= 2) {
            stableState[key] = rawState;
            changeCounter[key] = 0;
          }
        } else {
          changeCounter[key] = 0;
        }

        slot.finalState = stableState[key];
        slot.area = currentPlace;
      });

      allSlots = incoming;
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

  dropdown.onchange = () => displaySlots(allSlots);
}

// ========= DISPLAY =========
function displaySlots(slots) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  slots.forEach(slot => {
    const div = document.createElement("div");

    let label = "Available";
    if (slot.finalState === "occupied") label = "Occupied";
    if (slot.finalState === "reserved") label = "Reserved";

    div.className = `slot ${slot.finalState}`;
    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${slot.area}</p>
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

// ========= SUBMIT BOOKING (BACKEND) =========
function submitBooking(event) {
  event.preventDefault();

  if (!selectedSlotId) {
    alert("No slot selected");
    return;
  }

  fetch(apiURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotId: selectedSlotId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        bookingCompleted();
      } else {
        alert("❌ Booking failed");
        console.error(data);
      }
    })
    .catch(err => {
      console.error("Booking error:", err);
      alert("❌ Backend error");
    });
}

// ========= BOOKING CALLBACK =========
function bookingCompleted() {
  alert("✅ Booking confirmed!");

  stableState[selectedSlotId] = "reserved";

  document.getElementById("bookingForm").style.display = "none";
  displaySlots(allSlots);
}

// ========= INIT =========
loadSlotData();
setInterval(loadSlotData, 15000);
