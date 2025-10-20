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
  IonIcon
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
    IonIcon
  ]
})
export class LayoutPage implements OnInit {
  selectedSurvey: SurveyNumber = SurveyNumber.SURVEY_152_1;
  plots: Plot[] = [];
  filteredPlots: Plot[] = [];
  surveyConfigs = SURVEY_CONFIGS;
  
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