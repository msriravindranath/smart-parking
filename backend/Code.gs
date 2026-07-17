const SHEET_NAME = "ParkingSlots";
const SENSOR_API_KEY = "YOUR_SENSOR_API_KEY";

function doGet(e) {
  try {
    const action = String(e.parameter.action || "").trim();

    switch (action) {
      case "getLocations":
        return getLocations();
      case "getSlots":
        return getSlots(e);
      case "updateSensor":
        return updateSensor(e);
      case "reserve":
        return reserveSlot(e);
      case "unreserve":
        return unreserveSlot(e);
      default:
        return jsonResponse({
          success: false,
          error: "Invalid or missing action."
        });
    }
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}

function getParkingSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" was not found.`);
  }

  return sheet;
}

function getLocations() {
  const sheet = getParkingSheet();
  const data = sheet.getDataRange().getValues();
  const locations = {};

  for (let i = 1; i < data.length; i++) {
    const locationId = String(data[i][0]).trim();
    const locationName = String(data[i][1]).trim();

    if (!locationId || !locationName) {
      continue;
    }

    if (!locations[locationId]) {
      locations[locationId] = {
        locationId,
        locationName,
        totalSlots: 0,
        available: 0,
        occupied: 0,
        reserved: 0
      };
    }

    const sensorStatus = String(data[i][3]).trim().toUpperCase();
    const reserved = parseBoolean(data[i][4]);

    locations[locationId].totalSlots++;

    if (sensorStatus === "OCCUPIED") {
      locations[locationId].occupied++;
    } else if (reserved) {
      locations[locationId].reserved++;
    } else {
      locations[locationId].available++;
    }
  }

  return jsonResponse({
    success: true,
    locations: Object.values(locations)
  });
}

function getSlots(e) {
  const locationId = String(e.parameter.locationId || "").trim();

  if (!locationId) {
    return jsonResponse({
      success: false,
      error: "locationId is required."
    });
  }

  const sheet = getParkingSheet();
  const data = sheet.getDataRange().getValues();

  const slots = [];
  let locationName = "";

  for (let i = 1; i < data.length; i++) {
    const rowLocationId = String(data[i][0]).trim();

    if (rowLocationId !== locationId) {
      continue;
    }

    locationName = String(data[i][1]).trim();

    const slotId = String(data[i][2]).trim().toUpperCase();
    const sensorStatus = String(data[i][3]).trim().toUpperCase();
    const reserved = parseBoolean(data[i][4]);
    const lastUpdated = data[i][5];

    let state;

    if (sensorStatus === "OCCUPIED") {
      state = "occupied";
    } else if (reserved) {
      state = "reserved";
    } else {
      state = "available";
    }

    slots.push({
      slotId,
      sensorStatus,
      reserved,
      state,
      lastUpdated
    });
  }

  if (slots.length === 0) {
    return jsonResponse({
      success: false,
      error: "Location not found."
    });
  }

  return jsonResponse({
    success: true,
    locationId,
    locationName,
    slots
  });
}

function updateSensor(e) {
  const apiKey = String(e.parameter.apiKey || "").trim();

  if (apiKey !== SENSOR_API_KEY) {
    return jsonResponse({
      success: false,
      error: "Unauthorized sensor update."
    });
  }

  const locationId = String(e.parameter.locationId || "").trim();
  const slotId = String(e.parameter.slotId || "").trim().toUpperCase();
  const status = String(e.parameter.status || "").trim().toUpperCase();

  if (!locationId || !slotId || !status) {
    return jsonResponse({
      success: false,
      error: "locationId, slotId and status are required."
    });
  }

  if (status !== "FREE" && status !== "OCCUPIED") {
    return jsonResponse({
      success: false,
      error: "Sensor status must be FREE or OCCUPIED."
    });
  }

  const sheet = getParkingSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowLocationId = String(data[i][0]).trim();
    const rowSlotId = String(data[i][2]).trim().toUpperCase();

    if (rowLocationId === locationId && rowSlotId === slotId) {
      sheet.getRange(i + 1, 4).setValue(status);
      sheet.getRange(i + 1, 6).setValue(new Date());

      return jsonResponse({
        success: true,
        message: "Sensor status updated.",
        locationId,
        slotId,
        sensorStatus: status
      });
    }
  }

  return jsonResponse({
    success: false,
    error: "Parking slot not found."
  });
}

function reserveSlot(e) {
  const locationId = String(e.parameter.locationId || "").trim();
  const slotId = String(e.parameter.slotId || "").trim().toUpperCase();

  if (!locationId || !slotId) {
    return jsonResponse({
      success: false,
      error: "locationId and slotId are required."
    });
  }

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(5000);

    const sheet = getParkingSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const rowLocationId = String(data[i][0]).trim();
      const rowSlotId = String(data[i][2]).trim().toUpperCase();

      if (rowLocationId === locationId && rowSlotId === slotId) {
        const sensorStatus = String(data[i][3]).trim().toUpperCase();
        const alreadyReserved = parseBoolean(data[i][4]);

        if (sensorStatus === "OCCUPIED") {
          return jsonResponse({
            success: false,
            error: "This parking slot is currently occupied."
          });
        }

        if (alreadyReserved) {
          return jsonResponse({
            success: false,
            error: "This parking slot is already reserved."
          });
        }

        sheet.getRange(i + 1, 5).setValue(true);
        sheet.getRange(i + 1, 6).setValue(new Date());

        return jsonResponse({
          success: true,
          message: "Parking slot reserved successfully.",
          locationId,
          slotId
        });
      }
    }

    return jsonResponse({
      success: false,
      error: "Parking slot not found."
    });
  } finally {
    lock.releaseLock();
  }
}

function unreserveSlot(e) {
  const locationId = String(e.parameter.locationId || "").trim();
  const slotId = String(e.parameter.slotId || "").trim().toUpperCase();

  if (!locationId || !slotId) {
    return jsonResponse({
      success: false,
      error: "locationId and slotId are required."
    });
  }

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(5000);

    const sheet = getParkingSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const rowLocationId = String(data[i][0]).trim();
      const rowSlotId = String(data[i][2]).trim().toUpperCase();

      if (rowLocationId === locationId && rowSlotId === slotId) {
        const reserved = parseBoolean(data[i][4]);

        if (!reserved) {
          return jsonResponse({
            success: false,
            error: "This parking slot is not reserved."
          });
        }

        sheet.getRange(i + 1, 5).setValue(false);
        sheet.getRange(i + 1, 6).setValue(new Date());

        return jsonResponse({
          success: true,
          message: "Parking reservation cancelled.",
          locationId,
          slotId
        });
      }
    }

    return jsonResponse({
      success: false,
      error: "Parking slot not found."
    });
  } finally {
    lock.releaseLock();
  }
}

function parseBoolean(value) {
  return value === true || String(value).trim().toUpperCase() === "TRUE";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
