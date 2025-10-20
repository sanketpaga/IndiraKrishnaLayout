import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { Plot, Payment, PlotStatus, PaymentMode, SurveyNumber, OwnerType } from '../models/plot.model';
import { environment } from '../../environments/environment';

// Google Sheets API interfaces
interface SheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  webAppUrl: string;
  plotsSheetName: string;
  paymentsSheetName: string;
  customersSheetName: string;
}

interface SheetData {
  values: any[][];
}

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsService {
  private config: SheetsConfig = {
    spreadsheetId: '', // Will be set from environment or config
    apiKey: '', // Will be set from environment or config  
    webAppUrl: '', // Will be set from environment or config
    plotsSheetName: 'Plots',
    paymentsSheetName: 'Payments',
    customersSheetName: 'Customers'
  };

  private plotsSubject = new BehaviorSubject<Plot[]>([]);
  public plots$ = this.plotsSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load configuration from environment
    this.loadConfig();
    
    // Note: Test connection disabled on startup to avoid CORS issues
    // Use testConnectionManually() method to test when needed
  }

  private loadConfig(): void {
    // Load configuration from environment
    this.config = {
      spreadsheetId: environment.googleSheets.spreadsheetId,
      apiKey: environment.googleSheets.apiKey,
      webAppUrl: environment.googleSheets.webAppUrl,
      plotsSheetName: environment.googleSheets.sheets.plots,
      paymentsSheetName: environment.googleSheets.sheets.payments,
      customersSheetName: environment.googleSheets.sheets.customers
    };
  }

  /**
   * Manually test connection to Google Apps Script Web App
   */
  public async testConnectionManually(): Promise<boolean> {
    if (!this.config.webAppUrl) {
      console.warn('Google Apps Script Web App URL not configured');
      return false;
    }

    try {
      // Test the Web App URL directly
      console.log('Testing Google Apps Script at:', this.config.webAppUrl);
      
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const testUrl = `${this.config.webAppUrl}?action=test&callback=testCallback&_t=${timestamp}`;
      console.log('Test URL:', testUrl);
      
      return new Promise<boolean>((resolve) => {
        // Create callback with better error handling
        (window as any).testCallback = (response: any) => {
          console.log('Google Apps Script test response:', response);
          
          // Clean up
          delete (window as any).testCallback;
          
          // Check if response is valid
          if (response && typeof response === 'object') {
            resolve(response.success === true);
          } else {
            console.error('Invalid response format:', response);
            resolve(false);
          }
        };

        // Create script tag with better error handling
        const script = document.createElement('script');
        script.src = testUrl;
        
        script.onerror = (error) => {
          console.error('Failed to load Google Apps Script test:', error);
          console.error('URL that failed:', testUrl);
          console.error('This usually means:');
          console.error('1. Google Apps Script is not deployed correctly');
          console.error('2. Web App URL is incorrect');
          console.error('3. Google Apps Script has errors in the code');
          
          delete (window as any).testCallback;
          resolve(false);
        };

        script.onload = () => {
          console.log('Script tag loaded successfully');
        };

        document.head.appendChild(script);
        
        // Cleanup after timeout with more debugging
        setTimeout(() => {
          if ((window as any).testCallback) {
            console.warn('Google Apps Script test timeout after 10 seconds');
            console.warn('This usually means the script is not responding');
            console.warn('Check Google Apps Script logs at: https://script.google.com');
            
            delete (window as any).testCallback;
            if (document.head.contains(script)) {
              document.head.removeChild(script);
            }
            resolve(false);
          }
        }, 10000);
      });
      
    } catch (error) {
      console.error('Error in testConnectionManually:', error);
      return false;
    }
  }

  /**
   * Test connection to Google Apps Script Web App
   */
  private async testConnection(): Promise<void> {
    if (!this.config.webAppUrl) {
      console.warn('Google Apps Script Web App URL not configured');
      return;
    }

    try {
      // Use GET request for testing as it's more compatible with Google Apps Script
      const testUrl = `${this.config.webAppUrl}?action=test`;
      const response = await this.http.get(testUrl).toPromise();
      console.log('Google Apps Script connection test successful:', response);
    } catch (error) {
      console.error('Google Apps Script connection test failed:', error);
      console.log('Trying alternative approach...');
      
      // Try with JSONP approach for cross-origin requests
      try {
        const jsonpUrl = `${this.config.webAppUrl}?action=test&callback=JSON_CALLBACK`;
        const jsonpResponse = await this.http.jsonp(jsonpUrl, 'callback').toPromise();
        console.log('JSONP connection test successful:', jsonpResponse);
      } catch (jsonpError) {
        console.error('JSONP connection test also failed:', jsonpError);
      }
    }
  }

  /**
   * Initialize Google Sheets with proper structure
   */
  async initializeSheets(): Promise<void> {
    try {
      // Check if sheets exist, create if they don't
      await this.createSheetsIfNotExist();
      
      // Set up headers for each sheet
      await this.setupSheetHeaders();
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Read plots data from Google Sheets
   */
  getPlots(): Observable<Plot[]> {
    return from(this.fetchPlotsFromSheets());
  }

  private async fetchPlotsFromSheets(): Promise<Plot[]> {
    try {
      if (!this.config.webAppUrl) {
        console.warn('WebApp URL not configured, cannot read from Google Sheets');
        return [];
      }

      console.log('Fetching plots from Google Apps Script Web App...');
      
      // Use the Web App to fetch all plots data
      const response = await fetch(`${this.config.webAppUrl}?action=getAllPlots&spreadsheetId=${this.config.spreadsheetId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('Successfully fetched plots from Google Sheets:', result.data.length, 'plots');
        const plots = this.convertWebAppDataToPlots(result.data);
        this.plotsSubject.next(plots);
        return plots;
      } else {
        console.error('Failed to fetch plots from Google Sheets:', result.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching plots from Google Sheets:', error);
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Convert Web App response data to Plot objects
   */
  private convertWebAppDataToPlots(webAppData: any[]): Plot[] {
    if (!Array.isArray(webAppData) || webAppData.length === 0) {
      console.log('No plot data received from Web App');
      return [];
    }

    return webAppData.map((plotData: any) => {
      // Convert the Web App data structure to our Plot model
      const plot: Plot = {
        id: plotData.id || `${plotData.surveyNumber}-${plotData.plotNumber}-${Date.now()}`,
        surveyNumber: plotData.surveyNumber || 'SURVEY_152_1',
        plotNumber: plotData.plotNumber || '1',
        dimensions: {
          length: plotData.dimensions ? parseFloat(plotData.dimensions.length) || 0 : 0,
          width: plotData.dimensions ? parseFloat(plotData.dimensions.width) || 0 : 0,
          area: plotData.dimensions ? parseFloat(plotData.dimensions.area) || 0 : 0
        },
        status: plotData.status || 'AVAILABLE',
        owner: plotData.owner || 'JOINT',
        ratePerSqMeter: parseFloat(plotData.ratePerSqMeter) || 0,
        totalCost: parseFloat(plotData.totalCost) || 0,
        governmentRate: parseFloat(plotData.governmentRate) || 0,
        createdAt: plotData.createdAt ? new Date(plotData.createdAt) : new Date(),
        updatedAt: plotData.updatedAt ? new Date(plotData.updatedAt) : new Date(),
        payments: plotData.payments ? plotData.payments.map((paymentData: any) => ({
          id: paymentData.id,
          amount: parseFloat(paymentData.amount) || 0,
          date: new Date(paymentData.date),
          mode: paymentData.mode,
          description: paymentData.description,
          receiptNumber: paymentData.receiptNumber,
          plotId: plotData.id
        })) : [],
        purchaser: plotData.purchaser || null
      };
      
      console.log('Converted plot data:', {
        plotId: plot.id,
        paymentsCount: plot.payments.length,
        payments: plot.payments
      });
      return plot;
    });
  }

  /**
   * Save plot data to Google Sheets via middleware (CORS-friendly approach)
   */
  async savePlot(plot: Plot): Promise<void> {
    try {
      console.log('Attempting to save plot to Google Sheets:', plot.id);
      
      if (!this.config.webAppUrl) {
        console.warn('WebApp URL not configured, saving locally only');
        return;
      }

      console.log('Using WebApp URL:', this.config.webAppUrl);
      console.log('Spreadsheet ID:', this.config.spreadsheetId);

      // CORS Workaround: Use dynamic script injection instead of XMLHttpRequest
      await this.saveViaScriptTag(plot);

    } catch (error) {
      console.error('Error saving plot to Google Sheets:', error);
      console.error('Error details:', error);
      // Don't throw error to allow local saving to continue
      console.log('Plot saved locally, Google Sheets sync failed');
    }
  }

  /**
   * CORS workaround: Use script tag injection for cross-origin requests
   */
  private async saveViaScriptTag(plot: Plot): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Create a unique callback name
      const callbackName = `googleSheetsCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the callback function
      (window as any)[callbackName] = (response: any) => {
        console.log('Google Sheets save response:', response);
        // Clean up after a short delay to ensure callback completes
        setTimeout(() => {
          delete (window as any)[callbackName];
          if (script && document.head.contains(script)) {
            document.head.removeChild(script);
          }
        }, 100);
        resolve();
      };

      // Prepare the data
      const plotData = encodeURIComponent(JSON.stringify({
        id: plot.id,
        plotNumber: plot.plotNumber,
        status: plot.status,
        dimensions: plot.dimensions,
        totalCost: plot.totalCost,
        surveyNumber: plot.surveyNumber,
        owner: plot.owner,
        ratePerSqMeter: plot.ratePerSqMeter,
        governmentRate: plot.governmentRate,
        createdAt: plot.createdAt,
        updatedAt: plot.updatedAt,
        payments: plot.payments,
        purchaser: plot.purchaser
      }));
      
      console.log('Sending plot data to Google Sheets:', {
        plotId: plot.id,
        paymentsCount: plot.payments?.length || 0,
        hasPurchaser: !!plot.purchaser,
        purchaserData: plot.purchaser
      });

      // Create script tag with JSONP request
      const script = document.createElement('script');
      script.src = `${this.config.webAppUrl}?action=savePlot&plotData=${plotData}&spreadsheetId=${this.config.spreadsheetId}&callback=${callbackName}`;
      
      script.onerror = () => {
        console.error('Failed to load Google Apps Script');
        delete (window as any)[callbackName];
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
        reject(new Error('Failed to contact Google Apps Script'));
      };

      // Add script to DOM to trigger request
      document.head.appendChild(script);
      
            // Timeout after 10 seconds (reduced from 15 for faster retry)
      setTimeout(() => {
        if ((window as any)[callbackName]) {
          console.warn('Google Sheets request timed out');
          delete (window as any)[callbackName];
          if (script && document.head.contains(script)) {
            document.head.removeChild(script);
          }
          reject(new Error('Request timed out'));
        }
      }, 10000);
    });
  }

  /**
   * Save payment data to Google Sheets via middleware
   */
  async savePayment(payment: Payment, plotId: string): Promise<void> {
    try {
      if (!this.config.webAppUrl) {
        console.warn('WebApp URL not configured, skipping Google Sheets save');
        return;
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const payload = {
        action: 'savePayment',
        data: {
          payment: payment,
          plotId: plotId,
          spreadsheetId: this.config.spreadsheetId
        }
      };

      const response = await this.http.post(this.config.webAppUrl, payload, { headers }).toPromise();
      console.log('Payment saved to Google Sheets:', response);

    } catch (error) {
      console.error('Error saving payment to Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Generic method to read data from a sheet
   */
  private async readSheet(sheetName: string): Promise<any[][]> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}?key=${this.config.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: SheetData = await response.json();
      return data.values || [];
    } catch (error) {
      console.error(`Error reading sheet ${sheetName}:`, error);
      return [];
    }
  }

  /**
   * Generic method to append a row to a sheet
   */
  private async appendSheetRow(sheetName: string, row: any[]): Promise<void> {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${sheetName}:append?valueInputOption=RAW&key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [row]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error appending row to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Generic method to update a specific row in a sheet
   */
  private async updateSheetRow(sheetName: string, rowIndex: number, row: any[]): Promise<void> {
    try {
      const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}?valueInputOption=RAW&key=${this.config.apiKey}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [row]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error updating row in sheet ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Convert sheet data to Plot objects
   */
  private convertSheetsDataToPlots(plotsData: any[][], paymentsData: any[][], customersData: any[][]): Plot[] {
    const plots: Plot[] = [];
    
    // Skip header row
    for (let i = 1; i < plotsData.length; i++) {
      const row = plotsData[i];
      if (!row || row.length === 0) continue;

      try {
        const plot: Plot = {
          id: row[0] || '',
          surveyNumber: row[1] as SurveyNumber || SurveyNumber.SURVEY_152_1,
          plotNumber: row[2] || '',
          dimensions: {
            length: parseFloat(row[3]) || 0,
            width: parseFloat(row[4]) || 0,
            area: parseFloat(row[5]) || 0
          },
          status: (row[6] as PlotStatus) || PlotStatus.AVAILABLE,
          owner: (row[7] as OwnerType) || OwnerType.BAPURAO,
          ratePerSqMeter: parseFloat(row[8]) || 0,
          totalCost: parseFloat(row[9]) || 0,
          governmentRate: parseFloat(row[10]) || 0,
          purchaser: this.findCustomerForPlot(customersData, row[0]),
          payments: this.findPaymentsForPlot(paymentsData, row[0]),
          createdAt: new Date(row[11]) || new Date(),
          updatedAt: new Date(row[12]) || new Date()
        };

        plots.push(plot);
      } catch (error) {
        console.error(`Error parsing plot data for row ${i}:`, error);
      }
    }

    return plots;
  }

  /**
   * Convert Plot object to sheet row format
   */
  private plotToSheetRow(plot: Plot): any[] {
    return [
      plot.id,
      plot.surveyNumber,
      plot.plotNumber,
      plot.dimensions.length,
      plot.dimensions.width, 
      plot.dimensions.area,
      plot.status,
      plot.owner,
      plot.ratePerSqMeter,
      plot.totalCost,
      plot.governmentRate,
      plot.createdAt.toISOString(),
      plot.updatedAt.toISOString()
    ];
  }

  /**
   * Convert Payment object to sheet row format
   */
  private paymentToSheetRow(payment: Payment, plotId: string): any[] {
    return [
      payment.id,
      plotId,
      payment.amount,
      payment.date.toISOString(),
      payment.mode,
      payment.description || '',
      payment.receiptNumber || '',
      payment.plotNumber || '',
      payment.surveyNumber || '',
      payment.customerName || ''
    ];
  }

  /**
   * Helper methods
   */
  private findPlotRowIndex(plotsData: any[][], plotId: string): number {
    for (let i = 1; i < plotsData.length; i++) {
      if (plotsData[i][0] === plotId) {
        return i - 1; // Return 0-based index
      }
    }
    return -1;
  }

  private findPaymentRowIndex(paymentsData: any[][], paymentId: string): number {
    for (let i = 1; i < paymentsData.length; i++) {
      if (paymentsData[i][0] === paymentId) {
        return i - 1;
      }
    }
    return -1;
  }

  private findCustomerForPlot(customersData: any[][], plotId: string): any {
    for (let i = 1; i < customersData.length; i++) {
      if (customersData[i][1] === plotId) {
        return {
          name: customersData[i][2] || '',
          mobile: customersData[i][3] || '',
          email: customersData[i][4] || '',
          address: customersData[i][5] || '',
          registrationDate: new Date(customersData[i][6]) || new Date()
        };
      }
    }
    return undefined;
  }

  private findPaymentsForPlot(paymentsData: any[][], plotId: string): Payment[] {
    const payments: Payment[] = [];
    
    for (let i = 1; i < paymentsData.length; i++) {
      if (paymentsData[i][1] === plotId) {
        payments.push({
          id: paymentsData[i][0] || '',
          amount: parseFloat(paymentsData[i][2]) || 0,
          date: new Date(paymentsData[i][3]) || new Date(),
          mode: (paymentsData[i][4] as PaymentMode) || PaymentMode.CASH,
          description: paymentsData[i][5] || '',
          receiptNumber: paymentsData[i][6] || '',
          plotNumber: paymentsData[i][7] || '',
          surveyNumber: paymentsData[i][8] || '',
          customerName: paymentsData[i][9] || ''
        });
      }
    }
    
    return payments;
  }

  private async saveCustomer(customer: any, plotId: string): Promise<void> {
    try {
      if (!this.config.webAppUrl) {
        console.warn('WebApp URL not configured, skipping Google Sheets save');
        return;
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const payload = {
        action: 'saveCustomer',
        data: {
          customer: customer,
          plotId: plotId,
          spreadsheetId: this.config.spreadsheetId
        }
      };

      const response = await this.http.post(this.config.webAppUrl, payload, { headers }).toPromise();
      console.log('Customer saved to Google Sheets:', response);

    } catch (error) {
      console.error('Error saving customer to Google Sheets:', error);
      throw error;
    }
  }

  private findCustomerRowIndex(customersData: any[][], plotId: string): number {
    for (let i = 1; i < customersData.length; i++) {
      if (customersData[i][1] === plotId) {
        return i - 1;
      }
    }
    return -1;
  }

  private async createSheetsIfNotExist(): Promise<void> {
    // This would require Google Sheets API write permissions
    // For now, we assume the sheets exist
    console.log('Checking if sheets exist...');
  }

  private async setupSheetHeaders(): Promise<void> {
    try {
      // Setup headers for Plots sheet
      const plotsHeaders = [
        'ID', 'Survey Number', 'Plot Number', 'Length', 'Width', 'Area',
        'Status', 'Owner', 'Rate Per SqM', 'Total Cost', 'Government Rate',
        'Created At', 'Updated At'
      ];

      // Setup headers for Payments sheet  
      const paymentsHeaders = [
        'Payment ID', 'Plot ID', 'Amount', 'Date', 'Mode', 'Description',
        'Receipt Number', 'Plot Number', 'Survey Number', 'Customer Name'
      ];

      // Setup headers for Customers sheet
      const customersHeaders = [
        'Customer ID', 'Plot ID', 'Name', 'Mobile', 'Email', 'Address', 'Registration Date'
      ];

      // Note: This would require write permissions to set headers
      console.log('Sheet headers would be set up here');
    } catch (error) {
      console.error('Error setting up sheet headers:', error);
    }
  }
}