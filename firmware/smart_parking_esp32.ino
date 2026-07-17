#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
const char* SENSOR_API_KEY = "YOUR_SENSOR_API_KEY";

const String LOCATION_ID = "1";

const int NUM_SLOTS = 4;
const float OCCUPIED_DISTANCE_CM = 20.0;
const float MAX_VALID_DISTANCE_CM = 400.0;

const unsigned long SENSOR_INTERVAL_MS = 1000;
const unsigned long CLOUD_SYNC_INTERVAL_MS = 60000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;

const int TRIG_PINS[NUM_SLOTS] = {13, 14, 26, 27};
const int ECHO_PINS[NUM_SLOTS] = {32, 33, 34, 35};

const int GREEN_LED_PINS[NUM_SLOTS] = {16, 17, 18, 19};
const int RED_LED_PINS[NUM_SLOTS] = {23, 25, 4, 5};

LiquidCrystal_I2C lcd(0x27, 16, 2);

enum SlotState {
  SLOT_UNKNOWN,
  SLOT_FREE,
  SLOT_OCCUPIED
};

SlotState currentSlotState[NUM_SLOTS];
SlotState lastCloudState[NUM_SLOTS];

float slotDistance[NUM_SLOTS];

unsigned long lastSensorReadTime = 0;
unsigned long lastCloudSyncTime = 0;
unsigned long lastWiFiReconnectTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("Smart Parking System V2");
  Serial.println("Initializing system...");

  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(TRIG_PINS[i], OUTPUT);
    pinMode(ECHO_PINS[i], INPUT);
    digitalWrite(TRIG_PINS[i], LOW);

    pinMode(GREEN_LED_PINS[i], OUTPUT);
    pinMode(RED_LED_PINS[i], OUTPUT);
    digitalWrite(GREEN_LED_PINS[i], LOW);
    digitalWrite(RED_LED_PINS[i], LOW);

    currentSlotState[i] = SLOT_UNKNOWN;
    lastCloudState[i] = SLOT_UNKNOWN;
    slotDistance[i] = -1;
  }

  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SMART PARKING");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  connectWiFi();

  delay(1500);
  lcd.clear();
}

void loop() {
  unsigned long currentTime = millis();

  if (WiFi.status() != WL_CONNECTED &&
      currentTime - lastWiFiReconnectTime >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWiFiReconnectTime = currentTime;
    connectWiFi();
  }

  if (currentTime - lastSensorReadTime >= SENSOR_INTERVAL_MS) {
    lastSensorReadTime = currentTime;

    readAllParkingSlots();
    updateAllLEDs();
    updateLCD();
    printDiagnostics();
    sendChangedStates();
  }

  if (currentTime - lastCloudSyncTime >= CLOUD_SYNC_INTERVAL_MS) {
    lastCloudSyncTime = currentTime;
    synchronizeAllSlots();
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("Wi-Fi connected.");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("Wi-Fi connection failed.");
    Serial.println("Local parking detection will continue.");
  }
}

float measureDistanceCM(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  unsigned long duration = pulseIn(echoPin, HIGH, 30000);

  if (duration == 0) {
    return -1;
  }

  float distance = duration * 0.0343 / 2.0;

  if (distance <= 0 || distance > MAX_VALID_DISTANCE_CM) {
    return -1;
  }

  return distance;
}

void readAllParkingSlots() {
  for (int i = 0; i < NUM_SLOTS; i++) {
    float distance = measureDistanceCM(TRIG_PINS[i], ECHO_PINS[i]);

    slotDistance[i] = distance;

    if (distance < 0) {
      Serial.print("Invalid sensor reading for S");
      Serial.println(i + 1);
      continue;
    }

    if (distance <= OCCUPIED_DISTANCE_CM) {
      currentSlotState[i] = SLOT_OCCUPIED;
    } else {
      currentSlotState[i] = SLOT_FREE;
    }

    delay(50);
  }
}

void updateAllLEDs() {
  for (int i = 0; i < NUM_SLOTS; i++) {
    if (currentSlotState[i] == SLOT_FREE) {
      digitalWrite(GREEN_LED_PINS[i], HIGH);
      digitalWrite(RED_LED_PINS[i], LOW);
    } else if (currentSlotState[i] == SLOT_OCCUPIED) {
      digitalWrite(GREEN_LED_PINS[i], LOW);
      digitalWrite(RED_LED_PINS[i], HIGH);
    } else {
      digitalWrite(GREEN_LED_PINS[i], LOW);
      digitalWrite(RED_LED_PINS[i], LOW);
    }
  }
}

void updateLCD() {
  int freeSlots = 0;

  for (int i = 0; i < NUM_SLOTS; i++) {
    if (currentSlotState[i] == SLOT_FREE) {
      freeSlots++;
    }
  }

  lcd.setCursor(0, 0);
  lcd.print("SMART PARKING   ");

  lcd.setCursor(0, 1);
  lcd.print("FREE: ");
  lcd.print(freeSlots);
  lcd.print("/");
  lcd.print(NUM_SLOTS);
  lcd.print("       ");
}

void sendChangedStates() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  for (int i = 0; i < NUM_SLOTS; i++) {
    if (currentSlotState[i] == SLOT_UNKNOWN) {
      continue;
    }

    if (currentSlotState[i] != lastCloudState[i]) {
      if (sendSlotUpdate(i, currentSlotState[i])) {
        lastCloudState[i] = currentSlotState[i];
      }
    }
  }
}

void synchronizeAllSlots() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cloud sync skipped: Wi-Fi unavailable.");
    return;
  }

  Serial.println("Synchronizing all slots...");

  for (int i = 0; i < NUM_SLOTS; i++) {
    if (currentSlotState[i] == SLOT_UNKNOWN) {
      continue;
    }

    if (sendSlotUpdate(i, currentSlotState[i])) {
      lastCloudState[i] = currentSlotState[i];
    }

    delay(250);
  }
}

bool sendSlotUpdate(int slotIndex, SlotState state) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  String slotId = "S" + String(slotIndex + 1);
  String status = state == SLOT_OCCUPIED ? "OCCUPIED" : "FREE";

  String url =
    String(BACKEND_URL) +
    "?action=updateSensor" +
    "&locationId=" + LOCATION_ID +
    "&slotId=" + slotId +
    "&status=" + status +
    "&apiKey=" + String(SENSOR_API_KEY);

  HTTPClient http;

  Serial.print("Updating ");
  Serial.print(slotId);
  Serial.print(" -> ");
  Serial.println(status);

  http.begin(url);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  int httpCode = http.GET();

  if (httpCode > 0) {
    String response = http.getString();

    Serial.print("HTTP Response: ");
    Serial.println(httpCode);
    Serial.print("Backend: ");
    Serial.println(response);

    http.end();

    return httpCode == 200 &&
           response.indexOf("\"success\":true") >= 0;
  }

  Serial.print("HTTP request failed: ");
  Serial.println(http.errorToString(httpCode));

  http.end();

  return false;
}

void printDiagnostics() {
  Serial.println();
  Serial.println("----------------------------");
  Serial.println("Parking Slot Status");
  Serial.println("----------------------------");

  int freeSlots = 0;

  for (int i = 0; i < NUM_SLOTS; i++) {
    Serial.print("S");
    Serial.print(i + 1);
    Serial.print(" | Distance: ");

    if (slotDistance[i] < 0) {
      Serial.print("INVALID");
    } else {
      Serial.print(slotDistance[i]);
      Serial.print(" cm");
    }

    Serial.print(" | Status: ");

    if (currentSlotState[i] == SLOT_FREE) {
      Serial.println("FREE");
      freeSlots++;
    } else if (currentSlotState[i] == SLOT_OCCUPIED) {
      Serial.println("OCCUPIED");
    } else {
      Serial.println("UNKNOWN");
    }
  }

  Serial.print("Available Slots: ");
  Serial.print(freeSlots);
  Serial.print("/");
  Serial.println(NUM_SLOTS);

  Serial.print("Wi-Fi: ");
  Serial.println(
    WiFi.status() == WL_CONNECTED
      ? "CONNECTED"
      : "DISCONNECTED"
  );

  Serial.println("----------------------------");
}
