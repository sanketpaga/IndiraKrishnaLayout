# Google Apps Script Deployment Troubleshooting

## Current Issue 🚨
- "Failed to load Google Apps Script" error
- Web App URL: `https://script.google.com/macros/s/AKfycbzPOsO3CHeb9fh1Lof8Vu_qceoiOVu3RsIPFjdqKQDyTMGX7YONZA20quwU-q8cvgBoOQ/exec`
- Spreadsheet: "IndiraKrishnaLayout" (ID: 1n5CRvk5hnHkIXD0GJNTd9tUxdQCtKThFwn0LyFuejEg)

## Quick Diagnosis 🔍

### Step 1: Test the Web App URL
Open this URL in your browser:
```
https://script.google.com/macros/s/AKfycbzPOsO3CHeb9fh1Lof8Vu_qceoiOVu3RsIPFjdqKQDyTMGX7YONZA20quwU-q8cvgBoOQ/exec?action=test
```

**Expected Result**: JSON response with success message
**If you get an error**: The Web App deployment has issues

### Step 2: Test from Browser Console
In your app, open browser console and run:
```javascript
// Test the Google Sheets service
const plotService = document.querySelector('app-root')?._ngHost?.componentRef?.injector?.get('PlotService');
plotService?.googleSheetsService?.testConnectionManually();
```

### Step 3: Check Google Apps Script Project

1. **Go to**: https://script.google.com
2. **Find your project** (should contain the middleware code)
3. **Check the code**:
   - Make sure `doGet` function exists
   - Verify `CONFIG.SPREADSHEET_ID` is set to: `1n5CRvk5hnHkIXD0GJNTd9tUxdQCtKThFwn0LyFuejEg`
   - Check `handleTest()` function exists

4. **Check deployment**:
   - Click "Deploy" → "Manage deployments"
   - Verify: Execute as "Me", Access "Anyone"
   - If needed, create new deployment

## Common Solutions ✅

### Solution 1: Redeploy the Web App
1. In Google Apps Script, click "Deploy" → "New deployment"
2. Choose "Web app"
3. Set Execute as: **Me**
4. Set Who has access: **Anyone**
5. Click "Deploy"
6. Grant permissions
7. Copy new Web App URL
8. Update environment files if URL changed

### Solution 2: Check Permissions
- Make sure you authorized the script to access Google Sheets
- Check if your Google account has access to the spreadsheet

### Solution 3: Create Fresh Deployment
1. Delete existing deployment
2. Create completely new deployment
3. Use new Web App URL in environment files

### Solution 4: Test with Simple Script
Replace your Google Apps Script content temporarily with this minimal test:

```javascript
function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  
  const response = {
    success: true,
    message: "Test successful",
    action: action,
    timestamp: new Date().toISOString()
  };
  
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(response)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy this simple version first to test connectivity.

## Manual Verification 📋

- [ ] Web App URL accessible in browser
- [ ] Returns JSON response
- [ ] Deployment settings correct
- [ ] Permissions granted
- [ ] Spreadsheet exists and accessible
- [ ] Script contains correct spreadsheet ID