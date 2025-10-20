#!/bin/bash

echo "🚀 EASY APK BUILDER FOR INDIRA KRISHNA LAYOUT"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "ionic.config.json" ]; then
    echo "❌ Please run this from your project root directory"
    exit 1
fi

echo "📦 Step 1: Building web app..."
ionic build --prod

if [ $? -eq 0 ]; then
    echo "✅ Web build successful!"
else
    echo "❌ Web build failed!"
    exit 1
fi

echo "🔄 Step 2: Syncing with Android..."
npx cap sync android

if [ $? -eq 0 ]; then
    echo "✅ Android sync successful!"
else
    echo "❌ Android sync failed!"
    exit 1
fi

echo "🏗️  Step 3: Building APK..."

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  Android SDK not found!"
    echo "📱 Opening Android Studio for manual build..."
    echo "   1. Click 'Build' → 'Build Bundle(s) / APK(s)' → 'Build APK(s)'"
    echo "   2. Wait for build to complete"
    echo "   3. APK will be in: android/app/build/outputs/apk/debug/"
    
    npx cap open android
else
    echo "🔨 Building APK with Gradle..."
    cd android
    ./gradlew assembleDebug
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 SUCCESS! APK built successfully!"
        echo "📍 Location: android/app/build/outputs/apk/debug/app-debug.apk"
        echo ""
        echo "📱 To install on your phone:"
        echo "   1. Copy the APK file to your phone"
        echo "   2. Enable 'Install from unknown sources' in phone settings"
        echo "   3. Tap the APK file to install"
        echo ""
        
        # Open the APK location in Finder
        open app/build/outputs/apk/debug/
    else
        echo "❌ APK build failed!"
        echo "💡 Try installing Android Studio and running again"
    fi
fi