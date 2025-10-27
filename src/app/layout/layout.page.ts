import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonIcon,
  IonButton
} from '@ionic/angular/standalone';
import { PlotService } from '../services/plot.service';
import { Plot, PlotStatus, SurveyNumber } from '../models/plot.model';
import { SURVEY_CONFIGS } from '../models/survey-config.model';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonIcon,
    IonButton
  ]
})
export class LayoutPage implements OnInit {
  selectedSurvey: SurveyNumber = SurveyNumber.SURVEY_152_1;
  plots: Plot[] = [];
  filteredPlots: Plot[] = [];
  surveyConfigs = SURVEY_CONFIGS;
  
  // View mode for tabs
  selectedView: string = 'grid'; // 'grid' or 'physical'
  
  // Zoom functionality for physical layout
  zoomLevel: number = 1;
  minZoom: number = 0.5;
  maxZoom: number = 3;
  zoomStep: number = 0.25;
  
  // Drag functionality for zoomed images
  isDragging: boolean = false;
  dragStartX: number = 0;
  dragStartY: number = 0;
  translateX: number = 0;
  translateY: number = 0;
  
  // Expose enums to template
  PlotStatus = PlotStatus;
  SurveyNumber = SurveyNumber;
  
  // Grid configuration
  plotsPerRow = 10;
  gridRows: Plot[][] = [];
  
  // Status colors
  statusColors = {
    [PlotStatus.AVAILABLE]: '#f4f4f4',
    [PlotStatus.PRE_BOOKED]: '#ffc409',
    [PlotStatus.SOLD]: '#2dd36f'
  };

  constructor(private plotService: PlotService) { }

  ngOnInit() {
    this.loadPlots();
  }

  loadPlots() {
    this.plotService.getAllPlots().subscribe(plots => {
      this.plots = plots;
      this.filterPlotsBySurvey();
    });
  }

  onSurveyChange(event: any) {
    this.selectedSurvey = event.detail.value;
    this.filterPlotsBySurvey();
  }

  onViewChange(event: any) {
    this.selectedView = event.detail.value;
    // Reset zoom when switching views
    this.zoomLevel = 1;
  }

  // Zoom functionality methods
  zoomIn() {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel += this.zoomStep;
    }
  }

  zoomOut() {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel -= this.zoomStep;
    }
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
  }

  getImageStyle() {
    return {
      'transform': `scale(${this.zoomLevel}) translate(${this.translateX}px, ${this.translateY}px)`,
      'transition': this.isDragging ? 'none' : 'transform 0.3s ease',
      'cursor': this.zoomLevel > 1 ? 'grab' : 'default'
    };
  }

  // Drag functionality methods
  onMouseDown(event: MouseEvent) {
    if (this.zoomLevel > 1) {
      this.isDragging = true;
      this.dragStartX = event.clientX - this.translateX;
      this.dragStartY = event.clientY - this.translateY;
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.zoomLevel > 1) {
      this.translateX = event.clientX - this.dragStartX;
      this.translateY = event.clientY - this.dragStartY;
      event.preventDefault();
    }
  }

  onMouseUp(event: MouseEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      event.preventDefault();
    }
  }

  // Touch events for mobile
  onTouchStart(event: TouchEvent) {
    if (this.zoomLevel > 1 && event.touches.length === 1) {
      this.isDragging = true;
      const touch = event.touches[0];
      this.dragStartX = touch.clientX - this.translateX;
      this.dragStartY = touch.clientY - this.translateY;
      event.preventDefault();
    }
  }

  onTouchMove(event: TouchEvent) {
    if (this.isDragging && this.zoomLevel > 1 && event.touches.length === 1) {
      const touch = event.touches[0];
      this.translateX = touch.clientX - this.dragStartX;
      this.translateY = touch.clientY - this.dragStartY;
      event.preventDefault();
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      event.preventDefault();
    }
  }

  filterPlotsBySurvey() {
    this.filteredPlots = this.plots.filter(plot => plot.surveyNumber === this.selectedSurvey);
    this.createGrid();
  }

  createGrid() {
    this.gridRows = [];
    for (let i = 0; i < this.filteredPlots.length; i += this.plotsPerRow) {
      this.gridRows.push(this.filteredPlots.slice(i, i + this.plotsPerRow));
    }
  }

  getPlotColor(plot: Plot): string {
    return this.statusColors[plot.status];
  }

  getCleanPlotNumber(plot: Plot): string {
    // Remove survey prefix (e.g., "152/1-001" becomes "001")
    const parts = plot.plotNumber.split('-');
    return parts.length > 1 ? parts[1] : plot.plotNumber;
  }

  getPlotTextColor(plot: Plot): string {
    return plot.status === PlotStatus.AVAILABLE ? '#333' : '#fff';
  }

  onPlotClick(plot: Plot) {
    // TODO: Open plot details modal
    console.log('Plot clicked:', plot);
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

  getStatusCount(status: PlotStatus): number {
    return this.filteredPlots.filter(plot => plot.status === status).length;
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

  trackByRow(index: number, row: Plot[]): number {
    return index;
  }

  trackByPlot(index: number, plot: Plot): string {
    return plot.id;
  }
}