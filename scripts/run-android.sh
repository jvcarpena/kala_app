#!/usr/bin/env bash
# One command to run Kala on the Android emulator (Git Bash on Windows).
#   bash scripts/run-android.sh
# Starts the emulator if it isn't running, waits for Android to finish booting,
# then starts Expo and opens the app in Expo Go.

set -u

export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
AVD="Kala_Pixel_3a"

cd "$(dirname "$0")/.." || exit 1

if [ ! -x "$ANDROID_HOME/emulator/emulator.exe" ]; then
  echo "Can't find the Android SDK at: $ANDROID_HOME"
  echo "Install Android Studio, or set ANDROID_HOME to your SDK folder."
  exit 1
fi

if ! adb devices | grep -q "emulator-.*device$"; then
  echo "Starting the emulator ($AVD). The first boot can take a couple of minutes..."
  "$ANDROID_HOME/emulator/emulator.exe" -avd "$AVD" >/dev/null 2>&1 &
  adb wait-for-device
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    sleep 3
  done
  echo "Emulator is ready."
else
  echo "Emulator already running."
fi

# Tunnel the emulator's localhost:8081 to this PC. Without it Expo hands the emulator your
# Wi-Fi address, which it often can't reach (firewall, VPN), and the app hangs on a blank screen.
adb reverse tcp:8081 tcp:8081

# Only change the address Expo advertises (localhost, through the tunnel). Don't use --localhost:
# it also makes Metro listen on localhost only, which can end up IPv6-only, and then the tunnel
# connects but gets "unexpected end of stream".
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost

echo "Starting Expo. Press r to reload, Ctrl+C to stop."
npx expo start --android
