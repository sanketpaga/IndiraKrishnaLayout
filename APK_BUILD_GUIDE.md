# Quick APK Generation Guide

## Prerequisites Check:
```bash
# Check if Android SDK is installed
echo $ANDROID_HOME
adb --version
```

## Build Steps:
```bash
# 1. Navigate to project root
cd /Users/sanket.bp/IndraKrishnaLayout

# 2. Build the web app
ionic build --prod

# 3. Sync with Android
npx cap sync android

# 4. Build APK
cd android
./gradlew assembleDebug

# 5. Find your APK
ls -la app/build/outputs/apk/debug/
```

## APK Location:
Your APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Install on Device:
```bash
# Enable USB debugging on your phone
# Connect phone via USB
adb install app/build/outputs/apk/debug/app-debug.apk
```

Or simply copy the APK file to your phone and install it manually.

## Note:
- Debug APK is for testing only
- For Play Store, you need a signed release APK
- Make sure "Install from unknown sources" is enabled on your phone