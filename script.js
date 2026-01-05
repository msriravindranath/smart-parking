// ========= CONFIG =========
const sheetURL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

const apiURL =
  "https://script.google.com/macros/s/AKfycbznYNQTr_IbYnfhiI_EaBthHpNWLaXAlKlXESqMWRzW9z2v5PNtoQlJOlh_8djFAukkNQ/exec";

// ========= STATE =========
let allSlots = [];
let selectedSlotId = null;
let currentPlace = "";

// ========= LOAD DATA =========
function loadSlotData() {
  fetch(sheetURL + "&t=" + Date.now())
    .then(res => res.text())
    .then(csv => {
      const rows = csv.trim().split("\n");
      if (rows.length < 2) return;

      const c = rows[1].split(",");
      currentPlace = c[0];

      allSlots = [
        { id: "Slot 1", status: c[1], booked: c[2] },
        { id: "Slot 2", status: c[3], booked: c[4] },
        { id: "Slot 3", status: c[5], booked: c[6] },
        { id: "Slot 4", status: c[7], booked: c[8] }
      ];

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
    let state = "available";
    let label = "Available";

    if (slot.booked === "YES") {
      state = "reserved";
      label = "Reserved";
    } else if (slot.status === "FILLED") {
      state = "occupied";
      label = "Occupied";
    }

    const div = document.createElement("div");
    div.className = `slot ${state}`;

    div.innerHTML = `
      <h3>${slot.id}</h3>
      <p>${currentPlace}</p>
      <p>Status: ${label}</p>
      ${
        state === "available"
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

// ========= SUBMIT BOOKING =========
function submitBooking() {
  const name = document.getElementById("userName").value;
  const time = document.getElementById("reserveTime").value;

  if (!selectedSlotId || !name || !time) {
    alert("Fill all details");
    return;
  }

  fetch(apiURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slotId: selectedSlotId,
      name: name,
      time: time
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        alert("✅ Booking confirmed!");
        document.getElementById("bookingForm").style.display = "none";
        loadSlotData();
      } else {
        alert("❌ Booking failed");
        console.error(data);
      }
    })
    .catch(err => {
      console.error(err);
      alert("❌ Backend error");
    });
}

// ========= INIT =========
loadSlotData();
setInterval(loadSlotData, 15000);
