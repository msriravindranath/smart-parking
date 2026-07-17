# IoT-Based Smart Parking System

An IoT-based smart parking system designed to monitor parking slot occupancy in real time, provide local availability indicators, synchronize parking data with a cloud backend, and allow users to view and reserve available parking slots through a web dashboard.

The system integrates ESP32-based hardware, ultrasonic distance sensors, LED indicators, an I2C LCD, a Google Apps Script backend, Google Sheets for cloud data storage, and a responsive web interface.

## Overview

Finding available parking spaces in busy locations can be time-consuming and inefficient. This project aims to simplify the process by monitoring individual parking slots and making their availability accessible through a web-based dashboard.

Each parking slot is monitored using an ultrasonic sensor connected to an ESP32. The ESP32 determines whether a slot is free or occupied and provides immediate local feedback using red and green LEDs.

A 16x2 I2C LCD displays the total number of available parking spaces at the parking location.

The ESP32 also communicates with a cloud backend over Wi-Fi. Parking status updates are stored in Google Sheets through a Google Apps Script API and displayed on a web dashboard where users can monitor slot availability and reserve available parking spaces.

## Features

- Real-time parking slot occupancy detection
- Four individually monitored parking slots
- Ultrasonic sensor-based vehicle detection
- Green LED indication for available slots
- Red LED indication for occupied slots
- 16x2 I2C LCD for local availability display
- ESP32 Wi-Fi connectivity
- Cloud synchronization of parking status
- Multi-location parking support
- Web-based parking availability dashboard
- Parking slot reservation and cancellation
- Automatic dashboard refresh
- Separate Available, Occupied, and Reserved states
- Periodic cloud synchronization
- Local parking detection independent of cloud connectivity
- Responsive web interface

## System Architecture

The system consists of four main layers:

### 1. Hardware Layer

Each parking slot is monitored using an HC-SR04 ultrasonic sensor.

The ESP32 processes sensor measurements and determines whether each slot is:

- Available
- Occupied

The local parking system provides immediate feedback through:

- Four green LEDs for available slots
- Four red LEDs for occupied slots
- A 16x2 I2C LCD showing the number of available parking spaces

### 2. Embedded and Communication Layer

The ESP32 firmware:

- Reads data from four ultrasonic sensors
- Determines parking slot occupancy
- Controls local LED indicators
- Updates the LCD display
- Connects to Wi-Fi
- Sends parking status changes to the backend
- Periodically synchronizes parking states with the cloud
- Continues local detection when internet connectivity is unavailable

### 3. Cloud Backend

The backend is implemented using Google Apps Script.

It provides API operations for:

- Retrieving parking locations
- Retrieving parking slots
- Updating sensor status
- Reserving parking slots
- Cancelling reservations

Google Sheets is used as the cloud data store for parking location and slot information.

### 4. Web Application

The web interface allows users to:

- View available parking locations
- Check the number of available, occupied, and reserved slots
- Open an individual parking location
- View real-time parking slot status
- Reserve available parking slots
- Cancel existing reservations

## System Workflow

```text
Vehicle
   |
   v
Ultrasonic Sensor
   |
   v
ESP32
   |
   +------> LED Indicators
   |
   +------> 16x2 I2C LCD
   |
   +------> Wi-Fi
               |
               v
       Google Apps Script API
               |
               v
          Google Sheets
               |
               v
          Web Dashboard
               |
               v
             User
```

When a vehicle enters or leaves a parking slot:

1. The ultrasonic sensor measures the distance between the sensor and the nearest object.
2. The ESP32 compares the measured distance with the configured occupancy threshold.
3. The slot is classified as available or occupied.
4. The corresponding red or green LED is updated.
5. The LCD updates the total number of available parking spaces.
6. If the slot state changes, the ESP32 sends the new state to the cloud backend.
7. Google Apps Script updates the corresponding parking slot in Google Sheets.
8. The web dashboard retrieves the latest parking data and displays it to users.

## Hardware Requirements

- ESP32 development board
- 4 x HC-SR04 ultrasonic sensors
- 4 x Green LEDs
- 4 x Red LEDs
- 16x2 LCD with I2C interface
- Current-limiting resistors for LEDs
- Appropriate voltage dividers or level shifting for ultrasonic Echo signals
- Breadboard
- Jumper wires
- Power supply

## Technologies Used

### Embedded Systems

- ESP32
- Arduino Framework
- C++
- Wi-Fi
- HTTP communication

### Sensors and Hardware

- HC-SR04 Ultrasonic Sensors
- LED Status Indicators
- 16x2 I2C LCD

### Backend

- Google Apps Script
- Google Sheets

### Frontend

- HTML5
- CSS3
- JavaScript
- Fetch API
- Browser Local Storage

## Project Structure

```text
smart-parking/
|
|-- backend/
|   |-- Code.gs
|
|-- firmware/
|   |-- smart_parking_esp32.ino
|
|-- docs/
|   |-- images/
|
|-- index.html
|-- locations.html
|-- script.js
|-- style.css
|-- .gitignore
|-- README.md
```

## API Operations

The Google Apps Script backend supports the following operations.

### Get Parking Locations

```text
?action=getLocations
```

Returns parking locations along with:

- Total slots
- Available slots
- Occupied slots
- Reserved slots

### Get Parking Slots

```text
?action=getSlots&locationId=LOCATION_ID
```

Returns the parking slots and their current states for a selected location.

### Update Sensor Status

```text
?action=updateSensor&locationId=LOCATION_ID&slotId=SLOT_ID&status=STATUS&apiKey=API_KEY
```

Used by the ESP32 to update the physical occupancy status of a parking slot.

Supported sensor states:

```text
FREE
OCCUPIED
```

### Reserve Parking Slot

```text
?action=reserve&locationId=LOCATION_ID&slotId=SLOT_ID
```

Marks an available parking slot as reserved.

### Cancel Reservation

```text
?action=unreserve&locationId=LOCATION_ID&slotId=SLOT_ID
```

Cancels an existing parking reservation.

## Parking Slot States

The system represents parking slots using three user-facing states.

### Available

The physical parking slot is free and has not been reserved.

### Occupied

The ultrasonic sensor has detected a vehicle in the parking slot.

Physical occupancy takes priority over reservation status.

### Reserved

The physical parking slot is currently free but has been reserved through the web application.

## ESP32 Firmware

The ESP32 firmware monitors four parking slots.

The firmware performs the following operations:

1. Initializes the ultrasonic sensors.
2. Initializes the red and green LED indicators.
3. Initializes the 16x2 I2C LCD.
4. Connects to the configured Wi-Fi network.
5. Measures the distance for each parking slot.
6. Determines whether each slot is available or occupied.
7. Updates local LED indicators.
8. Updates the LCD availability count.
9. Sends state changes to the backend.
10. Periodically synchronizes all slot states with the cloud.

The system is designed so that local sensor detection, LED indicators, and the LCD can continue operating even when cloud connectivity is temporarily unavailable.

## Configuration

Before uploading the firmware to an ESP32, configure the following values locally:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
const char* SENSOR_API_KEY = "YOUR_SENSOR_API_KEY";
```

Do not commit real Wi-Fi credentials or private API keys to a public repository.

The GitHub version should contain placeholder values only.

## Backend Configuration

The backend uses a Google Sheet named:

```text
ParkingSlots
```

The Apps Script backend expects parking data containing information such as:

```text
Location ID
Location Name
Slot ID
Sensor Status
Reserved
Last Updated
```

The backend source code is available in:

```text
backend/Code.gs
```

Before deployment, configure a private sensor API key in the deployed Apps Script project.

The public repository version should retain:

```javascript
const SENSOR_API_KEY = "YOUR_SENSOR_API_KEY";
```

## Web Dashboard

The web application contains two main interfaces.

### Parking Locations

`locations.html`

Displays all configured parking locations and their current:

- Total slots
- Available slots
- Occupied slots
- Reserved slots

Selecting a location opens the parking slot dashboard.

### Parking Dashboard

`index.html`

Displays:

- Selected parking location
- Available slot count
- Occupied slot count
- Reserved slot count
- Individual parking slot states
- Reservation controls

The dashboard periodically retrieves updated parking information from the backend.

## Screenshots

Screenshots of the web dashboard can be added to:

```text
docs/images/
```

Example files:

```text
docs/images/locations-page.png
docs/images/parking-dashboard.png
```

They can then be displayed in this README using:

```markdown
![Parking Locations](docs/images/locations-page.png)

![Parking Dashboard](docs/images/parking-dashboard.png)
```

Hardware prototype images can also be added when available.

## Hardware Safety Note

The HC-SR04 ultrasonic sensor commonly operates at 5V, and its Echo output may exceed the 3.3V logic level supported by ESP32 GPIO pins.

An appropriate voltage divider or level-shifting circuit should be used between each HC-SR04 Echo output and the corresponding ESP32 input pin.

## Security

Sensitive information should never be committed to the repository.

The following values must remain private:

- Wi-Fi SSID and password
- Sensor API key
- Other private credentials

The public repository contains placeholders for these values.

The current reservation API is intended for prototype and demonstration purposes. A production deployment should implement stronger authentication, authorization, reservation ownership, rate limiting, and secure server-side request handling.

## Current Limitations

- The current implementation is designed as a prototype.
- Reservation endpoints do not currently include user authentication.
- Reservations do not currently have automatic expiration.
- The occupancy threshold may require calibration depending on physical sensor placement.
- Google Apps Script and Google Sheets are suitable for prototype-scale deployment but are not intended for high-traffic production systems.
- Internet connectivity is required for cloud synchronization and remote monitoring.

## Future Improvements

- User authentication and account management
- Secure reservation ownership
- Time-based parking reservations
- Automatic reservation expiration
- QR-based parking confirmation
- Entry and exit gate automation
- Mobile application integration
- Parking navigation and slot guidance
- Historical parking analytics
- Real-time notifications
- Improved sensor filtering and calibration
- Dedicated cloud database
- Scalable backend architecture
- Edge-device health monitoring
- Deployment of multiple ESP32 nodes across larger parking facilities

## Project Status

The project was originally developed as an IoT-based parking prototype and has since been reorganized and improved with a structured firmware, backend API, cloud data layer, and updated web dashboard architecture.

The repository contains the reconstructed and refined project source code. Hardware prototype documentation and additional project images can be added as they become available.

## Author

M. Sree Ravindranath

B.Tech Electronics and Communication Engineering

Santhiram Engineering College, Nandyal
