# Indira Krishna Layout - Mobile Management App

A comprehensive Android mobile application for managing the Indira Krishna Layout real estate project with three survey divisions (152/1, 152/2, 152/3).

## Prerequisites

- Node.js 20+ (recommended)
- npm or yarn
- Ionic CLI (`npm install -g @ionic/cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   ionic serve
   ```
   This will open the app in your browser at `http://localhost:8100`

3. **Build for production:**
   ```bash
   ionic build
   ```

## Mobile Development

### Android

1. **Add Android platform:**
   ```bash
   ionic capacitor add android
   ```

2. **Build and sync:**
   ```bash
   ionic capacitor build android
   ```

3. **Open in Android Studio:**
   ```bash
   ionic capacitor open android
   ```

4. **Run on device/emulator:**
   ```bash
   ionic capacitor run android
   ```

### iOS (macOS only)

1. **Add iOS platform:**
   ```bash
   ionic capacitor add ios
   ```

2. **Build and sync:**
   ```bash
   ionic capacitor build ios
   ```

3. **Open in Xcode:**
   ```bash
   ionic capacitor open ios
   ```

## Project Structure

```
src/
├── app/           # Main application code
├── assets/        # Static assets (images, icons, etc.)
├── environments/  # Environment configurations
├── theme/         # Global styles and theming
└── index.html     # Main HTML file
```

## Available Scripts

- `ionic serve` - Start development server
- `ionic build` - Build for production
- `ionic test` - Run unit tests
- `ionic capacitor add android` - Add Android platform
- `ionic capacitor run android` - Run on Android device/emulator

## Features

- **Survey Management** - Manage 290 plots across three survey divisions
- **Plot Tracking** - Track availability, pre-booking, and sales status
- **Payment Management** - Handle multiple installment payments
- **Dashboard Analytics** - Real-time statistics and progress tracking
- **Layout Visualization** - Interactive grid view of all plots
- **Reports & Analytics** - Comprehensive sales and financial reports
- **Offline Capability** - Works offline with data synchronization

## Development

This project uses:
- **Ionic 7+** - UI framework
- **Angular 16+** - Web framework
- **Capacitor** - Native bridge
- **TypeScript** - Programming language

## Troubleshooting

- Ensure Node.js version is 20+ for optimal compatibility
- Run `ionic doctor` to check for common issues
- Clear node_modules and reinstall if facing dependency issues

## Resources

- [Ionic Documentation](https://ionicframework.com/docs)
- [Angular Documentation](https://angular.io/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)