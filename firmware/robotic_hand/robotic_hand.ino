/*
  HandControl ESP32 firmware
  Protocol over USB serial at 115200 baud:
    OPEN_HAND / CLOSE_HAND / HELLO / HELP / THANK_YOU / YES / NO / STOP
    SET <THUMB|INDEX|MIDDLE|RING|PINKY> <angle-degrees>

  Uses an Adafruit PCA9685 PWM driver over I2C. Servo endpoints are deliberately
  conservative. Calibrate unloaded and keep fingers clear during all tests.
*/
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pca9685 = Adafruit_PWMServoDriver(0x40);
const uint32_t SERIAL_BAUD = 115200;
const uint8_t SERVO_CHANNELS[5] = {0, 1, 2, 3, 4};  // thumb, index, middle, ring, pinky
const uint16_t SERVO_MIN_TICK = 115;                 // tune for your servo/driver
const uint16_t SERVO_MAX_TICK = 510;
const int SAFE_MIN_DEGREES = 10;
const int SAFE_MAX_DEGREES = 170;
int currentAngles[5] = {25, 25, 25, 25, 25};
String inputLine;
bool driverReady = false;

int channelForFinger(const String &finger) {
  if (finger == "THUMB") return 0;
  if (finger == "INDEX") return 1;
  if (finger == "MIDDLE") return 2;
  if (finger == "RING") return 3;
  if (finger == "PINKY") return 4;
  return -1;
}

uint16_t angleToTick(int degrees) {
  degrees = constrain(degrees, SAFE_MIN_DEGREES, SAFE_MAX_DEGREES);
  return map(degrees, 0, 180, SERVO_MIN_TICK, SERVO_MAX_TICK);
}

void setFinger(int finger, int degrees) {
  if (!driverReady || finger < 0 || finger >= 5) return;
  degrees = constrain(degrees, SAFE_MIN_DEGREES, SAFE_MAX_DEGREES);
  currentAngles[finger] = degrees;
  pca9685.setPWM(SERVO_CHANNELS[finger], 0, angleToTick(degrees));
}

void applyPose(const int pose[5]) {
  for (int i = 0; i < 5; ++i) setFinger(i, pose[i]);
}

// These are starting examples only. Tune positions for the actual tendon hand.
void executeCommand(String command) {
  command.trim();
  command.toUpperCase();
  const int OPEN[5] = {25, 25, 25, 25, 25};
  const int CLOSED[5] = {145, 145, 145, 145, 145};
  const int HELP_POSE[5] = {95, 30, 145, 145, 145};
  const int THANKS_POSE[5] = {35, 35, 35, 35, 35};
  const int NO_POSE[5] = {40, 35, 145, 145, 145};

  if (command == "OPEN_HAND" || command == "HELLO" || command == "STOP") applyPose(OPEN);
  else if (command == "CLOSE_HAND" || command == "YES") applyPose(CLOSED);
  else if (command == "HELP") applyPose(HELP_POSE);
  else if (command == "THANK_YOU") applyPose(THANKS_POSE);
  else if (command == "NO") applyPose(NO_POSE);
  else return;
  Serial.print("OK ");
  Serial.println(command);
}

void handleLine(String line) {
  line.trim();
  if (!line.length()) return;
  String upper = line;
  upper.toUpperCase();
  if (upper.startsWith("POSE ")) {
    String fields[7];
    int start = 0;
    for (int i = 0; i < 7; ++i) {
      int end = upper.indexOf(' ', start);
      if (i == 6) end = upper.length();
      if (end < 0) { Serial.println("ERR expected POSE <COMMAND> <5 angles>"); return; }
      fields[i] = upper.substring(start, end);
      start = end + 1;
    }
    const String allowed[] = {"HELLO", "HELP", "THANK_YOU", "YES", "NO", "STOP", "OPEN_HAND", "CLOSE_HAND"};
    bool knownCommand = false;
    for (const String &known : allowed) if (fields[1] == known) knownCommand = true;
    if (!knownCommand) { Serial.println("ERR unknown command"); return; }
    int pose[5];
    for (int i = 0; i < 5; ++i) {
      char *end = nullptr;
      long angle = strtol(fields[i + 2].c_str(), &end, 10);
      if (end == fields[i + 2].c_str() || *end != '\0' || angle < SAFE_MIN_DEGREES || angle > SAFE_MAX_DEGREES) {
        Serial.println("ERR angle outside safe range"); return;
      }
      pose[i] = (int)angle;
    }
    applyPose(pose);
    Serial.print("OK "); Serial.println(fields[1]);
    return;
  }
  if (upper.startsWith("SET ")) {
    int firstSpace = upper.indexOf(' ');
    int secondSpace = upper.indexOf(' ', firstSpace + 1);
    if (secondSpace < 0) { Serial.println("ERR expected SET <FINGER> <ANGLE>"); return; }
    String finger = upper.substring(firstSpace + 1, secondSpace);
    String value = upper.substring(secondSpace + 1);
    char *end = nullptr;
    long angle = strtol(value.c_str(), &end, 10);
    int channel = channelForFinger(finger);
    if (channel < 0 || end == value.c_str() || *end != '\0') { Serial.println("ERR invalid finger or angle"); return; }
    if (angle < SAFE_MIN_DEGREES || angle > SAFE_MAX_DEGREES) { Serial.println("ERR angle outside safe range"); return; }
    setFinger(channel, (int)angle);
    Serial.print("OK SET "); Serial.print(finger); Serial.print(' '); Serial.println(angle);
    return;
  }
  executeCommand(upper);
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  inputLine.reserve(80);
  Wire.begin();  // ESP32 defaults are SDA=21 and SCL=22; change if your board differs.
  driverReady = pca9685.begin();
  if (driverReady) {
    pca9685.setOscillatorFrequency(27000000);
    pca9685.setPWMFreq(50);
    Serial.println("READY HandControl PCA9685");
  } else {
    Serial.println("ERR PCA9685 not found at I2C address 0x40");
  }
  // No startup pose is applied: powering the board does not move the hand.
}

void loop() {
  while (Serial.available()) {
    char incoming = (char)Serial.read();
    if (incoming == '\n') {
      handleLine(inputLine);
      inputLine = "";
    } else if (incoming != '\r' && inputLine.length() < 80) {
      inputLine += incoming;
    } else if (inputLine.length() >= 80) {
      inputLine = "";
      Serial.println("ERR command too long");
    }
  }
}
