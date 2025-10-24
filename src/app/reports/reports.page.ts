import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Chart } from 'chart.js';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonModal,
  IonList,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonProgressBar,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  analyticsOutline,
  trendingUpOutline,
  downloadOutline,
  filterOutline,
  calendarOutline,
  businessOutline,
  statsChartOutline,
  documentTextOutline,
  pieChartOutline, personOutline, barChartOutline } from 'ionicons/icons';
import { PlotService } from '../services/plot.service';
import { ReportsService, YearlyReport, SalesAnalytics, SalesBySurvey, SalesByOwner, SalesByYear } from '../services/reports.service';
import { ChartService } from '../services/chart.service';
import { Plot, SurveyNumber, PlotStatus } from '../models/plot.model';
import { ReportFilter } from '../models/survey-config.model';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonModal,
    IonList,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonProgressBar
  ]
})
export class ReportsPage implements OnInit, OnDestroy, AfterViewInit {
  // ViewChild references for chart canvases
  @ViewChild('surveyChart', { static: false }) surveyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ownerChart', { static: false }) ownerChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('yearTrendChart', { static: false }) yearTrendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyChart', { static: false }) monthlyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart', { static: false }) revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private plotsSubscription: Subscription | null = null;
  
  // Chart instances
  private surveyChart: Chart | null = null;
  private ownerChart: Chart | null = null;
  private yearTrendChart: Chart | null = null;
  private monthlyChart: Chart | null = null;
  private revenueChart: Chart | null = null;
  
  // Data
  plots: Plot[] = [];
  salesAnalytics: SalesAnalytics | null = null;
  yearlyReports: YearlyReport[] = [];
  currentYearReport: YearlyReport | null = null;
  
  // New specific reports
  salesBySurvey: SalesBySurvey[] = [];
  salesByOwner: SalesByOwner[] = [];
  salesByYear: SalesByYear[] = [];
  
  // UI State
  loading = true;
  selectedSegment = 'overview';
  isPdfGenerating = false;
  
  // Filters
  isFilterModalOpen = false;
  currentFilter: ReportFilter = {};
  
  // Available years for filtering
  availableYears: number[] = [];
  
  constructor(
    private plotService: PlotService,
    private reportsService: ReportsService,
    private chartService: ChartService,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({filterOutline,downloadOutline,documentTextOutline,businessOutline,trendingUpOutline,analyticsOutline,statsChartOutline,calendarOutline,pieChartOutline,barChartOutline,personOutline});
  }

  ngOnInit() {
    this.loadReportsData();
  }

  ngAfterViewInit() {
    // Generate charts after view has been initialized
    setTimeout(() => {
      this.generateCharts();
    }, 100);
  }

  ngOnDestroy() {
    if (this.plotsSubscription) {
      this.plotsSubscription.unsubscribe();
    }
    // Destroy all chart instances
    this.destroyAllCharts();
  }

  loadReportsData() {
    this.loading = true;
    
    this.plotsSubscription = this.plotService.plots$.subscribe({
      next: (plots) => {
        this.plots = plots;
        this.generateReports();
        // Generate charts after data is loaded and view is initialized
        if (plots.length > 0) {
          setTimeout(() => {
            this.generateCharts();
          }, 100);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading plots for reports:', error);
        this.loading = false;
      }
    });
  }

  private generateReports() {
    // Generate sales analytics
    this.salesAnalytics = this.reportsService.generateSalesAnalytics(this.plots, this.currentFilter);
    
    // Generate yearly reports
    this.generateYearlyReports();
    
    // Get current year report
    const currentYear = new Date().getFullYear();
    this.currentYearReport = this.reportsService.generateYearlyReport(this.plots, currentYear);
    
    // Generate new specific reports
    this.salesBySurvey = this.reportsService.getSalesBySurvey(this.plots);
    this.salesByOwner = this.reportsService.getSalesByOwner(this.plots);
    this.salesByYear = this.reportsService.getSalesByYear(this.plots);
  }

  private generateYearlyReports() {
    // Get all unique years from sold plots
    const years = new Set<number>();
    this.plots.forEach(plot => {
      if (plot.status === PlotStatus.SOLD && plot.purchaser) {
        const year = this.getYearFromDate(plot.purchaser.registrationDate);
        if (year) {
          years.add(year);
        }
      }
    });
    
    this.availableYears = Array.from(years).sort((a, b) => b - a); // Latest first
    
    // Generate reports for each year
    this.yearlyReports = this.availableYears.map(year => 
      this.reportsService.generateYearlyReport(this.plots, year)
    );
  }

  private getYearFromDate(date: Date | string): number | null {
    try {
      if (date instanceof Date) {
        return date.getFullYear();
      }
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        return isNaN(parsedDate.getTime()) ? null : parsedDate.getFullYear();
      }
      return null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }

  onRefresh(event: any) {
    this.loadReportsData();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  openFilterModal() {
    this.isFilterModalOpen = true;
  }

  closeFilterModal() {
    this.isFilterModalOpen = false;
  }

  applyFilters() {
    this.generateReports();
    this.closeFilterModal();
    this.showToast('Filters applied successfully');
  }

  clearFilters() {
    this.currentFilter = {};
    this.generateReports();
    this.closeFilterModal();
    this.showToast('Filters cleared');
  }

  async exportToPDF() {
    if (this.isPdfGenerating) {
      return; // Prevent multiple clicks
    }

    console.log('Starting PDF export...');
    this.isPdfGenerating = true;
    this.cdr.detectChanges(); // Force change detection
    
    // Safety timeout to reset spinner if something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (this.isPdfGenerating) {
        console.warn('PDF export timeout - force resetting spinner');
        this.isPdfGenerating = false;
        this.cdr.detectChanges();
      }
    }, 30000); // 30 second timeout
    
    // Force change detection
    setTimeout(() => {
      console.log('isPdfGenerating set to:', this.isPdfGenerating);
    }, 100);
    
    try {
      // Add a small delay to ensure spinner is visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (this.selectedSegment === 'overview') {
        // Export the main content as PDF
        await this.reportsService.exportReportToPDF('reports-content', 'sales-overview-report');
        this.showToast('Overview report exported to PDF');
      } else {
        // Export comprehensive PDF with all data
        await this.reportsService.exportComprehensivePDF(
          this.salesBySurvey,
          this.salesByOwner,
          this.salesByYear
        );
        this.showToast('Comprehensive report exported to PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.showToast('Error exporting PDF report. Please try again.');
    } finally {
      // Clear the safety timeout
      clearTimeout(safetyTimeout);
      
      console.log('PDF export completed, spinner reset');
      
      // Always reset the loading state
      this.isPdfGenerating = false;
      
      // Force change detection to ensure UI updates
      this.cdr.detectChanges();
    }
  }

  async exportToCSV() {
    try {
      switch (this.selectedSegment) {
        case 'survey':
          await this.reportsService.exportSalesBySurveyCSV(this.salesBySurvey);
          this.showToast('Survey sales data exported to CSV');
          break;
        
        case 'owner':
          await this.reportsService.exportSalesByOwnerCSV(this.salesByOwner);
          this.showToast('Owner sales data exported to CSV');
          break;
        
        case 'year':
          await this.reportsService.exportSalesByYearCSV(this.salesByYear);
          this.showToast('Yearly sales data exported to CSV');
          break;
        
        default:
          // Export overview analytics
          if (this.salesAnalytics) {
            const exportData = [
              {
                metric: 'Total Plots',
                value: this.salesAnalytics.totalPlots
              },
              {
                metric: 'Sold Plots',
                value: this.salesAnalytics.soldPlots
              },
              {
                metric: 'Available Plots',
                value: this.salesAnalytics.availablePlots
              },
              {
                metric: 'Pre-booked Plots',
                value: this.salesAnalytics.preBookedPlots
              },
              {
                metric: 'Total Revenue (₹)',
                value: this.salesAnalytics.totalRevenue
              },
              {
                metric: 'Average Rate (₹/sq ft)',
                value: Math.round(this.salesAnalytics.averageRate)
              }
            ];
            
            await this.reportsService.exportToCSV(exportData, 'sales-overview');
            this.showToast('Overview analytics exported to CSV');
          }
          break;
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      this.showToast('Error exporting CSV data');
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-IN').format(num);
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }

  getSurveyDisplayName(surveyNumber: string): string {
    switch (surveyNumber) {
      case '152/1':
        return 'Survey 152/1 (Bapurao)';
      case '152/2':
        return 'Survey 152/2 (Narayanrao)';
      case '152/3':
        return 'Survey 152/3 (Shared)';
      default:
        return surveyNumber;
    }
  }

  getProgressValue(sold: number, total: number): number {
    return total > 0 ? (sold / total) : 0;
  }

  private generateCharts() {
    // Destroy existing charts first
    this.destroyAllCharts();

    // Generate charts if data is available
    this.generateSurveyChart();
    this.generateOwnerChart();
    this.generateYearTrendChart();
    this.generateRevenueChart();
    if (this.salesByYear.length > 0) {
      this.generateMonthlyChart(this.salesByYear[0]); // Show current/latest year
    }
  }

  private generateSurveyChart() {
    if (this.surveyChartRef && this.salesBySurvey.length > 0) {
      try {
        const config = this.chartService.createSurveyChartConfig(this.salesBySurvey);
        this.surveyChart = new Chart(this.surveyChartRef.nativeElement, config);
      } catch (error) {
        console.error('Error creating survey chart:', error);
      }
    }
  }

  private generateOwnerChart() {
    if (this.ownerChartRef && this.salesByOwner.length > 0) {
      try {
        const config = this.chartService.createOwnerChartConfig(this.salesByOwner);
        this.ownerChart = new Chart(this.ownerChartRef.nativeElement, config);
      } catch (error) {
        console.error('Error creating owner chart:', error);
      }
    }
  }

  private generateYearTrendChart() {
    if (this.yearTrendChartRef && this.salesByYear.length > 1) { // Need at least 2 years for trend
      try {
        const config = this.chartService.createYearTrendChartConfig(this.salesByYear);
        this.yearTrendChart = new Chart(this.yearTrendChartRef.nativeElement, config);
      } catch (error) {
        console.error('Error creating year trend chart:', error);
      }
    }
  }

  private generateMonthlyChart(yearData: SalesByYear) {
    if (this.monthlyChartRef && yearData) {
      try {
        const config = this.chartService.createMonthlyChartConfig(yearData, yearData.year);
        this.monthlyChart = new Chart(this.monthlyChartRef.nativeElement, config);
      } catch (error) {
        console.error('Error creating monthly chart:', error);
      }
    }
  }

  private generateRevenueChart() {
    if (this.revenueChartRef && this.salesBySurvey.length > 0) {
      try {
        const config = this.chartService.createRevenueChartConfig(this.salesBySurvey);
        this.revenueChart = new Chart(this.revenueChartRef.nativeElement, config);
      } catch (error) {
        console.error('Error creating revenue chart:', error);
      }
    }
  }

  private destroyAllCharts() {
    this.chartService.destroyChart(this.surveyChart);
    this.chartService.destroyChart(this.ownerChart);
    this.chartService.destroyChart(this.yearTrendChart);
    this.chartService.destroyChart(this.monthlyChart);
    this.chartService.destroyChart(this.revenueChart);
    
    this.surveyChart = null;
    this.ownerChart = null;
    this.yearTrendChart = null;
    this.monthlyChart = null;
    this.revenueChart = null;
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    // Regenerate charts when switching segments (small delay for DOM update)
    setTimeout(() => {
      this.generateCharts();
    }, 150);
  }
}