const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbw7Qsf826aVnhxWi7Vu61rUer0Dp9Od4yvd4WTugq1EEjiAIfv-SndDIfzTdmbJkIdl3w/exec";

let allSlots = [];

async function loadSlotData() {
  const locationId = localStorage.getItem("selectedLocationId");

  if (!locationId) {
    console.warn("No parking location selected.");
    return;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}?action=getSlots&locationId=${encodeURIComponent(locationId)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Unable to load parking slots.");
    }

    allSlots = data.slots;

    renderSlots(data.locationName);
  } catch (error) {
    console.error("Failed to load parking data:", error);
  }
}

function renderSlots(locationName) {
  let available = 0;
  let occupied = 0;
  let reserved = 0;

  const slotContainer = document.getElementById("slots");

  if (!slotContainer) {
    return;
  }

  slotContainer.innerHTML = "";

  allSlots.forEach(slot => {
    if (slot.state === "available") {
      available++;
    } else if (slot.state === "occupied") {
      occupied++;
    } else if (slot.state === "reserved") {
      reserved++;
    }

    const slotElement = document.createElement("div");
    slotElement.className = `slot ${slot.state}`;

    let actionButton = "";

    if (slot.state === "available") {
      actionButton =
        `<button onclick="reserveSlot('${slot.slotId}')">Reserve</button>`;
    } else if (slot.state === "reserved") {
      actionButton =
        `<button onclick="unreserveSlot('${slot.slotId}')">Unreserve</button>`;
    }

    slotElement.innerHTML = `
      <div class="slot-inner">
        <h3>${slot.slotId}</h3>
        <p>${locationName}</p>
        <p>Status: ${formatState(slot.state)}</p>
        ${actionButton}
      </div>
    `;

    slotContainer.appendChild(slotElement);
  });

  const freeCount = document.getElementById("freeCount");
  const occupiedCount = document.getElementById("occupiedCount");
  const reservedCount = document.getElementById("reservedCount");

  if (freeCount) {
    freeCount.innerText = available;
  }

  if (occupiedCount) {
    occupiedCount.innerText = occupied;
  }

  if (reservedCount) {
    reservedCount.innerText = reserved;
  }
}

async function reserveSlot(slotId) {
  const locationId = localStorage.getItem("selectedLocationId");

  if (!locationId) {
    showMessage("No parking location selected.");
    return;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}?action=reserve&locationId=${encodeURIComponent(locationId)}&slotId=${encodeURIComponent(slotId)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      showMessage(data.error || "Unable to reserve parking slot.");
      return;
    }

    showMessage(data.message || "Parking slot reserved successfully.");

    await loadSlotData();
  } catch (error) {
    console.error("Reservation failed:", error);
    showMessage("Unable to reserve the parking slot. Please try again.");
  }
}

async function unreserveSlot(slotId) {
  const locationId = localStorage.getItem("selectedLocationId");

  if (!locationId) {
    showMessage("No parking location selected.");
    return;
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}?action=unreserve&locationId=${encodeURIComponent(locationId)}&slotId=${encodeURIComponent(slotId)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      showMessage(data.error || "Unable to cancel the reservation.");
      return;
    }

    showMessage(data.message || "Parking reservation cancelled.");

    await loadSlotData();
  } catch (error) {
    console.error("Reservation cancellation failed:", error);
    showMessage("Unable to cancel the reservation. Please try again.");
  }
}

function formatState(state) {
  if (!state) {
    return "Unknown";
  }

  return state.charAt(0).toUpperCase() + state.slice(1);
}

function showMessage(message) {
  const alertText = document.getElementById("alertText");
  const alertModal = document.getElementById("alertModal");

  if (alertText && alertModal) {
    alertText.innerText = message;
    alertModal.style.display = "block";
  } else {
    alert(message);
  }
}

setInterval(loadSlotData, 5000);

loadSlotData();
