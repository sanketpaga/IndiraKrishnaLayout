import { Injectable } from '@angular/core';
import { Plot, SurveyNumber, PlotStatus, PaymentMode, OwnerType } from '../models/plot.model';

interface PlotTemplate {
  survey: SurveyNumber;
  count: number;
  length: number;
  width: number;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlotGeneratorService {

  constructor() { }

  /**
   * Generate all 290 plots based on the survey specifications
   */
  generateAllPlots(): Plot[] {
    const plotTemplates: PlotTemplate[] = [
      // Survey 152/1: 67 plots total
      { survey: SurveyNumber.SURVEY_152_1, count: 4, length: 9, width: 15, description: '9x15' },
      { survey: SurveyNumber.SURVEY_152_1, count: 50, length: 9, width: 12, description: '9x12' },
      { survey: SurveyNumber.SURVEY_152_1, count: 13, length: 9, width: 0, description: '9xodd' }, // Will set individual odd widths
      
      // Survey 152/2: 57 plots total
      { survey: SurveyNumber.SURVEY_152_2, count: 47, length: 9, width: 12, description: '9x12' },
      { survey: SurveyNumber.SURVEY_152_2, count: 10, length: 9, width: 0, description: '9xodd' }, // Will set individual odd widths
      
      // Survey 152/3: 166 plots total
      { survey: SurveyNumber.SURVEY_152_3, count: 33, length: 9, width: 15, description: '9x15' },
      { survey: SurveyNumber.SURVEY_152_3, count: 98, length: 9, width: 12, description: '9x12' },
      { survey: SurveyNumber.SURVEY_152_3, count: 14, length: 9, width: 0, description: '9xodd' }, // Will set individual odd widths
      { survey: SurveyNumber.SURVEY_152_3, count: 21, length: 0, width: 0, description: 'oddxodd' }, // Will set individual odd dimensions
    ];

    const plots: Plot[] = [];
    let globalPlotCounter = 1;

    plotTemplates.forEach(template => {
      for (let i = 0; i < template.count; i++) {
        const plot = this.generatePlot(template, globalPlotCounter, i + 1);
        plots.push(plot);
        globalPlotCounter++;
      }
    });

    return plots;
  }

  /**
   * Generate a single plot based on template
   */
  private generatePlot(template: PlotTemplate, globalId: number, plotIndexInSurvey: number): Plot {
    const plotNumber = this.generatePlotNumber(template.survey, plotIndexInSurvey);
    const dimensions = this.generateDimensions(template, plotIndexInSurvey);
    const ratePerSqMeter = this.getDefaultRatePerSqMeter(template.survey);
    const owner = this.getOwnerForSurvey(template.survey);
    
    return {
      id: `plot-${globalId.toString().padStart(3, '0')}`,
      plotNumber: plotNumber,
      surveyNumber: template.survey,
      dimensions: dimensions,
      status: PlotStatus.AVAILABLE,
      owner: owner,
      ratePerSqMeter: ratePerSqMeter,
      totalCost: dimensions.area * ratePerSqMeter,
      governmentRate: ratePerSqMeter * 0.6, // Assuming government rate is 60% of market rate
      createdAt: new Date(),
      updatedAt: new Date(),
      payments: []
    };
  }

  /**
   * Generate plot number in format like "152/1-001", "152/2-047", etc.
   */
  private generatePlotNumber(survey: SurveyNumber, plotIndex: number): string {
    return `${survey}-${plotIndex.toString().padStart(3, '0')}`;
  }

  /**
   * Generate dimensions based on template and handle odd sizes
   */
  private generateDimensions(template: PlotTemplate, plotIndex: number): { length: number; width: number; area: number } {
    let length = template.length;
    let width = template.width;

    // Handle odd dimensions
    if (template.description === '9xodd') {
      length = 9;
      width = this.getOddWidth(plotIndex); // Different odd widths
    } else if (template.description === 'oddxodd') {
      const oddDimensions = this.getOddDimensions(plotIndex);
      length = oddDimensions.length;
      width = oddDimensions.width;
    }

    const area = length * width;

    return { length, width, area };
  }

  /**
   * Get varying odd widths for 9xodd plots
   */
  private getOddWidth(plotIndex: number): number {
    const oddWidths = [10, 11, 13, 14, 16, 18, 20]; // Various odd/non-standard widths
    return oddWidths[plotIndex % oddWidths.length];
  }

  /**
   * Get varying odd dimensions for oddxodd plots
   */
  private getOddDimensions(plotIndex: number): { length: number; width: number } {
    const oddDimensions = [
      { length: 10, width: 10 },
      { length: 12, width: 10 },
      { length: 15, width: 10 },
      { length: 18, width: 12 },
      { length: 20, width: 15 },
      { length: 25, width: 12 },
      { length: 30, width: 10 },
      { length: 8, width: 20 },
      { length: 12, width: 18 },
      { length: 15, width: 16 }
    ];
    
    return oddDimensions[plotIndex % oddDimensions.length];
  }

  /**
   * Get default rate per sq meter based on survey
   */
  private getDefaultRatePerSqMeter(survey: SurveyNumber): number {
    switch (survey) {
      case SurveyNumber.SURVEY_152_1:
        return 27000; // Rs. 27,000 per sq meter for Bapurao's survey
      case SurveyNumber.SURVEY_152_2:
        return 30000; // Rs. 30,000 per sq meter for Narayanrao's survey
      case SurveyNumber.SURVEY_152_3:
        return 28000; // Rs. 28,000 per sq meter for shared survey
      default:
        return 27000;
    }
  }

  /**
   * Get owner type based on survey
   */
  private getOwnerForSurvey(survey: SurveyNumber): OwnerType {
    switch (survey) {
      case SurveyNumber.SURVEY_152_1:
        return OwnerType.BAPURAO;
      case SurveyNumber.SURVEY_152_2:
        return OwnerType.NARAYANRAO;
      case SurveyNumber.SURVEY_152_3:
        return OwnerType.JOINT;
      default:
        return OwnerType.JOINT;
    }
  }

  /**
   * Get summary of generated plots for verification
   */
  getPlotSummary(plots: Plot[]): any {
    const summary = {
      total: plots.length,
      surveys: {} as any
    };

    plots.forEach(plot => {
      if (!summary.surveys[plot.surveyNumber]) {
        summary.surveys[plot.surveyNumber] = {
          count: 0,
          dimensions: {} as any,
          totalArea: 0,
          estimatedValue: 0
        };
      }

      const survey = summary.surveys[plot.surveyNumber];
      survey.count++;
      survey.totalArea += plot.dimensions.area;
      survey.estimatedValue += plot.totalCost;

      const dimKey = `${plot.dimensions.length}x${plot.dimensions.width}`;
      if (!survey.dimensions[dimKey]) {
        survey.dimensions[dimKey] = 0;
      }
      survey.dimensions[dimKey]++;
    });

    return summary;
  }

  /**
   * Generate sample sold plots for demonstration (optional)
   */
  generateSampleSoldPlots(plots: Plot[], sampleCount: number = 25): Plot[] {
    const sampleNames = [
      'Ramesh Kumar', 'Suresh Patil', 'Mahesh Sharma', 'Dinesh Reddy', 'Ganesh Rao',
      'Rajesh Singh', 'Naresh Gupta', 'Umesh Joshi', 'Rakesh Verma', 'Mukesh Agarwal',
      'Ashok Kumar', 'Vinod Sharma', 'Manoj Patil', 'Anil Reddy', 'Sunil Rao',
      'Ravi Kumar', 'Sanjay Singh', 'Vijay Gupta', 'Ajay Joshi', 'Prakash Verma',
      'Deepak Agarwal', 'Rohit Kumar', 'Amit Sharma', 'Sumit Patil', 'Nitin Reddy'
    ];

    const sampleMobiles = [
      '9876543210', '9765432109', '9654321098', '9543210987', '9432109876',
      '9321098765', '9210987654', '9109876543', '9098765432', '8987654321',
      '8876543210', '8765432109', '8654321098', '8543210987', '8432109876',
      '8321098765', '8210987654', '8109876543', '8098765432', '7987654321',
      '7876543210', '7765432109', '7654321098', '7543210987', '7432109876'
    ];

    const modifiedPlots = [...plots];
    
    // Mark some plots as sold with sample data
    for (let i = 0; i < Math.min(sampleCount, plots.length); i++) {
      const plotIndex = Math.floor(Math.random() * plots.length);
      const plot = modifiedPlots[plotIndex];
      
      if (plot.status === PlotStatus.AVAILABLE) {
        plot.status = PlotStatus.SOLD;
        plot.purchaser = {
          name: sampleNames[i % sampleNames.length],
          mobile: sampleMobiles[i % sampleMobiles.length],
          email: `${sampleNames[i % sampleNames.length].toLowerCase().replace(' ', '.')}@gmail.com`,
          address: `Address ${i + 1}, Indira Krishna Layout`,
          registrationDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        };

        // Add a sample payment
        const advanceAmount = Math.floor(plot.totalCost * 0.2); // 20% advance
        plot.payments = [{
          id: `payment-${plot.id}-001`,
          amount: advanceAmount,
          date: plot.purchaser.registrationDate,
          mode: Math.random() > 0.5 ? PaymentMode.CASH : PaymentMode.BANK_TRANSFER,
          description: 'Advance payment',
          receiptNumber: `RCP-${Date.now()}-${i + 1}`
        }];
      }
    }

    return modifiedPlots;
  }
}