# Google Apps Script Verification & Deployment Fix

## Issue: "Google hasn't verified this app" 🚨

This is a common Google security warning that appears when deploying Google Apps Script web apps. Here's how to fix it:

## Quick Fix Steps ✅

### Step 1: Update Your Google Apps Script
1. **Go to**: https://script.google.com
2. **Find your project** (the one with the middleware code)
3. **Replace the entire code** with the updated version (check the updated google-apps-script-middleware.js)
4. **Save** the project (Ctrl+S)

### Step 2: Create a Fresh Deployment
1. **Delete existing deployment**:
   - Click "Deploy" → "Manage deployments"
   - Delete the old deployment

2. **Create new deployment**:
   - Click "Deploy" → "New deployment"
   - Choose type: "Web app"
   - Set these settings EXACTLY:
     - **Execute as**: Me (your-email@gmail.com)
     - **Who has access**: Anyone
   - Click "Deploy"

3. **Handle Google's warning**:
   - You'll see "Google hasn't verified this app"
   - Click "Advanced"
   - Click "Go to [Your Project Name] (unsafe)"
   - Click "Allow" to grant permissions

4. **Copy the new Web App URL**

### Step 3: Update Your App Configuration
Update your environment files with the new Web App URL:

**src/environments/environment.ts:**
```typescript
export const environment = {
  production: false,
  googleSheets: {
    spreadsheetId: '1n5CRvk5hnHkIXD0GJNTd9tUxdQCtKThFwn0LyFuejEg',
    webAppUrl: 'YOUR_NEW_WEB_APP_URL_HERE'
  }
};
```

**src/environments/environment.prod.ts:**
```typescript
export const environment = {
  production: true,
  googleSheets: {
    spreadsheetId: '1n5CRvk5hnHkIXD0GJNTd9tUxdQCtKThFwn0LyFuejEg',
    webAppUrl: 'YOUR_NEW_WEB_APP_URL_HERE'
  }
};
```

### Step 4: Test the Deployment

1. **Direct URL test**: Open this URL in your browser:
   ```
   YOUR_NEW_WEB_APP_URL?action=test
   ```
   
   **Expected response**:
   ```json
   {
     "success": true,
     "message": "Google Apps Script Web App is working correctly",
     "data": {
       "timestamp": "2025-10-20T...",
       "version": "1.0"
     },
     "timestamp": "2025-10-20T..."
   }
   ```

2. **App test**: In your Ionic app:
   - Enable Google Sheets integration on dashboard
   - Click "Test Connection" button

## Alternative: Make Your App "Verified" ✨

If you want to avoid the warning completely:

### Option 1: Use a Different Google Account
- Create the Google Apps Script with a G Suite/Workspace account
- These accounts have fewer restrictions

### Option 2: Publish as an Add-on (Advanced)
- This requires Google's review process
- Takes 1-2 weeks
- Only needed for public distribution

## Common Issues & Solutions 🔧

### Issue: "Invalid GET action"
- **Cause**: Old version of Google Apps Script
- **Fix**: Update the script with the latest version

### Issue: "Failed to load Google Apps Script test"
- **Cause**: CORS or network issues
- **Fix**: Make sure the web app is deployed with "Anyone" access

### Issue: "Access denied"
- **Cause**: Wrong deployment settings
- **Fix**: Redeploy with "Execute as: Me" and "Who has access: Anyone"

### Issue: Script timeout
- **Cause**: Large spreadsheet or slow connection
- **Fix**: The script is optimized for your 290 plots, should work fine

## Security Notes 🔒

- **"Execute as: Me"** means the script runs with your Google account permissions
- **"Anyone"** access means anyone with the URL can call the script
- The URL is long and random, so it's reasonably secure
- Your actual Google Sheets data requires your account permissions

## Testing Checklist ✅

- [ ] Google Apps Script updated with latest code
- [ ] New deployment created
- [ ] Google verification warning bypassed
- [ ] New Web App URL copied
- [ ] Environment files updated
- [ ] Direct URL test successful
- [ ] App test button works
- [ ] Plot creation saves to Google Sheets

## Next Steps 🚀

Once this is working:
1. Test adding a new plot from the app
2. Verify it appears in your Google Sheets
3. Test the full workflow with real data
4. Build the app for Android testing

---

**Need help?** If you still see the verification warning after following these steps, let me know and I'll help you troubleshoot further!