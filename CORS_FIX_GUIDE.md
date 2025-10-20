# Google Apps Script CORS Issue - Quick Fix Guide

## Problem
The Google Apps Script Web App is not accepting requests from the browser due to CORS (Cross-Origin Resource Sharing) restrictions.

## Solution 1: Re-deploy the Google Apps Script with Correct Settings

1. **Open your Google Apps Script**: https://script.google.com
2. **Find your project** with the middleware code
3. **Click "Deploy" > "Manage deployments"**
4. **Click the edit icon (pencil)** on your existing deployment
5. **Update the settings**:
   - **Execute as**: Me (your account)
   - **Who has access**: Anyone (this is crucial for mobile apps)
6. **Click "Deploy"**
7. **Copy the new Web App URL** (it will be the same as before)

## Solution 2: Alternative Deployment Method

If the above doesn't work:

1. **Create a new deployment**:
   - Click "Deploy" > "New deployment"
   - Choose "Web app" as type
   - Set description: "Mobile App Integration"
   - **Execute as**: Me
   - **Who has access**: Anyone
   - Click "Deploy"
   - **Authorize** when prompted
   - Copy the new Web App URL

## Solution 3: Update Google Apps Script Code

Make sure your Google Apps Script includes the updated CORS handling code from the latest `google-apps-script-middleware.js` file.

## Testing the Fix

1. **Update your environment file** with the new Web App URL if changed
2. **Restart your Ionic development server**: `ionic serve`
3. **Check browser console** for connection test results
4. **Try saving a plot** to test the integration

## Common Issues

- **"Script function not found"**: Redeploy the script
- **"Authorization required"**: Check execution permissions
- **"Access denied"**: Verify "Who has access" is set to "Anyone"
- **Still getting CORS errors**: Try using the GET-based fallback method

## Verification

The app should show these console messages when working:
- ✅ "Google Apps Script connection test successful"
- ✅ "Plot saved to Google Sheets successfully"

If you still see CORS errors, the fallback GET method will be used automatically.