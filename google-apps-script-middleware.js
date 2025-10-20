/**
 * Google Apps Script Web App for Mobile Google Sheets Integration
 * 
 * This script should be deployed as a Web App in Google Apps Script
 * and will handle read/write operations to Google Sheets for the mobile app.
 * 
 * Setup Instructions:
 * 1. Go to script.google.com
 * 2. Create a new project
 * 3. Replace the default code with this script
 * 4. Deploy as Web App with these settings:
 *    - Execute as: Me
 *    - Who has access: Anyone (for mobile app access)
 * 5. Copy the Web App URL and use it in your mobile app
 */

// Configuration - Update these with your actual spreadsheet details
const CONFIG = {
  SPREADSHEET_ID: '1n5CRvk5hnHkIXD0GJNTd9tUxdQCtKThFwn0LyFuejEg', // Your actual spreadsheet ID
  SHEETS: {
    PLOTS: 'Plots',
    PAYMENTS: 'Payments', 
    CUSTOMERS: 'Customers'
  }
};

/**
 * Main function to handle all HTTP requests
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    switch (action) {
      case 'test':
        return handleTest();
      case 'getAllPlots':
        return handleGetAllPlots();
      case 'savePlot':
        return handleSavePlot(requestData.data);
      case 'savePayment':
        return handleSavePayment(requestData.data);
      case 'saveCustomer':
        return handleSaveCustomer(requestData.data);
      case 'initializeSheets':
        return handleInitializeSheets();
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse(false, 'Server error: ' + error.toString());
  }
}

/**
 * Handle GET requests (for CORS preflight and simple requests)
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback; // For JSONP support
    
    let response;
    
    if (action === 'test') {
      response = handleTest();
    } else if (action === 'getAllPlots') {
      response = handleGetAllPlots();
    } else if (action === 'savePlot') {
      // Handle plot saving via GET request (CORS workaround)
      const plotData = JSON.parse(decodeURIComponent(e.parameter.plotData || '{}'));
      const spreadsheetId = e.parameter.spreadsheetId || CONFIG.SPREADSHEET_ID;
      
      console.log('Received plot data in GET request:', {
        plotId: plotData.id,
        hasPurchaser: !!plotData.purchaser,
        purchaserData: plotData.purchaser
      });
      
      response = handleSavePlotFromGet({
        plot: plotData,
        spreadsheetId: spreadsheetId
      });
    } else {
      // Return error for invalid actions
      response = createResponse(false, 'Invalid GET action: ' + (action || 'none'), {
        validActions: ['test', 'getAllPlots', 'savePlot'],
        timestamp: new Date().toISOString()
      });
    }
    
    // If callback is provided, return JSONP response
    if (callback) {
      const jsonpResponse = `${callback}(${response.getContent()});`;
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return response;
    
  } catch (error) {
    console.error('Error in doGet:', error);
    const errorResponse = createResponse(false, 'Server error: ' + error.toString());
    
    // Handle JSONP error response
    if (e.parameter.callback) {
      const jsonpResponse = `${e.parameter.callback}(${errorResponse.getContent()});`;
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return errorResponse;
  }
}

/**
 * Get all plots with related data
 */
function handleGetAllPlots() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Read all sheets
    const plotsData = readSheet(spreadsheet, CONFIG.SHEETS.PLOTS);
    const paymentsData = readSheet(spreadsheet, CONFIG.SHEETS.PAYMENTS);
    const customersData = readSheet(spreadsheet, CONFIG.SHEETS.CUSTOMERS);
    
    // Combine data into plot objects
    const plots = combinePlotsData(plotsData, paymentsData, customersData);
    
    return createResponse(true, 'Plots retrieved successfully', plots);
  } catch (error) {
    console.error('Error getting plots:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Save plot data
 */
function handleSavePlot(plotData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const plotsSheet = spreadsheet.getSheetByName(CONFIG.SHEETS.PLOTS);
    
    // Convert plot to row format
    const plotRow = [
      plotData.id,
      plotData.surveyNumber,
      plotData.plotNumber,
      plotData.dimensions.length,
      plotData.dimensions.width,
      plotData.dimensions.area,
      plotData.status,
      plotData.owner,
      plotData.ratePerSqMeter,
      plotData.totalCost,
      plotData.governmentRate,
      plotData.createdAt,
      plotData.updatedAt
    ];
    
    // Check if plot exists
    const existingRowIndex = findRowByValue(plotsSheet, plotData.id, 1);
    
    if (existingRowIndex > 0) {
      // Update existing plot
      const range = plotsSheet.getRange(existingRowIndex, 1, 1, plotRow.length);
      range.setValues([plotRow]);
    } else {
      // Add new plot
      plotsSheet.appendRow(plotRow);
    }
    
    // Save customer data if exists
    if (plotData.purchaser) {
      handleSaveCustomer({
        plotId: plotData.id,
        ...plotData.purchaser
      });
    }
    
    // Save payments if exist
    if (plotData.payments && plotData.payments.length > 0) {
      plotData.payments.forEach(payment => {
        handleSavePayment({
          plotId: plotData.id,
          ...payment
        });
      });
    }
    
    return createResponse(true, 'Plot saved successfully');
  } catch (error) {
    console.error('Error saving plot:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Save payment data
 */
function handleSavePayment(paymentData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const paymentsSheet = spreadsheet.getSheetByName(CONFIG.SHEETS.PAYMENTS);
    
    const paymentRow = [
      paymentData.id,
      paymentData.plotId,
      paymentData.amount,
      paymentData.date,
      paymentData.mode,
      paymentData.description || '',
      paymentData.receiptNumber || '',
      paymentData.plotNumber || '',
      paymentData.surveyNumber || '',
      paymentData.customerName || ''
    ];
    
    const existingRowIndex = findRowByValue(paymentsSheet, paymentData.id, 1);
    
    if (existingRowIndex > 0) {
      const range = paymentsSheet.getRange(existingRowIndex, 1, 1, paymentRow.length);
      range.setValues([paymentRow]);
    } else {
      paymentsSheet.appendRow(paymentRow);
    }
    
    return createResponse(true, 'Payment saved successfully');
  } catch (error) {
    console.error('Error saving payment:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Save customer data
 */
function handleSaveCustomer(customerData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const customersSheet = spreadsheet.getSheetByName(CONFIG.SHEETS.CUSTOMERS);
    
    const customerRow = [
      `customer-${customerData.plotId}`,
      customerData.plotId,
      customerData.name,
      customerData.mobile,
      customerData.email || '',
      customerData.address || '',
      customerData.registrationDate
    ];
    
    const existingRowIndex = findRowByValue(customersSheet, customerData.plotId, 2);
    
    if (existingRowIndex > 0) {
      const range = customersSheet.getRange(existingRowIndex, 1, 1, customerRow.length);
      range.setValues([customerRow]);
    } else {
      customersSheet.appendRow(customerRow);
    }
    
    return createResponse(true, 'Customer saved successfully');
  } catch (error) {
    console.error('Error saving customer:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Initialize sheets with proper headers
 */
function handleInitializeSheets() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Create sheets if they don't exist and set headers
    createSheetWithHeaders(spreadsheet, CONFIG.SHEETS.PLOTS, [
      'ID', 'Survey Number', 'Plot Number', 'Length', 'Width', 'Area',
      'Status', 'Owner', 'Rate Per SqM', 'Total Cost', 'Government Rate',
      'Created At', 'Updated At'
    ]);
    
    createSheetWithHeaders(spreadsheet, CONFIG.SHEETS.PAYMENTS, [
      'Payment ID', 'Plot ID', 'Amount', 'Date', 'Mode', 'Description',
      'Receipt Number', 'Plot Number', 'Survey Number', 'Customer Name'
    ]);
    
    createSheetWithHeaders(spreadsheet, CONFIG.SHEETS.CUSTOMERS, [
      'Customer ID', 'Plot ID', 'Name', 'Mobile', 'Email', 'Address', 'Registration Date'
    ]);
    
    return createResponse(true, 'Sheets initialized successfully');
  } catch (error) {
    console.error('Error initializing sheets:', error);
    return createResponse(false, error.toString());
  }
}

/**
 * Helper Functions
 */

function readSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  return data;
}

function combinePlotsData(plotsData, paymentsData, customersData) {
  const plots = [];
  
  // Skip header row
  for (let i = 1; i < plotsData.length; i++) {
    const row = plotsData[i];
    if (!row || row.length === 0) continue;
    
    const plotId = row[0];
    
    // Find customer for this plot
    const customer = customersData.find(custRow => custRow[1] === plotId);
    
    // Find payments for this plot
    const plotPayments = paymentsData.filter(payRow => payRow[1] === plotId);
    
    const plot = {
      id: row[0],
      surveyNumber: row[1],
      plotNumber: row[2],
      dimensions: {
        length: parseFloat(row[3]) || 0,
        width: parseFloat(row[4]) || 0,
        area: parseFloat(row[5]) || 0
      },
      status: row[6],
      owner: row[7],
      ratePerSqMeter: parseFloat(row[8]) || 0,
      totalCost: parseFloat(row[9]) || 0,
      governmentRate: parseFloat(row[10]) || 0,
      createdAt: row[11],
      updatedAt: row[12],
      purchaser: customer ? {
        name: customer[2],
        mobile: customer[3],
        email: customer[4],
        address: customer[5],
        registrationDate: customer[6]
      } : null,
      payments: plotPayments.map(payRow => ({
        id: payRow[0],
        amount: parseFloat(payRow[2]) || 0,
        date: payRow[3],
        mode: payRow[4],
        description: payRow[5],
        receiptNumber: payRow[6],
        plotNumber: payRow[7],
        surveyNumber: payRow[8],
        customerName: payRow[9]
      }))
    };
    
    plots.push(plot);
  }
  
  return plots;
}

function findRowByValue(sheet, searchValue, columnIndex) {
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][columnIndex - 1] === searchValue) {
      return i + 1; // Return 1-based row index
    }
  }
  return -1;
}

function createSheetWithHeaders(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  
  // Check if headers already exist
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('white');
  }
}

/**
 * Handle plot saving from GET request (CORS workaround)
 */
function handleSavePlotFromGet(data) {
  try {
    const plot = data.plot;
    const spreadsheetId = data.spreadsheetId || CONFIG.SPREADSHEET_ID;
    
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEETS.PLOTS);
    
    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = spreadsheet.insertSheet(CONFIG.SHEETS.PLOTS);
      createPlotHeaders(sheet);
    }
    
    // Convert plot object to row data - CORRECTED COLUMN ORDER
    const rowData = [
      plot.id || '',                                    // Column 1: ID
      plot.surveyNumber || '',                          // Column 2: Survey Number
      plot.plotNumber || '',                            // Column 3: Plot Number
      plot.dimensions ? plot.dimensions.length : '',    // Column 4: Length
      plot.dimensions ? plot.dimensions.width : '',     // Column 5: Width
      plot.dimensions ? plot.dimensions.area : '',      // Column 6: Area
      plot.status || '',                                // Column 7: Status ✅ FIXED
      plot.owner || '',                                 // Column 8: Owner ✅ FIXED
      plot.ratePerSqMeter || '',                        // Column 9: Rate Per SqM ✅ FIXED
      plot.totalCost || '',                             // Column 10: Total Cost ✅ FIXED
      plot.governmentRate || '',                        // Column 11: Government Rate
      new Date().toISOString(),                         // Column 12: Created At
      new Date().toISOString()                          // Column 13: Updated At
    ];
    
    // Find existing row or append new one
    const data_range = sheet.getDataRange();
    const values = data_range.getValues();
    let rowIndex = -1;
    
    // Find existing plot by ID
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === plot.id) {
        rowIndex = i + 1; // +1 because sheet rows are 1-based
        break;
      }
    }
    
    if (rowIndex > 0) {
      // Update existing row
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Append new row
      sheet.appendRow(rowData);
    }
    
    let customersProcessed = 0;
    let paymentsProcessed = 0;

    // Save customer data if exists
    if (plot.purchaser) {
      console.log('Customer data found in plot:', plot.purchaser);
      const customerResult = handleSaveCustomer({
        plotId: plot.id,
        ...plot.purchaser
      });
      console.log('Customer save result:', customerResult);
      customersProcessed = 1;
    } else {
      console.log('No customer data found in plot');
    }

    // Clean up orphaned payments first (remove payments that no longer exist for this plot)
    cleanupOrphanedPayments(plot.id, plot.payments || []);

    // Save payments if exist
    if (plot.payments && plot.payments.length > 0) {
      plot.payments.forEach(payment => {
        handleSavePayment({
          plotId: plot.id,
          ...payment
        });
      });
      paymentsProcessed = plot.payments.length;
    }

    return createResponse(true, 'Plot saved successfully via GET request', {
      plotId: plot.id,
      method: 'GET',
      paymentsProcessed: paymentsProcessed,
      customersProcessed: customersProcessed
    });  } catch (error) {
    console.error('Error in handleSavePlotFromGet:', error);
    return createResponse(false, 'Error saving plot via GET: ' + error.toString());
  }
}

/**
 * Clean up orphaned payment rows for a specific plot
 */
function cleanupOrphanedPayments(plotId, currentPayments) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const paymentsSheet = spreadsheet.getSheetByName(CONFIG.SHEETS.PAYMENTS);
    
    if (!paymentsSheet) {
      console.log('Payments sheet not found');
      return;
    }
    
    const data = paymentsSheet.getDataRange().getValues();
    const currentPaymentIds = currentPayments.map(p => p.id);
    
    console.log('Cleaning up payments for plot:', plotId);
    console.log('Current payment IDs:', currentPaymentIds);
    
    // Find rows to delete (from bottom to top to avoid index shifting)
    const rowsToDelete = [];
    for (let i = data.length - 1; i > 0; i--) { // Start from last row, skip header
      const row = data[i];
      const rowPlotId = row[1]; // Plot ID is in column 2
      const rowPaymentId = row[0]; // Payment ID is in column 1
      
      // If this payment belongs to our plot but is not in current payments, mark for deletion
      if (rowPlotId === plotId && !currentPaymentIds.includes(rowPaymentId)) {
        rowsToDelete.push(i + 1); // +1 because sheet rows are 1-based
        console.log('Marking payment for deletion:', rowPaymentId);
      }
    }
    
    // Delete the rows (from bottom to top)
    rowsToDelete.forEach(rowIndex => {
      paymentsSheet.deleteRow(rowIndex);
      console.log('Deleted payment row:', rowIndex);
    });
    
    console.log('Cleanup completed. Deleted rows:', rowsToDelete.length);
    
  } catch (error) {
    console.error('Error cleaning up orphaned payments:', error);
  }
}

/**
 * Handle test connection request
 */
function handleTest() {
  try {
    return createResponse(true, 'Google Apps Script Web App is working correctly', {
      timestamp: new Date().toISOString(),
      version: '1.0'
    });
  } catch (error) {
    console.error('Error in handleTest:', error);
    return createResponse(false, 'Test failed: ' + error.toString());
  }
}

function createResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}