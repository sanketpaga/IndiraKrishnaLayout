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
import { DashboardStats, SurveySummary } from '../models/plot.model';
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
      
      // Wait a moment for Google Sheets data to load, then load dashboard
      setTimeout(() => {
        this.loadDashboardData();
      }, 1000);
    } else {
      // Load dashboard data immediately if no Google Sheets
      this.loadDashboardData();
    }
  }

  loadDashboardData() {
    this.loading = true;
    
    // If Google Sheets is enabled, ensure we have the latest data
    if (this.isGoogleSheetsEnabled) {
      console.log('Refreshing data from Google Sheets...');
      
      // Show loading toast
      this.toastController.create({
        message: 'Loading data...',
        duration: 2000,
        position: 'bottom',
        color: 'primary'
      }).then(toast => toast.present());
      
      this.plotService.enableGoogleSheets(); // This will reload from Google Sheets
      
      // Subscribe to plot changes to wait for actual data load
      const subscription = this.plotService.getAllPlots().subscribe({
        next: (plots) => {
          console.log(`Received ${plots.length} plots from PlotService`);
          if (plots.length > 0) {
            // Data is loaded, now get dashboard stats
            subscription.unsubscribe();
            this.getDashboardStats();
          }
        },
        error: (error) => {
          console.error('Error loading plots:', error);
          subscription.unsubscribe();
          this.getDashboardStats();
        }
      });
      
      // Fallback timeout in case data doesn't load
      setTimeout(() => {
        subscription.unsubscribe();
        this.getDashboardStats();
      }, 5000);
    } else {
      this.getDashboardStats();
    }
  }

  private getDashboardStats() {
    this.plotService.getDashboardStats().subscribe({
      next: (stats) => {
        this.dashboardStats = stats;
        this.loading = false;
        console.log('Dashboard stats loaded:', stats);
        
        if (stats.totalPlots === 0 && this.isGoogleSheetsEnabled) {
          // Show a message if no plots are found but Google Sheets is enabled
          this.toastController.create({
            message: 'No plots found in Google Sheets. Use Admin Panel to load data.',
            duration: 4000,
            position: 'bottom',
            color: 'warning'
          }).then(toast => toast.present());
        }
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.loading = false;
        
        this.toastController.create({
          message: 'Error loading data. Check console for details.',
          duration: 3000,
          position: 'bottom',
          color: 'danger'
        }).then(toast => toast.present());
      }
    });
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