import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
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
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonProgressBar, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  businessOutline, 
  trendingUpOutline, 
  cashOutline, 
  statsChartOutline, 
  gridOutline, 
  grid,
  business,
  refresh, 
  card,
  settings
} from 'ionicons/icons';
import { PlotService } from '../services/plot.service';
import { DashboardStats, SurveySummary, Plot, PlotStatus, SurveyNumber } from '../models/plot.model';
import { ToastController } from '@ionic/angular';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonSpinner, 
    CommonModule,
    FormsModule,
    RouterModule,
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
    IonRefresher,
    IonRefresherContent,
    IonButton,
    IonProgressBar
  ]
})
export class DashboardPage implements OnInit {
  dashboardStats: DashboardStats | null = null;
  loading = true;
  isGoogleSheetsEnabled = false;

  constructor(
    private plotService: PlotService,
    private toastController: ToastController
  ) {
    addIcons({
      statsChartOutline,
      businessOutline,
      trendingUpOutline,
      cashOutline,
      grid,
      business,
      card,
      refresh,
      settings,
      gridOutline,
      homeOutline
    });
  }

  ngOnInit() {
    // Auto-enable Google Sheets integration if Web App URL is configured
    if (environment.googleSheets?.webAppUrl) {
      console.log('Google Sheets Web App URL detected, auto-enabling integration');
      this.isGoogleSheetsEnabled = true;
      this.plotService.enableGoogleSheets();
    }
    
    // Always load dashboard data immediately
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading = true;
    console.log('Dashboard loading started - loading state:', this.loading);
    
    // Add a small delay to ensure spinner shows before data processing
    setTimeout(() => {
      // Simply subscribe to the plots observable and calculate dashboard stats from it
      this.plotService.plots$.subscribe({
        next: (plots) => {
          console.log(`Dashboard received ${plots.length} plots`);
          
          // Calculate dashboard stats from plots data
          this.calculateDashboardStatsFromPlots(plots);
          
          // Only hide spinner if we have data OR if Google Sheets is disabled
          // This prevents hiding spinner on initial empty response when Google Sheets is still loading
          if (plots.length > 0 || !this.isGoogleSheetsEnabled) {
            this.loading = false;
            console.log('Dashboard loading completed - loading state:', this.loading);
          } else {
            console.log('Still waiting for Google Sheets data...');
          }
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.loading = false;
        }
      });
    }, 100);
  }

  private calculateDashboardStatsFromPlots(plots: Plot[]) {
    // Calculate stats directly from plots array
    const totalPlots = plots.length;
    const soldPlots = plots.filter(p => p.status === PlotStatus.SOLD).length;
    const preBookedPlots = plots.filter(p => p.status === PlotStatus.PRE_BOOKED).length;
    const availablePlots = plots.filter(p => p.status === PlotStatus.AVAILABLE).length;
    
    let totalRevenue = 0;
    let pendingAmount = 0;
    
    plots.forEach(plot => {
      if (plot.status === PlotStatus.SOLD || plot.status === PlotStatus.PRE_BOOKED) {
        const totalPaid = plot.payments.reduce((sum, payment) => sum + payment.amount, 0);
        totalRevenue += totalPaid;
        pendingAmount += Math.max(0, plot.totalCost - totalPaid);
      }
    });
    
    // Group by survey
    const surveyGroups: { [key: string]: Plot[] } = {};
    plots.forEach(plot => {
      if (!surveyGroups[plot.surveyNumber]) {
        surveyGroups[plot.surveyNumber] = [];
      }
      surveyGroups[plot.surveyNumber].push(plot);
    });
    
    const surveySummaries = Object.keys(surveyGroups).map(surveyKey => {
      const surveyPlots = surveyGroups[surveyKey];
      const surveyTotalPlots = surveyPlots.length;
      const surveySoldPlots = surveyPlots.filter(p => p.status === PlotStatus.SOLD).length;
      const surveyPreBookedPlots = surveyPlots.filter(p => p.status === PlotStatus.PRE_BOOKED).length;
      const surveyAvailablePlots = surveyPlots.filter(p => p.status === PlotStatus.AVAILABLE).length;
      
      let surveyTotalRevenue = 0;
      let surveyPendingAmount = 0;
      let surveyTotalArea = 0;
      
      surveyPlots.forEach(plot => {
        surveyTotalArea += plot.dimensions.area;
        if (plot.status === PlotStatus.SOLD || plot.status === PlotStatus.PRE_BOOKED) {
          const totalPaid = plot.payments.reduce((sum, payment) => sum + payment.amount, 0);
          surveyTotalRevenue += totalPaid;
          surveyPendingAmount += Math.max(0, plot.totalCost - totalPaid);
        }
      });
      
      return {
        surveyNumber: surveyKey as SurveyNumber,
        totalPlots: surveyTotalPlots,
        soldPlots: surveySoldPlots,
        preBookedPlots: surveyPreBookedPlots,
        availablePlots: surveyAvailablePlots,
        totalRevenue: surveyTotalRevenue,
        pendingAmount: surveyPendingAmount,
        totalArea: surveyTotalArea,
        soldArea: surveyPlots.filter(p => p.status === PlotStatus.SOLD)
          .reduce((sum: number, plot) => sum + plot.dimensions.area, 0)
      };
    });
    
    this.dashboardStats = {
      totalPlots,
      totalSoldPlots: soldPlots,
      totalRevenue,
      pendingAmount,
      surveySummaries
    };
    
    console.log('Dashboard stats calculated:', this.dashboardStats);
  }

  onRefresh(event: any) {
    this.loadDashboardData();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
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

  getProgressValue(sold: number, total: number): number {
    return total > 0 ? (sold / total) : 0;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'sold':
        return 'success';
      case 'pre-booked':
        return 'warning';
      case 'available':
        return 'light';
      default:
        return 'medium';
    }
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

  toggleGoogleSheets(event: any): void {
    this.isGoogleSheetsEnabled = event.detail.checked;
    
    if (this.isGoogleSheetsEnabled) {
      this.plotService.enableGoogleSheets();
    } else {
      this.plotService.disableGoogleSheets();
    }
  }
}