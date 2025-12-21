// ========= CONFIG =========

// READ from Google Sheet (CSV)
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS29RQ3ruKvonaTYjkci1Qg7-JuWfQamcW9i_yQIJZJxNoJOT6Y3Mp088gctObbK-nwlS3b84Wd3oEb/pub?output=csv";

// WRITE to Google Apps Script
const apiURL =
  "https://script.google.com/macros/s/AKfycbxZ2RezEOeSIpH2dVtYPBUQe-67PZwPkvbf-ZIYmU2BTuiV77baU_jqwIS2-DsPeZ5S/exec";

// ========= STATE =========
let allSlots = [];
let selectedSlot = null;

// ========= LOAD DATA =========
fetch(sheetURL)
  .then(res => res.text())
  .then(csv => {
    const rows = csv.split("\n").slice(1);
    const places = new Set();

    allSlots = [];

    rows.forEach(row => {
      if (!row.trim()) return;

      const cells = row.split(",");

      const slot = {
        id: cells[0]?.trim(),
        area: cells[1]?.trim(),
        status: cells[2]?.trim()
      };

      allSlots.push(slot);
      places.add(slot.area);
    });

    populateDropdown([...places]);
    displaySlots(allSlots);
  });

// ========= DROPDOWN =========
function populateDropdown(places) {
  const dropdown = document.getElementById("placeFilter");
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
    div.className = `slot ${slot.status.toLowerCase()}`;

    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${slot.area}</p>
      <p>Status: ${slot.status}</p>
      ${
        slot.status === "Available"
          ? `<button onclick="reserveSlot('${slot.id}')">Reserve</button>`
          : ""
      }
    `;

    container.appendChild(div);
  });
}

// ========= RESERVE =========
function reserveSlot(slotId) {
  selectedSlot = allSlots.find(s => s.id === slotId);

  // show booking form
  document.getElementById("formSlotId").value = selectedSlot.id;
  document.getElementById("bookingForm").style.display = "block";

  // store selected slot id for UI update
  window.currentSlotId = slotId;
}

function bookingCompleted() {
  alert("✅ Booking confirmed successfully!");

  // update slot status locally (frontend only)
  const slot = allSlots.find(s => s.id === window.currentSlotId);
  if (slot) {
    slot.status = "Reserved";
  }

  // hide booking form
  document.getElementById("bookingForm").style.display = "none";

  // re-render slots to update color and button
  displaySlots(allSlots);
}

