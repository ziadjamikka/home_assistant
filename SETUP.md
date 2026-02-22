# Smart Home System - Complete Setup Guide

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (HTML/JS)                     │
│  - Control Panel                                              │
│  - 3D Simulation                                              │
│  - Sensor Monitoring                                          │
└────────────┬─────────────────────────────────────────────────┘
             │ HTTP API + WebSocket
             │
┌────────────▼─────────────────────────────────────────────────┐
│                    Backend (FastAPI)                          │
│  - REST API                                                   │
│  - WebSocket Server                                           │
│  - MQTT Client                                                │
│  - Database Manager                                           │
└────────────┬─────────────────────────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
┌─────▼─────┐  ┌───▼────────┐
│  Database │  │ MQTT Broker│
│  (SQLite) │  │ (Mosquitto)│
└───────────┘  └────┬───────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
   │  ESP32  │ │Arduino │ │  RPi   │
   │ Devices │ │Devices │ │Devices │
   └─────────┘ └────────┘ └────────┘
```

## Step 1: Database Setup

```bash
cd database
python init_db.py
```

This creates `smart_home.db` with:
- 30 devices
- Sample sensor data
- Automation rules
- AI training data

## Step 2: Install MQTT Broker

### Windows
1. Download Mosquitto: https://mosquitto.org/download/
2. Install and run as service
3. Test: `mosquitto -v`

### Linux
```bash
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

### Mac
```bash
brew install mosquitto
brew services start mosquitto
```

## Step 3: Backend Setup

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Backend will run on:
- API: http://localhost:8080
- WebSocket: ws://localhost:8080/ws
- Swagger Docs: http://localhost:8080/docs

## Step 4: Frontend Setup

```bash
cd frontend
python -m http.server 8000
```

Open browser: http://localhost:8000

## Step 5: Test the System

### Test 1: API Health Check
```bash
curl http://localhost:8080/api/health
```

### Test 2: Get All Devices
```bash
curl http://localhost:8080/api/devices
```

### Test 3: Toggle a Device
```bash
curl -X POST http://localhost:8080/api/devices/rec_light/toggle
```

### Test 4: MQTT Test
```bash
# Subscribe to all topics
mosquitto_sub -h localhost -t "smarthome/#" -v

# In another terminal, publish command
mosquitto_pub -h localhost -t "smarthome/rec_light/command" -m '{"status":1}'
```

## Hardware Integration

### ESP32 Setup

1. Install Arduino IDE
2. Install ESP32 board support
3. Install libraries:
   - PubSubClient (MQTT)
   - ArduinoJson

4. Upload this code:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* mqtt_server = "192.168.1.100";  // Your PC IP

WiFiClient espClient;
PubSubClient client(espClient);

#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  
  // Connect MQTT
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
  
  while (!client.connected()) {
    if (client.connect("ESP32_Light1")) {
      Serial.println("MQTT connected");
      client.subscribe("smarthome/rec_light/command");
      
      // Register hardware
      client.publish("smarthome/hardware/esp32_001/register",
        "{\"hardware_id\":\"esp32_001\",\"device_type\":\"light\"}");
    } else {
      delay(5000);
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  
  Serial.println("Received: " + msg);
  
  // Parse status
  int status = msg.indexOf("\"status\":1") > 0 ? 1 : 0;
  digitalWrite(LED_PIN, status);
  
  // Send status back
  String response = "{\"status\":" + String(status) + "}";
  client.publish("smarthome/rec_light/status", response.c_str());
}

void loop() {
  if (!client.connected()) {
    setup();
  }
  client.loop();
}
```

### Arduino Setup

Similar to ESP32 but use Ethernet or WiFi shield.

### Raspberry Pi Setup

```python
import paho.mqtt.client as mqtt
import RPi.GPIO as GPIO
import json
import time

LED_PIN = 17
GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT")
    client.subscribe("smarthome/rec_light/command")
    
    # Register
    client.publish("smarthome/hardware/rpi_001/register",
        json.dumps({"hardware_id": "rpi_001", "device_type": "light"}))

def on_message(client, userdata, msg):
    data = json.loads(msg.payload)
    status = data.get('status', 0)
    
    GPIO.output(LED_PIN, status)
    print(f"LED set to {status}")
    
    # Send status back
    client.publish("smarthome/rec_light/status",
        json.dumps({"status": status}))

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect("localhost", 1883, 60)
client.loop_forever()
```

## Sensor Integration

### Temperature Sensor (DHT22)

```cpp
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

void loop() {
  static unsigned long lastSend = 0;
  
  if (millis() - lastSend > 10000) {  // Every 10 seconds
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    if (!isnan(temp)) {
      String payload = "{\"type\":\"temperature\",\"value\":" + String(temp) + "}";
      client.publish("smarthome/temp_sensor1/sensor", payload.c_str());
    }
    
    if (!isnan(humidity)) {
      String payload = "{\"type\":\"humidity\",\"value\":" + String(humidity) + "}";
      client.publish("smarthome/humidity_sensor1/sensor", payload.c_str());
    }
    
    lastSend = millis();
  }
  
  client.loop();
}
```

### Motion Sensor (PIR)

```cpp
#define PIR_PIN 5

void setup() {
  pinMode(PIR_PIN, INPUT);
}

void loop() {
  int motion = digitalRead(PIR_PIN);
  
  if (motion == HIGH) {
    String payload = "{\"type\":\"motion\",\"value\":1}";
    client.publish("smarthome/motion_sensor1/sensor", payload.c_str());
    delay(5000);  // Debounce
  }
  
  client.loop();
}
```

## Frontend Integration

The frontend automatically connects to backend via:
- HTTP API for device control
- WebSocket for real-time updates

No additional configuration needed if backend is running on localhost:8080.

## AI Model Integration

### Train Model

```python
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import pickle

# Get training data from API
import requests
response = requests.get('http://localhost:8080/api/ai/training-data?days=90')
data = response.json()['data']

df = pd.DataFrame(data)

# Features
X = df[['hour', 'day_of_week', 'temperature', 'humidity', 'motion_detected', 'user_present']]
y = df['device_status']

# Train
model = RandomForestClassifier(n_estimators=100)
model.fit(X, y)

# Save model
with open('smart_home_model.pkl', 'wb') as f:
    pickle.dump(model, f)
```

### Use Model for Predictions

```python
# Get current state
response = requests.get('http://localhost:8080/api/ai/state')
state = response.json()['data']

# Predict
features = [[
    state['hour'],
    state['day_of_week'],
    state['temperature'],
    state['humidity'],
    state['motion_detected'],
    1  # user_present
]]

prediction = model.predict(features)

# If prediction says light should be ON
if prediction[0] == 1:
    requests.post('http://localhost:8080/api/devices/rec_light/set?status=1&triggered_by=ai')
```

## Troubleshooting

### Backend won't start
- Check if port 8080 is available
- Verify database exists: `ls ../database/smart_home.db`
- Check Python version: `python --version` (need 3.8+)

### MQTT not connecting
- Verify Mosquitto is running: `mosquitto -v`
- Check firewall settings
- Test with: `mosquitto_sub -h localhost -t test`

### Frontend not updating
- Check WebSocket connection in browser console
- Verify backend is running
- Check CORS settings

### Hardware not connecting
- Verify WiFi credentials
- Check MQTT broker IP address
- Test MQTT with mosquitto_pub/sub
- Check hardware serial monitor for errors

## Production Deployment

### Backend (Docker)
```bash
cd backend
docker build -t smarthome-backend .
docker run -p 8080:8080 smarthome-backend
```

### Frontend (Nginx)
```nginx
server {
    listen 80;
    server_name smarthome.local;
    
    location / {
        root /var/www/smarthome/frontend;
        index index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8080;
    }
    
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Next Steps

1. ✅ Test basic device control
2. ✅ Connect first hardware device
3. ✅ Add sensors
4. ✅ Train AI model
5. ✅ Create automation rules
6. ✅ Monitor energy usage
7. ✅ Deploy to production

## Support

For issues or questions:
- Check logs in backend console
- Check browser console for frontend errors
- Check MQTT broker logs
- Check hardware serial monitor
