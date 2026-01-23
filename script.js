const CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vSwLmApnYXq3_ayIB9AsRG9le-HXu4Fl62bXK3ySXnqoikhxGSz9lhsxREz83qjUtrp5KAKEH-o4vL7/pub?output=csv";

let selectedSlotId = null;
let allSlots = [];
let bookedSlots = JSON.parse(localStorage.getItem("bookedSlots") || "{}");

function loadSlotData() {
  const rowIndex = parseInt(localStorage.getItem("selectedRow"));
  if (!rowIndex) return;

  fetch(CSV_URL + "&t=" + Date.now())
    .then(r => r.text())
    .then(csv => {
      const rows = csv.trim().split("\n");
      const data = rows[rowIndex - 1].split(",");

      const place = data[0];
      const statuses = data.slice(1);

      allSlots = statuses.map((s, i) => {
        const id = `Slot ${i + 1}`;
        if (bookedSlots[id]) return { id, state: "reserved" };
        if (s === "FILLED") return { id, state: "occupied" };
        return { id, state: "available" };
      });

      renderSlots(place);
    });
}

function renderSlots(place) {
  let free=0, occ=0, res=0;
  const box = document.getElementById("slots");
  box.innerHTML="";

  allSlots.forEach(slot => {
    if(slot.state==="available") free++;
    if(slot.state==="occupied") occ++;
    if(slot.state==="reserved") res++;

    box.innerHTML += `
    <div class="slot ${slot.state}">
      <div class="slot-inner">
        <h3>${slot.id}</h3>
        <p>${place}</p>
        <p>Status: ${slot.state}</p>
        ${slot.state==="available" ? `<button onclick="reserveSlot('${slot.id}')">Reserve</button>` :
        slot.state==="reserved" ? `<button onclick="unreserveSlot('${slot.id}')">Unreserve</button>` : ""}
      </div>
    </div>`;
  });

  freeCount.innerText = free;
  occupiedCount.innerText = occ;
  reservedCount.innerText = res;
}

function reserveSlot(id){ selectedSlotId=id; bookingModal.style.display="block"; }
function closeBooking(){ bookingModal.style.display="none"; }

function submitBooking(){
  bookedSlots[selectedSlotId]={ time:Date.now() };
  localStorage.setItem("bookedSlots",JSON.stringify(bookedSlots));
  closeBooking();
  loadSlotData();
}

function unreserveSlot(id){
  delete bookedSlots[id];
  localStorage.setItem("bookedSlots",JSON.stringify(bookedSlots));
  loadSlotData();
}
