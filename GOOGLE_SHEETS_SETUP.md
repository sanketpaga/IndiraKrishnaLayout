# Google Sheets Integration Setup

This guide will help you set up Google Sheets integration for the Indra Krishna Layout mobile app.

## Prerequisites

1. Google account with Google Sheets access
2. Google Cloud Platform account (free tier is sufficient)
3. Google Sheets API enabled
4. Google Apps Script access

## Step 1: Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Rename it to "Indra Krishna Layout - Plot Management"
4. Note the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

## Step 2: Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 3: Create API Credentials (Read-Only Operations)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key
4. Restrict the API key:
   - Click on the key to edit
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Sheets API"

## Step 4: Deploy Google Apps Script Middleware (Write Operations)

### For Mobile-Friendly Write Operations:

1. **Create Google Apps Script Project**:
   - Go to [Google Apps Script](https://script.google.com)
   - Click "New Project"
   - Replace the default code with the content from `google-apps-script-middleware.js`

2. **Deploy as Web App**:
   - Click "Deploy" > "New deployment"
   - Choose "Web app" as type
   - Set execute permissions to "Anyone"
   - Click "Deploy"
   - Copy the Web App URL (ends with `/exec`)

3. **Grant Permissions**:
   - The script will ask for Google Sheets permissions
   - Review and authorize the required permissions

## Step 5: Configure Environment Files

Update your environment files with the credentials:

### Development (src/environments/environment.ts)
```typescript
export const environment = {
  production: false,
  googleSheets: {
    apiKey: 'YOUR_API_KEY_HERE', // For read operations
    spreadsheetId: 'YOUR_SPREADSHEET_ID_HERE',
    webAppUrl: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE', // For write operations
    sheets: {
      plots: 'Plots',
      payments: 'Payments',
      customers: 'Customers'
    }
  }
};
```

### Production (src/environments/environment.prod.ts)
```typescript
export const environment = {
  production: true,
  googleSheets: {
    apiKey: 'YOUR_PRODUCTION_API_KEY_HERE',
    spreadsheetId: 'YOUR_PRODUCTION_SPREADSHEET_ID_HERE',
    webAppUrl: 'YOUR_PRODUCTION_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',
    sheets: {
      plots: 'Plots',
      payments: 'Payments',
      customers: 'Customers'
    }
  }
};
```

## Step 6: Initialize Sheets Structure

The Google Apps Script will automatically create the required sheets with proper headers. The sheets created will be:

### Plots Sheet
- Plot ID, Survey Number, Plot Number, Plot Type, Area, Price, Status, Owner Type, Purchaser Name, etc.

### Payments Sheet  
- Payment ID, Plot ID, Amount, Date, Mode, Status, Description, Receipt Number, etc.

### Customers Sheet
- Customer ID, Plot ID, Name, Mobile, Email, Address, Registration Date

## Step 7: Testing

1. Start your development server:
   ```bash
   ionic serve
   ```

2. Test the integration:
   - The app will read data using Google Sheets API (API Key)
   - Write operations will use the Google Apps Script Web App
   - Check browser console for any errors

3. Test on mobile device:
   ```bash
   ionic capacitor run android
   ```

## Mobile App Deployment

### Android APK Build:
```bash
# Build the project
ionic build --prod

# Add Android platform if not already added
ionic capacitor add android

# Copy web assets
ionic capacitor copy android

# Open Android Studio
ionic capacitor open android
```

### iOS Build (if needed):
```bash
# Build the project  
ionic build --prod

# Add iOS platform if not already added
ionic capacitor add ios

# Copy web assets
ionic capacitor copy ios

# Open Xcode
ionic capacitor open ios
```

## Architecture Overview

### Read Operations (API Key):
- Mobile App → Google Sheets API → Spreadsheet
- Used for fetching plot and payment data
- No authentication required (public API key)

### Write Operations (Google Apps Script):
- Mobile App → Google Apps Script Web App → Google Sheets API → Spreadsheet
- Handles all create, update, delete operations
- No OAuth required in mobile app
- Secure server-side execution

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Make sure the API key is correct
   - Verify the Google Sheets API is enabled
   - Check API key restrictions

2. **Web App Issues**
   - Ensure Web App is deployed with "Anyone" access
   - Check the Web App URL is correct
   - Verify Google Apps Script permissions

3. **Mobile Specific Issues**
   - Test network connectivity
   - Check CORS handling in requests
   - Verify HTTPS usage for all requests

### Error Messages

- **"API key not valid"**: Check your API key configuration
- **"Requested entity was not found"**: Verify spreadsheet ID
- **"Web App not accessible"**: Check deployment settings and permissions
- **"Network error"**: Check internet connectivity and URL format

## Security Notes

1. **Never commit credentials to version control**
2. Use environment variables for production deployments
3. Restrict API keys to specific APIs and domains
4. The Google Apps Script runs server-side with proper authentication
5. Web App URL can be considered public but only accepts valid requests
6. Regularly monitor usage in Google Cloud Console

## Offline Support

The app includes offline support features:
- Data is cached locally when online
- Changes are queued when offline
- Automatic sync when connection is restored
- Graceful degradation of functionality