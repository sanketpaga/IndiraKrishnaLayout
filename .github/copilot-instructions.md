<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Ionic Angular Mobile App Development

This workspace is set up for developing Android mobile applications using Ionic Framework with Angular and TypeScript.

## Project Type
- **Framework**: Ionic 7+ with Angular 16+
- **Language**: TypeScript
- **Target Platform**: Android (with potential for iOS)
- **Architecture**: Component-based Angular architecture with Ionic UI components

## Development Guidelines
- Use Angular best practices for component structure and services
- Leverage Ionic components for mobile-optimized UI
- Follow TypeScript strict mode conventions
- Use Capacitor for native device features
- Implement responsive design for different screen sizes

## Key Technologies
- Ionic Framework
- Angular
- TypeScript
- Capacitor (for native functionality)
- Cordova plugins (when needed)
- Android SDK (for building APKs)

## Development Workflow
1. Use `ionic serve` for browser-based development and testing
2. Use `ionic capacitor run android` for device/emulator testing
3. Build with `ionic capacitor build android` for production
4. Use Chrome DevTools for debugging web-based functionality
5. Use Android Studio for native debugging when needed