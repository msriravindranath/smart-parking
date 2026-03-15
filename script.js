const BACKEND_URL =
"https://script.google.com/macros/s/AKfycbz4Ft0e_B5ngJwlriDOlkfkGCPQw45os8p2CxsnJUUZOJy9-w__JTpkYJv5PpKYzuUNtQ/exec";

let selectedSlotId = null;
let allSlots = [];

/* ================= LOAD SLOT DATA ================= */

function loadSlotData() {

  const rowIndex = parseInt(localStorage.getItem("selectedRow"));

  if (!rowIndex) return;

  fetch(BACKEND_URL + "?action=getSlots")
    .then(r => r.json())
    .then(data => {

      const row = data[rowIndex - 1];

      const place = row[0];

      const statuses = row.slice(1);

      allSlots = statuses.map((s, i) => {

        const id = `Slot ${i + 1}`;

        if (s === "FILLED") return { id, state: "occupied" };

        if (s === "RESERVED") return { id, state: "reserved" };

        return { id, state: "available" };

      });

      renderSlots(place);

    })

    .catch(err => console.error("Backend load error:", err));
}

/* ================= RENDER SLOTS ================= */

function renderSlots(place) {

  let free = 0;
  let occ = 0;
  let res = 0;

  const box = document.getElementById("slots");

  box.innerHTML = "";

  allSlots.forEach(slot => {

    if (slot.state === "available") free++;
    if (slot.state === "occupied") occ++;
    if (slot.state === "reserved") res++;

    box.innerHTML += `
      <div class="slot ${slot.state}">
        <div class="slot-inner">
          <h3>${slot.id}</h3>
          <p>${place}</p>
          <p>Status: ${slot.state}</p>

          ${
            slot.state === "available"
              ? `<button onclick="reserveSlot('${slot.id}')">Reserve</button>`
              : slot.state === "reserved"
              ? `<button onclick="unreserveSlot('${slot.id}')">Unreserve</button>`
              : ""
          }

        </div>
      </div>
    `;

  });

  freeCount.innerText = free;
  occupiedCount.innerText = occ;
  reservedCount.innerText = res;
}

/* ================= RESERVE SLOT ================= */

function reserveSlot(id) {

  const rowIndex = parseInt(localStorage.getItem("selectedRow"));

  const slotNumber = id.split(" ")[1];

  fetch(
    `${BACKEND_URL}?action=reserve&row=${rowIndex}&slot=${slotNumber}`
  )
    .then(r => r.json())
    .then(() => {

      loadSlotData();

    });

}

/* ================= UNRESERVE SLOT ================= */

function unreserveSlot(id) {

  const rowIndex = parseInt(localStorage.getItem("selectedRow"));

  const slotNumber = id.split(" ")[1];

  fetch(
    `${BACKEND_URL}?action=unreserve&row=${rowIndex}&slot=${slotNumber}`
  )
    .then(r => r.json())
    .then(() => {

      loadSlotData();

    });

}

/* ================= AUTO REFRESH ================= */

setInterval(loadSlotData, 3000);

/* ================= INITIAL LOAD ================= */

loadSlotData();
