import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonIcon,
  IonButton,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonModal,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { PlotService } from '../services/plot.service';
import { Plot, PlotStatus, SurveyNumber, OwnerType, Purchaser } from '../models/plot.model';
import { addIcons } from 'ionicons';
import { 
  searchOutline, 
  addOutline, 
  eyeOutline, 
  createOutline, 
  trashOutline,
  filterOutline,
  businessOutline,
  personOutline,
  calendarOutline,
  cashOutline,
  checkmarkCircle,
  timeOutline,
  ellipseOutline,
  closeOutline, lockClosedOutline } from 'ionicons/icons';

@Component({
  selector: 'app-plots',
  templateUrl: './plots.page.html',
  styleUrls: ['./plots.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonIcon,
    IonButton,
    IonChip,
    IonGrid,
    IonRow,
    IonCol,
    IonModal,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSpinner
  ]
})
export class PlotsPage implements OnInit {
  plots: Plot[] = [];
  filteredPlots: Plot[] = [];
  searchTerm: string = '';
  selectedSurvey: string = 'all';
  
  // Expose enums to template
  PlotStatus = PlotStatus;
  SurveyNumber = SurveyNumber;
  OwnerType = OwnerType;
  
  // Modal states
  isModalOpen = false;
  isEditMode = false;
  isModalLoading = false;
  selectedPlot: Plot | null = null;
  
  // Form data
  plotForm = {
    surveyNumber: SurveyNumber.SURVEY_152_1,
    plotNumber: '',
    dimensions: {
      length: 0,
      width: 0,
      area: 0
    },
    status: PlotStatus.AVAILABLE,
    owner: OwnerType.BAPURAO,
    ratePerSqMeter: 5000,
    totalCost: 0,
    governmentRate: 3000,
    purchaser: null as Purchaser | null
  };

  constructor(
    private plotService: PlotService,
    private toastController: ToastController
  ) {
    addIcons({createOutline,businessOutline,cashOutline,personOutline,addOutline,closeOutline,lockClosedOutline,searchOutline,eyeOutline,trashOutline,filterOutline,calendarOutline,checkmarkCircle,timeOutline,ellipseOutline});
  }

  ngOnInit() {
    this.loadPlots();
  }

  loadPlots() {
    this.plotService.getAllPlots().subscribe(plots => {
      this.plots = plots;
      this.filteredPlots = [...plots]; // Initialize filteredPlots
      this.applyFilters();
    });
  }

  onRefresh(event: any) {
    this.loadPlots();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.applyFilters();
  }

  onSurveyFilter(event: any) {
    this.selectedSurvey = event.detail.value;
    this.applyFilters();
  }

  onSurveyFilterChange(value: string) {
    this.selectedSurvey = value;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredPlots = this.plots.filter(plot => {
      const matchesSearch = !this.searchTerm || 
        plot.plotNumber.toLowerCase().includes(this.searchTerm) ||
        plot.surveyNumber.toLowerCase().includes(this.searchTerm) ||
        plot.purchaser?.name?.toLowerCase().includes(this.searchTerm) ||
        plot.purchaser?.mobile?.includes(this.searchTerm);

      const matchesSurvey = this.selectedSurvey === 'all' || 
        plot.surveyNumber === this.selectedSurvey;

      return matchesSearch && matchesSurvey;
    });
  }

  openEditPlotModal(plot: Plot) {
    this.selectedPlot = plot;
    this.isEditMode = true;
    this.isModalOpen = true;
    this.isModalLoading = true;
    
    // Initially populate with local data to avoid empty form
    this.populateForm(plot);
    console.log('Initial plot data:', plot);
    console.log('Initial dimensions:', plot.dimensions);
    
    // Show loading message
    this.showToast('Fetching latest plot data...', 'primary');
    
    // Refresh plot data from Google Sheets
    this.plotService.refreshPlotFromGoogleSheets(plot.id).subscribe({
      next: (refreshedPlot) => {
        this.isModalLoading = false;
        if (refreshedPlot) {
          this.selectedPlot = refreshedPlot;
          this.populateForm(refreshedPlot);
          console.log('Refreshed plot data:', refreshedPlot);
          console.log('Refreshed dimensions:', refreshedPlot.dimensions);
          
          // Validate dimensions data
          if (!refreshedPlot.dimensions || 
              typeof refreshedPlot.dimensions.length === 'undefined' || 
              typeof refreshedPlot.dimensions.width === 'undefined') {
            console.warn('Invalid dimensions in refreshed plot data, using defaults');
            this.plotForm.dimensions = {
              length: 30, // Default values
              width: 40,
              area: 1200
            };
          }
        } else {
          // Fallback to original plot if refresh fails
          this.populateForm(plot);
          console.log('Using local plot data (refresh failed)');
        }
      },
      error: (error) => {
        this.isModalLoading = false;
        console.error('Error refreshing plot data:', error);
        // Fallback to original plot
        this.populateForm(plot);
        this.showToast('Using local data - could not fetch latest from Google Sheets', 'warning');
      }
    });
  }

  closeModal() {
    this.isModalOpen = false;
    this.isModalLoading = false;
    this.selectedPlot = null;
    this.resetForm();
  }

  resetForm() {
    this.plotForm = {
      surveyNumber: SurveyNumber.SURVEY_152_1,
      plotNumber: '',
      dimensions: {
        length: 0,
        width: 0,
        area: 0
      },
      status: PlotStatus.AVAILABLE,
      owner: OwnerType.BAPURAO,
      ratePerSqMeter: 5000,
      totalCost: 0,
      governmentRate: 3000,
      purchaser: null
    };
  }

  populateForm(plot: Plot) {
    // Ensure dimensions are valid, provide defaults if needed
    const dimensions = plot.dimensions || { length: 0, width: 0, area: 0 };
    
    this.plotForm = {
      surveyNumber: plot.surveyNumber,
      plotNumber: plot.plotNumber,
      dimensions: {
        length: dimensions.length || 0,
        width: dimensions.width || 0,
        area: dimensions.area || 0
      },
      status: plot.status,
      owner: plot.owner,
      ratePerSqMeter: plot.ratePerSqMeter,
      totalCost: plot.totalCost,
      governmentRate: plot.governmentRate,
      purchaser: plot.purchaser ? { ...plot.purchaser } : null
    };
    
    console.log('Form populated with dimensions:', this.plotForm.dimensions);
  }

  calculateArea() {
    if (this.plotForm.dimensions.length && this.plotForm.dimensions.width) {
      // Direct calculation since dimensions are already in meters
      this.plotForm.dimensions.area = 
        this.plotForm.dimensions.length * this.plotForm.dimensions.width;
      this.calculateTotalCost();
    }
  }

  calculateTotalCost() {
    if (this.plotForm.dimensions.area && this.plotForm.ratePerSqMeter) {
      this.plotForm.totalCost = 
        this.plotForm.dimensions.area * this.plotForm.ratePerSqMeter;
    }
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }

  async savePlot() {
    // Basic validation
    if (!this.plotForm.plotNumber.trim()) {
      this.showToast('Plot number is required', 'danger');
      return;
    }

    if (this.plotForm.dimensions.area <= 0) {
      this.showToast('Plot area must be greater than 0', 'danger');
      return;
    }

    if (this.isEditMode && this.selectedPlot) {
      // Update existing plot
      const updatedPlot: Plot = {
        ...this.selectedPlot,
        ...this.plotForm,
        purchaser: this.plotForm.purchaser || undefined,
        updatedAt: new Date()
      };
      
      console.log('Saving plot with purchaser data:', {
        plotId: updatedPlot.id,
        hasPurchaser: !!updatedPlot.purchaser,
        purchaserData: updatedPlot.purchaser
      });
      
      this.plotService.updatePlot(updatedPlot);
      console.log('Plot updated successfully:', updatedPlot.id);
      this.showToast(`Plot ${updatedPlot.plotNumber} updated successfully!`);
      
      this.closeModal();
      this.loadPlots();
    }
  }

  getStatusIcon(status: PlotStatus): string {
    switch (status) {
      case PlotStatus.AVAILABLE:
        return 'ellipse-outline';
      case PlotStatus.PRE_BOOKED:
        return 'time-outline';
      case PlotStatus.SOLD:
        return 'checkmark-circle';
      default:
        return 'ellipse-outline';
    }
  }

  getStatusColor(status: PlotStatus): string {
    switch (status) {
      case PlotStatus.AVAILABLE:
        return 'light';
      case PlotStatus.PRE_BOOKED:
        return 'warning';
      case PlotStatus.SOLD:
        return 'success';
      default:
        return 'medium';
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

  getSurveyDisplayName(survey: SurveyNumber): string {
    switch (survey) {
      case SurveyNumber.SURVEY_152_1:
        return 'Survey 152/1 (Bapurao)';
      case SurveyNumber.SURVEY_152_2:
        return 'Survey 152/2 (Narayanrao)';
      case SurveyNumber.SURVEY_152_3:
        return 'Survey 152/3 (Shared)';
      default:
        return survey;
    }
  }

  trackByPlot(index: number, plot: Plot): string {
    return plot.id;
  }

  // Helper methods for template calculations
  getAvailablePlotsCount(): number {
    return this.plots.filter(plot => plot.status === PlotStatus.AVAILABLE).length;
  }

  getPreBookedPlotsCount(): number {
    return this.plots.filter(plot => plot.status === PlotStatus.PRE_BOOKED).length;
  }

  getSoldPlotsCount(): number {
    return this.plots.filter(plot => plot.status === PlotStatus.SOLD).length;
  }

  // Check if survey field should be disabled when editing
  isSurveyFieldDisabled(): boolean {
    // Disable survey field when:
    // 1. Editing mode AND a specific survey is selected (not 'all')
    // 2. Or when adding and a specific survey filter is active
    return this.selectedSurvey !== 'all';
  }

  getSurveyFieldHelperText(): string {
    if (this.selectedSurvey !== 'all') {
      const surveyName = this.getSurveyDisplayName(this.selectedSurvey as SurveyNumber);
      return `Survey locked to current filter: ${surveyName}`;
    }
    return 'Select the survey for this plot';
  }

  // Filtered count methods that work with current filters
  getFilteredAvailablePlotsCount(): number {
    return this.filteredPlots.filter(plot => plot.status === PlotStatus.AVAILABLE).length;
  }

  getFilteredPreBookedPlotsCount(): number {
    return this.filteredPlots.filter(plot => plot.status === PlotStatus.PRE_BOOKED).length;
  }

  getFilteredSoldPlotsCount(): number {
    return this.filteredPlots.filter(plot => plot.status === PlotStatus.SOLD).length;
  }

  // Handle status changes to ensure purchaser object exists when needed
  onStatusChange() {
    // Initialize purchaser object when status is not AVAILABLE
    if (this.plotForm.status !== PlotStatus.AVAILABLE && !this.plotForm.purchaser) {
      this.plotForm.purchaser = {
        name: '',
        mobile: '',
        email: '',
        address: '',
        registrationDate: new Date()
      };
    } else if (this.plotForm.status === PlotStatus.AVAILABLE) {
      // Clear purchaser when status is AVAILABLE
      this.plotForm.purchaser = null;
    }
  }

  // Getter to ensure purchaser exists when needed
  get purchaserInfo() {
    if (this.plotForm.status !== PlotStatus.AVAILABLE && !this.plotForm.purchaser) {
      this.plotForm.purchaser = {
        name: '',
        mobile: '',
        email: '',
        address: '',
        registrationDate: new Date()
      };
    }
    return this.plotForm.purchaser;
  }

  // Check if customer info should be shown
  shouldShowCustomerInfo(): boolean {
    return this.plotForm.status !== PlotStatus.AVAILABLE;
  }
}