# Android APK Build Script
# Run this after setting up Android SDK

# 1. Clean and rebuild
ionic build --prod
npx cap sync android

# 2. Generate debug APK (for testing)
cd android
./gradlew assembleDebug

# 3. Generate release APK (for distribution - requires signing)
# ./gradlew assembleRelease

echo "📱 APK Location:"
echo "Debug APK: android/app/build/outputs/apk/debug/app-debug.apk"
echo "Release APK: android/app/build/outputs/apk/release/app-release.apk"