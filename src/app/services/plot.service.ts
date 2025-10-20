import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Plot, PlotStatus, SurveyNumber, DashboardStats, SurveySummary, OwnerType, PaymentMode } from '../models/plot.model';
import { SURVEY_CONFIGS } from '../models/survey-config.model';
import { GoogleSheetsService } from './google-sheets.service';
import { PlotGeneratorService } from './plot-generator.service';

@Injectable({
  providedIn: 'root'
})
export class PlotService {
  private plots: Plot[] = [];
  private plotsSubject = new BehaviorSubject<Plot[]>([]);
  public plots$ = this.plotsSubject.asObservable();
  private useGoogleSheets = true; // Temporarily disable Google Sheets to test local functionality

  constructor(
    private googleSheetsService: GoogleSheetsService,
    private plotGeneratorService: PlotGeneratorService
  ) {
    this.initializePlots();
  }

  private initializePlots(): void {
    if (this.useGoogleSheets) {
      // Load from Google Sheets
      this.loadFromGoogleSheets();
    } else {
      // Use mock data for development/testing
      this.initializeMockData();
    }
  }

  private loadFromGoogleSheets(): void {
    this.googleSheetsService.getPlots().subscribe({
      next: (plots) => {
        this.plots = plots;
        this.plotsSubject.next(this.plots);
      },
      error: (error) => {
        console.error('Error loading plots from Google Sheets:', error);
        // Fallback to mock data if Google Sheets fails
        this.initializeMockData();
      }
    });
  }

  /**
   * Get the current plot count
   */
  get plotCount(): number {
    return this.plots.length;
  }

  /**
   * Get all plots (readonly)
   */
  get allPlots(): Plot[] {
    return [...this.plots];
  }

  /**
   * Enable Google Sheets integration
   */
  enableGoogleSheets(): void {
    this.useGoogleSheets = true;
    this.loadFromGoogleSheets();
  }

  /**
   * Disable Google Sheets integration (use mock data)
   */
  disableGoogleSheets(): void {
    this.useGoogleSheets = false;
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Use the plot generator to create all 290 plots
    console.log('Generating 290 plots from survey specifications...');
    
    // Generate all plots (all as AVAILABLE by default)
    const generatedPlots = this.plotGeneratorService.generateAllPlots();
    
    // Get summary for logging
    const summary = this.plotGeneratorService.getPlotSummary(generatedPlots);
    console.log('Plot generation summary:', summary);
    
    this.plots = generatedPlots;
    this.plotsSubject.next(this.plots);
    
    console.log(`Successfully loaded ${this.plots.length} plots (all AVAILABLE for admin to manage):`);
    console.log(`- Survey 152/1: ${this.plots.filter(p => p.surveyNumber === SurveyNumber.SURVEY_152_1).length} plots`);
    console.log(`- Survey 152/2: ${this.plots.filter(p => p.surveyNumber === SurveyNumber.SURVEY_152_2).length} plots`);
    console.log(`- Survey 152/3: ${this.plots.filter(p => p.surveyNumber === SurveyNumber.SURVEY_152_3).length} plots`);
  }

  getAllPlots(): Observable<Plot[]> {
    return this.plots$;
  }

  /**
   * Re-generate all plots from specifications (useful for reset/initialization)
   */
  regenerateAllPlots(includeSampleData: boolean = false, syncToGoogleSheets: boolean = false): void {
    console.log('Regenerating all 290 plots...');
    
    // Generate all plots
    const generatedPlots = this.plotGeneratorService.generateAllPlots();
    
    // Add sample sold plots if requested
    const finalPlots = includeSampleData ? 
      this.plotGeneratorService.generateSampleSoldPlots(generatedPlots, 25) : 
      generatedPlots;
    
    // Get summary for logging
    const summary = this.plotGeneratorService.getPlotSummary(finalPlots);
    console.log('Plot regeneration summary:', summary);
    
    this.plots = finalPlots;
    this.plotsSubject.next(this.plots);
    
    const statusMessage = includeSampleData ? 
      `Successfully regenerated ${this.plots.length} plots with 25 sample sales` :
      `Successfully regenerated ${this.plots.length} plots (all AVAILABLE for admin management)`;
    console.log(statusMessage);
    
    // Only sync to Google Sheets if explicitly requested
    if (syncToGoogleSheets && this.useGoogleSheets) {
      console.log('Saving generated plots to Google Sheets...');
      this.savePlotsToGoogleSheetsBatch(finalPlots);
    }
  }

  /**
   * Save multiple plots to Google Sheets sequentially to maintain insertion order
   */
  private async savePlotsToGoogleSheetsBatch(plots: Plot[]): Promise<void> {
    // Sort plots to maintain consistent order: Survey 152/1, then 152/2, then 152/3, sorted by plot number
    const sortedPlots = [...plots].sort((a, b) => {
      // First sort by survey number
      if (a.surveyNumber !== b.surveyNumber) {
        return a.surveyNumber.localeCompare(b.surveyNumber);
      }
      // Then sort by plot number (numerically)
      const aNum = parseInt(a.plotNumber) || 0;
      const bNum = parseInt(b.plotNumber) || 0;
      return aNum - bNum;
    });

    console.log(`Saving ${sortedPlots.length} plots sequentially to Google Sheets in order...`);
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sortedPlots.length; i++) {
      const plot = sortedPlots[i];
      console.log(`Saving plot ${i + 1}/${sortedPlots.length}: ${plot.surveyNumber}-${plot.plotNumber}`);
      
      try {
        await this.googleSheetsService.savePlot(plot);
        savedCount++;
        console.log(`✅ Plot ${i + 1} saved successfully (${savedCount}/${sortedPlots.length})`);
        
        // Add delay between each plot to avoid overwhelming the API
        if (i < sortedPlots.length - 1) {
          await this.delay(500); // Wait 500ms between each plot
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error saving plot ${i + 1} (${plot.surveyNumber}-${plot.plotNumber}):`, error);
        // Continue with next plot even if one fails
      }
    }
    
    console.log(`🎉 Finished saving plots to Google Sheets! ✅ ${savedCount} saved, ❌ ${errorCount} failed`);
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export all plots to CSV format for manual spreadsheet import
   * Column order matches the Google Apps Script headers exactly
   */
  exportPlotsToCSV(): string {
    console.log('Starting CSV export...');
    console.log('Total plots in service:', this.plots.length);
    
    if (this.plots.length === 0) {
      console.warn('No plots found! Make sure to load plots first.');
      return 'ID,Survey Number,Plot Number,Length,Width,Area,Status,Owner,Rate Per SqM,Total Cost,Government Rate,Created At,Updated At\n';
    }

    // Sort plots to maintain consistent order: Survey 152/1, then 152/2, then 152/3, sorted by plot number
    const sortedPlots = [...this.plots].sort((a, b) => {
      // First sort by survey number
      if (a.surveyNumber !== b.surveyNumber) {
        return a.surveyNumber.localeCompare(b.surveyNumber);
      }
      // Then sort by plot number (numerically)
      const aNum = parseInt(a.plotNumber) || 0;
      const bNum = parseInt(b.plotNumber) || 0;
      return aNum - bNum;
    });

    console.log('Sorted plots count:', sortedPlots.length);
    console.log('First few plots:', sortedPlots.slice(0, 3).map(p => `${p.surveyNumber}-${p.plotNumber}`));

    // CSV Header - matches Google Apps Script exactly
    const header = 'ID,Survey Number,Plot Number,Length,Width,Area,Status,Owner,Rate Per SqM,Total Cost,Government Rate,Created At,Updated At';
    
    // CSV Rows - matches the Google Apps Script column order
    const rows = sortedPlots.map(plot => {
      const createdDate = plot.createdAt ? plot.createdAt.toISOString() : new Date().toISOString();
      const updatedDate = plot.updatedAt ? plot.updatedAt.toISOString() : new Date().toISOString();
      
      return [
        plot.id,                           // Column 1: ID
        plot.surveyNumber,                 // Column 2: Survey Number
        plot.plotNumber,                   // Column 3: Plot Number
        plot.dimensions.length,            // Column 4: Length
        plot.dimensions.width,             // Column 5: Width
        plot.dimensions.area,              // Column 6: Area
        plot.status,                       // Column 7: Status
        plot.owner,                        // Column 8: Owner
        plot.ratePerSqMeter,              // Column 9: Rate Per SqM
        plot.totalCost,                   // Column 10: Total Cost
        plot.governmentRate || '',        // Column 11: Government Rate
        createdDate,                      // Column 12: Created At
        updatedDate                       // Column 13: Updated At
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [header, ...rows].join('\n');
    console.log('CSV Export completed with', sortedPlots.length, 'plots');
    console.log('CSV content length:', csvContent.length);
    console.log('First few lines of CSV:', csvContent.split('\n').slice(0, 3));
    return csvContent;
  }

  /**
   * Download CSV file for manual import
   */
  downloadPlotsAsCSV(): void {
    const csvContent = this.exportPlotsToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `indra-krishna-layout-plots-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Copy CSV data to clipboard for easy pasting
   */
  async copyPlotsToClipboard(): Promise<void> {
    const csvContent = this.exportPlotsToCSV();
    
    try {
      await navigator.clipboard.writeText(csvContent);
      console.log('Plot data copied to clipboard - ready to paste into spreadsheet');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: show the data in console for manual copy
      console.log('CSV Data (copy this manually):');
      console.log(csvContent);
    }
  }

  async syncAllPlotsToGoogleSheets(): Promise<void> {
    if (!this.useGoogleSheets) {
      throw new Error('Google Sheets integration is not enabled');
    }
    
    if (this.plots.length === 0) {
      console.log('No plots to sync');
      return;
    }
    
    console.log(`Starting sync of ${this.plots.length} plots to Google Sheets...`);
    await this.savePlotsToGoogleSheetsBatch(this.plots);
  }

  getPlotsBySurvey(surveyNumber: SurveyNumber): Plot[] {
    return this.plots.filter(plot => plot.surveyNumber === surveyNumber);
  }

  getPlotById(id: string): Plot | undefined {
    return this.plots.find(plot => plot.id === id);
  }

  /**
   * Refresh a specific plot from Google Sheets and return the updated plot
   */
  refreshPlotFromGoogleSheets(plotId: string): Observable<Plot | undefined> {
    return new Observable(observer => {
      if (!this.useGoogleSheets) {
        observer.next(this.getPlotById(plotId));
        observer.complete();
        return;
      }

      // Reload all plots from Google Sheets to get the latest data
      this.googleSheetsService.getPlots().subscribe({
        next: (plots) => {
          this.plots = plots;
          this.plotsSubject.next(this.plots);
          
          // Find and return the specific plot
          const refreshedPlot = this.plots.find(plot => plot.id === plotId);
          observer.next(refreshedPlot);
          observer.complete();
        },
        error: (error) => {
          console.error('Error refreshing plot from Google Sheets:', error);
          // Return the local plot if refresh fails
          observer.next(this.getPlotById(plotId));
          observer.complete();
        }
      });
    });
  }

  updatePlot(updatedPlot: Plot): void {
    const index = this.plots.findIndex(plot => plot.id === updatedPlot.id);
    if (index !== -1) {
      updatedPlot.updatedAt = new Date();
      this.plots[index] = updatedPlot;
      this.plotsSubject.next([...this.plots]);

      // Save to Google Sheets if enabled
      if (this.useGoogleSheets) {
        this.googleSheetsService.savePlot(updatedPlot).catch(error => {
          console.error('Error saving plot to Google Sheets:', error);
        });
      }
    }
  }

  updatePlotStatus(plotId: string, status: PlotStatus): void {
    const plot = this.getPlotById(plotId);
    if (plot) {
      plot.status = status;
      plot.updatedAt = new Date();
      this.updatePlot(plot);
    }
  }

  addPlot(newPlotData: Partial<Plot>): Plot {
    // Check for duplicate plot number in the same survey
    const existingPlot = this.plots.find(plot => 
      plot.surveyNumber === newPlotData.surveyNumber && 
      plot.plotNumber === newPlotData.plotNumber
    );
    
    if (existingPlot) {
      throw new Error(`Plot number ${newPlotData.plotNumber} already exists in survey ${newPlotData.surveyNumber}`);
    }

    // Generate a unique ID for the new plot
    const plotId = `${newPlotData.surveyNumber}-${newPlotData.plotNumber}-${Date.now()}`;
    
    // Create the new plot with default values
    const newPlot: Plot = {
      id: plotId,
      surveyNumber: newPlotData.surveyNumber || SurveyNumber.SURVEY_152_1,
      plotNumber: newPlotData.plotNumber || '',
      dimensions: newPlotData.dimensions || { length: 0, width: 0, area: 0 },
      status: newPlotData.status || PlotStatus.AVAILABLE,
      owner: newPlotData.owner || OwnerType.JOINT,
      ratePerSqMeter: newPlotData.ratePerSqMeter || 0,
      totalCost: newPlotData.totalCost || 0,
      governmentRate: newPlotData.governmentRate || 0,
      purchaser: newPlotData.purchaser,
      payments: newPlotData.payments || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to the plots array
    this.plots.push(newPlot);
    this.plotsSubject.next([...this.plots]);

    // Save to Google Sheets if enabled
    if (this.useGoogleSheets) {
      this.googleSheetsService.savePlot(newPlot).catch(error => {
        console.error('Error saving new plot to Google Sheets:', error);
      });
    }

    return newPlot;
  }

  getDashboardStats(): Observable<DashboardStats> {
    return new Observable(observer => {
      const surveys = Object.values(SurveyNumber);
      const surveySummaries: SurveySummary[] = surveys.map(surveyNumber => {
        const surveyPlots = this.getPlotsBySurvey(surveyNumber);
        
        return {
          surveyNumber,
          totalPlots: surveyPlots.length,
          availablePlots: surveyPlots.filter(p => p.status === PlotStatus.AVAILABLE).length,
          preBookedPlots: surveyPlots.filter(p => p.status === PlotStatus.PRE_BOOKED).length,
          soldPlots: surveyPlots.filter(p => p.status === PlotStatus.SOLD).length,
          totalArea: surveyPlots.reduce((sum, p) => sum + p.dimensions.area, 0),
          soldArea: surveyPlots
            .filter(p => p.status === PlotStatus.SOLD)
            .reduce((sum, p) => sum + p.dimensions.area, 0),
          totalRevenue: surveyPlots
            .filter(p => p.status === PlotStatus.SOLD)
            .reduce((sum, p) => sum + p.payments.reduce((pSum, payment) => pSum + payment.amount, 0), 0),
          pendingAmount: surveyPlots
            .filter(p => p.status === PlotStatus.SOLD)
            .reduce((sum, p) => {
              const totalPaid = p.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
              return sum + (p.totalCost - totalPaid);
            }, 0)
        };
      });

      const stats: DashboardStats = {
        totalPlots: this.plots.length,
        totalSoldPlots: this.plots.filter(p => p.status === PlotStatus.SOLD).length,
        totalRevenue: surveySummaries.reduce((sum, s) => sum + s.totalRevenue, 0),
        pendingAmount: surveySummaries.reduce((sum, s) => sum + s.pendingAmount, 0),
        surveySummaries
      };

      observer.next(stats);
      observer.complete();
    });
  }

  getPlotsByStatus(status: PlotStatus): Plot[] {
    return this.plots.filter(plot => plot.status === status);
  }

  searchPlots(query: string): Plot[] {
    const searchQuery = query.toLowerCase();
    return this.plots.filter(plot => 
      plot.plotNumber.toLowerCase().includes(searchQuery) ||
      plot.surveyNumber.toLowerCase().includes(searchQuery) ||
      plot.purchaser?.name.toLowerCase().includes(searchQuery) ||
      plot.purchaser?.mobile.includes(searchQuery)
    );
  }

  async testGoogleSheetsConnection(): Promise<boolean> {
    if (!this.useGoogleSheets) {
      throw new Error('Google Sheets integration is disabled');
    }
    
    return this.googleSheetsService.testConnectionManually();
  }

  /**
   * Clear all plots from memory
   */
  clearAllPlots(): void {
    this.plots = [];
    this.plotsSubject.next([]);
    console.log('All plots cleared from memory');
  }
}