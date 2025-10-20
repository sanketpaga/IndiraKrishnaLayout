import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { PlotService } from '../services/plot.service';
import { DashboardStats } from '../models/plot.model';
import { environment } from '../../environments/environment';
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
  IonItem,
  IonLabel,
  IonToggle,
  IonNote,
  IonList,
  IonButtons,
  IonBackButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  serverOutline,
  documentTextOutline,
  cloudOutline,
  informationCircleOutline,
  refresh,
  barChartOutline,
  peopleOutline,
  trashOutline,
  downloadOutline,
  copyOutline,
  settingsOutline,
  cloudUploadOutline,
  arrowBackOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [
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
    IonButton,
    IonItem,
    IonLabel,
    IonToggle,
    IonNote,
    IonList,
    IonButtons,
    IonBackButton
  ]
})
export class AdminPage implements OnInit {
  isGoogleSheetsEnabled = false;

  constructor(
    private plotService: PlotService,
    private toastController: ToastController
  ) {
    addIcons({
      serverOutline,
      documentTextOutline,
      cloudOutline,
      informationCircleOutline,
      refresh,
      barChartOutline,
      peopleOutline,
      trashOutline,
      downloadOutline,
      copyOutline,
      settingsOutline,
      cloudUploadOutline,
      arrowBackOutline
    });
  }

  ngOnInit() {
    // Check if Google Sheets is enabled based on environment configuration
    this.isGoogleSheetsEnabled = !!environment.googleSheets?.webAppUrl;
    console.log('Admin page loaded. Google Sheets enabled:', this.isGoogleSheetsEnabled);
  }

  getTotalPlots(): number {
    return this.plotService.plotCount;
  }

  getCurrentTime(): string {
    return new Date().toLocaleString();
  }

  async loadPreGeneratedPlots(): Promise<void> {
    const confirmToast = await this.toastController.create({
      message: 'This will load 290 pre-defined plots (all AVAILABLE by default). Continue?',
      duration: 6000,
      position: 'bottom',
      color: 'primary',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Load Plots',
          handler: async () => {
            try {
              // Load plots without sample data and without syncing to Google Sheets
              this.plotService.regenerateAllPlots(false, false);
              
              const successToast = await this.toastController.create({
                message: '✅ Successfully loaded 290 plots! All plots are AVAILABLE for admin management.',
                duration: 4000,
                position: 'bottom',
                color: 'success'
              });
              await successToast.present();
              
            } catch (error) {
              console.error('Failed to load plots:', error);
              const errorToast = await this.toastController.create({
                message: 'Failed to load plots',
                duration: 3000,
                position: 'bottom',
                color: 'danger'
              });
              await errorToast.present();
            }
          }
        }
      ]
    });
    await confirmToast.present();
  }

  async loadFromGoogleSheets(): Promise<void> {
    if (!this.isGoogleSheetsEnabled) {
      const warningToast = await this.toastController.create({
        message: 'Google Sheets integration is not enabled',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await warningToast.present();
      return;
    }

    const loadingToast = await this.toastController.create({
      message: 'Loading plots from Google Sheets...',
      duration: 3000,
      position: 'bottom',
      color: 'primary'
    });
    await loadingToast.present();

    try {
      // Enable Google Sheets integration which will automatically load data
      this.plotService.enableGoogleSheets();
      
      // Wait for data to load
      setTimeout(async () => {
        const plotCount = this.plotService.plotCount;
        
        if (plotCount > 0) {
          const successToast = await this.toastController.create({
            message: `✅ Successfully loaded ${plotCount} plots from Google Sheets!`,
            duration: 4000,
            position: 'bottom',
            color: 'success'
          });
          await successToast.present();
        } else {
          const warningToast = await this.toastController.create({
            message: 'No plots found in Google Sheets. The sheet might be empty.',
            duration: 4000,
            position: 'bottom',
            color: 'warning'
          });
          await warningToast.present();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Failed to load from Google Sheets:', error);
      const errorToast = await this.toastController.create({
        message: 'Failed to load from Google Sheets. Check console for details.',
        duration: 4000,
        position: 'bottom',
        color: 'danger'
      });
      await errorToast.present();
    }
  }

  async loadSampleData(): Promise<void> {
    const confirmToast = await this.toastController.create({
      message: 'This will add 25 sample sales for testing. Continue?',
      duration: 6000,
      position: 'bottom',
      color: 'warning',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add Sample Data',
          handler: async () => {
            try {
              // Load plots with sample data but don't sync to Google Sheets
              this.plotService.regenerateAllPlots(true, false);
              
              const successToast = await this.toastController.create({
                message: '✅ 25 sample sales added successfully! Great for testing the system.',
                duration: 4000,
                position: 'bottom',
                color: 'success'
              });
              await successToast.present();
              
            } catch (error) {
              console.error('Failed to add sample data:', error);
              const errorToast = await this.toastController.create({
                message: 'Failed to add sample data',
                duration: 3000,
                position: 'bottom',
                color: 'danger'
              });
              await errorToast.present();
            }
          }
        }
      ]
    });
    await confirmToast.present();
  }

  async showPlotSummary(): Promise<void> {
    const totalPlots = this.plotService.plotCount;
    
    if (totalPlots === 0) {
      const warningToast = await this.toastController.create({
        message: 'No plots loaded! Please load the 290 pre-defined plots first.',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await warningToast.present();
      return;
    }

    console.log('=== PLOT SUMMARY ===');
    console.log('Survey 152/1: Expected 67 plots');
    console.log('Survey 152/2: Expected 57 plots');
    console.log('Survey 152/3: Expected 166 plots');
    console.log('Total Expected: 290 plots');
    console.log('Actual Total Loaded:', totalPlots);
    
    const summaryToast = await this.toastController.create({
      message: `Plot Summary: ${totalPlots} plots loaded. Check console for details.`,
      duration: 4000,
      position: 'bottom',
      color: 'primary'
    });
    await summaryToast.present();
  }

  async downloadPlotsAsCSV(): Promise<void> {
    try {
      // First check if plots are loaded
      const plotCount = this.plotService.plotCount;
      
      if (plotCount === 0) {
        const warningToast = await this.toastController.create({
          message: 'No plots found! Please load the 290 pre-defined plots first.',
          duration: 4000,
          position: 'bottom',
          color: 'warning'
        });
        await warningToast.present();
        return;
      }

      console.log(`Downloading CSV with ${plotCount} plots...`);
      this.plotService.downloadPlotsAsCSV();
      
      const successToast = await this.toastController.create({
        message: `CSV file downloaded with ${plotCount} plots!`,
        duration: 3000,
        position: 'bottom',
        color: 'success'
      });
      await successToast.present();
      
    } catch (error) {
      console.error('Download failed:', error);
      const errorToast = await this.toastController.create({
        message: 'Failed to download CSV file',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await errorToast.present();
    }
  }

  async copyPlotsToClipboard(): Promise<void> {
    try {
      // First check if plots are loaded
      const plotCount = this.plotService.plotCount;
      
      if (plotCount === 0) {
        const warningToast = await this.toastController.create({
          message: 'No plots found! Please load the 290 pre-defined plots first.',
          duration: 4000,
          position: 'bottom',
          color: 'warning'
        });
        await warningToast.present();
        return;
      }

      await this.plotService.copyPlotsToClipboard();
      
      const successToast = await this.toastController.create({
        message: `Plot data copied to clipboard! ${plotCount} plots ready to paste into Google Sheets.`,
        duration: 4000,
        position: 'bottom',
        color: 'success'
      });
      await successToast.present();
      
    } catch (error) {
      console.error('Copy failed:', error);
      const errorToast = await this.toastController.create({
        message: 'Failed to copy to clipboard. Check console for manual copy.',
        duration: 4000,
        position: 'bottom',
        color: 'warning'
      });
      await errorToast.present();
    }
  }

  toggleGoogleSheets(event: any): void {
    const enabled = event.detail.checked;
    if (enabled) {
      this.plotService.enableGoogleSheets();
    } else {
      this.plotService.disableGoogleSheets();
    }
    
    const message = enabled ? 'Google Sheets integration enabled' : 'Google Sheets integration disabled';
    this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    }).then(toast => toast.present());
  }

  openGoogleSheetsConfig(): void {
    // This could open a modal or navigate to a configuration page
    console.log('Google Sheets configuration - feature to be implemented');
    
    this.toastController.create({
      message: 'Google Sheets configuration is handled via environment variables',
      duration: 3000,
      position: 'bottom',
      color: 'primary'
    }).then(toast => toast.present());
  }

  async testGoogleAppsScript(): Promise<void> {
    if (!this.isGoogleSheetsEnabled) {
      const warningToast = await this.toastController.create({
        message: 'Please enable Google Sheets integration first',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await warningToast.present();
      return;
    }

    try {
      const success = await this.plotService.testGoogleSheetsConnection();
      
      const toast = await this.toastController.create({
        message: success ? 'Google Sheets connection successful!' : 'Google Sheets connection failed',
        duration: 3000,
        position: 'bottom',
        color: success ? 'success' : 'danger'
      });
      await toast.present();
      
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorToast = await this.toastController.create({
        message: 'Connection test failed. Check console for details.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await errorToast.present();
    }
  }

  async syncAllPlotsToGoogleSheets(): Promise<void> {
    if (!this.isGoogleSheetsEnabled) {
      const warningToast = await this.toastController.create({
        message: 'Please enable Google Sheets integration first',
        duration: 3000,
        position: 'bottom',
        color: 'warning'
      });
      await warningToast.present();
      return;
    }

    const confirmToast = await this.toastController.create({
      message: 'This will sync all plots to Google Sheets. This may take several minutes. Continue?',
      duration: 6000,
      position: 'bottom',
      color: 'primary',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Sync Now',
          handler: async () => {
            const loadingToast = await this.toastController.create({
              message: 'Syncing plots to Google Sheets... Check console for progress.',
              duration: 3000,
              position: 'bottom'
            });
            await loadingToast.present();

            try {
              // Use the new dedicated sync method
              await this.plotService.syncAllPlotsToGoogleSheets();
              
              const successToast = await this.toastController.create({
                message: 'Google Sheets sync completed! Check console for details.',
                duration: 4000,
                position: 'bottom',
                color: 'success'
              });
              await successToast.present();
              
            } catch (error) {
              console.error('Sync failed:', error);
              const errorToast = await this.toastController.create({
                message: 'Sync failed. Check console for details.',
                duration: 4000,
                position: 'bottom',
                color: 'danger'
              });
              await errorToast.present();
            }
          }
        }
      ]
    });
    await confirmToast.present();
  }

  async clearAllPlots(): Promise<void> {
    const confirmToast = await this.toastController.create({
      message: 'This will clear all plot data. Are you sure?',
      duration: 6000,
      position: 'bottom',
      color: 'danger',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear All',
          handler: async () => {
            try {
              this.plotService.clearAllPlots();
              
              const successToast = await this.toastController.create({
                message: 'All plots cleared successfully',
                duration: 3000,
                position: 'bottom',
                color: 'success'
              });
              await successToast.present();
              
            } catch (error) {
              console.error('Clear failed:', error);
              const errorToast = await this.toastController.create({
                message: 'Failed to clear plots',
                duration: 3000,
                position: 'bottom',
                color: 'danger'
              });
              await errorToast.present();
            }
          }
        }
      ]
    });
    await confirmToast.present();
  }
}