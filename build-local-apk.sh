#!/bin/bash

# Local APK Build Script for Indira Krishna Layout
# This script builds a production APK locally on your machine

echo "🚀 Starting Local APK Build..."
echo "================================="

# Step 1: Build the web app
echo "📦 Building Ionic app for production..."
ionic build --prod

if [ $? -ne 0 ]; then
    echo "❌ Ionic build failed!"
    exit 1
fi

# Step 2: Sync with Android
echo "🔄 Syncing with Android project..."
ionic capacitor sync android

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi

# Step 3: Build the APK
echo "🔨 Building Android APK..."
cd android && ./gradlew clean assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ APK Build Successful!"
    echo "================================="
    echo "📱 Your APK is ready at:"
    echo "   android/app/build/outputs/apk/release/IndiraKrishna-1.0.apk"
    echo ""
    echo "📊 APK Size:"
    ls -lh android/app/build/outputs/apk/release/IndiraKrishna-*.apk | awk '{print "   " $5}'
    echo ""
    echo "💡 To install on Android device:"
    echo "   1. Copy APK to your phone"
    echo "   2. Enable 'Install from Unknown Sources'"
    echo "   3. Tap APK file to install"
    echo ""
else
    echo "❌ APK build failed!"
    exit 1
fi