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

// ========= LOAD SLOT DATA =========
function loadSlotData() {
  // 🔥 Cache-busting added here
  fetch(sheetURL + "&t=" + new Date().getTime())
    .then(res => res.text())
    .then(csv => {
      const rows = csv.trim().split("\n");
      if (rows.length < 2) return;

      const cells = rows[1].split(",");

      currentPlace = cells[0];

      allSlots = [
        { id: "Slot 1", area: currentPlace, status: cells[1], booked: cells[2] },
        { id: "Slot 2", area: currentPlace, status: cells[3], booked: cells[4] },
        { id: "Slot 3", area: currentPlace, status: cells[5], booked: cells[6] },
        { id: "Slot 4", area: currentPlace, status: cells[7], booked: cells[8] }
      ];

      populateDropdown([currentPlace]);
      displaySlots(allSlots);
    })
    .catch(err => console.error("CSV fetch error:", err));
}

// ========= DROPDOWN =========
function populateDropdown(places) {
  const dropdown = document.getElementById("placeFilter");

  // prevent re-adding options on every refresh
  if (dropdown.options.length > 1) return;

  dropdown.innerHTML = `<option value="All">All Places</option>`;

  places.forEach(place => {
    const option = document.createElement("option");
    option.value = place;
    option.textContent = place;
    dropdown.appendChild(option);
  });

  dropdown.onchange = () => {
    const value = dropdown.value;
    const filtered =
      value === "All"
        ? allSlots
        : allSlots.filter(s => s.area === value);

    displaySlots(filtered);
  };
}

// ========= DISPLAY =========
function displaySlots(slots) {
  const container = document.getElementById("slots");
  container.innerHTML = "";

  slots.forEach(slot => {
    const div = document.createElement("div");

    let statusClass = "available";
    let statusText = "Available";

    if (slot.booked === "YES") {
      statusClass = "reserved";
      statusText = "Reserved";
    } else if (slot.status === "FILLED") {
      statusClass = "occupied";
      statusText = "Occupied";
    }

    div.className = `slot ${statusClass}`;

    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${slot.area}</p>
      <p>Status: ${statusText}</p>
      ${
        statusClass === "available"
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

// ========= BOOKING CALLBACK =========
function bookingCompleted() {
  alert("✅ Booking confirmed!");

  // Immediate frontend update
  const slot = allSlots.find(s => s.id === selectedSlotId);
  if (slot) slot.booked = "YES";

  document.getElementById("bookingForm").style.display = "none";
  displaySlots(allSlots);
}

// ========= INITIAL LOAD =========
loadSlotData();

// ========= AUTO REFRESH =========
// ⏱ every 5 seconds (FAST but safe)
setInterval(loadSlotData, 5000);
