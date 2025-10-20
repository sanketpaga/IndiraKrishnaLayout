import { Injectable } from '@angular/core';
import { Plot, SurveyNumber, PlotStatus } from '../models/plot.model';
import { ReportFilter } from '../models/survey-config.model';

export interface YearlyReport {
  year: number;
  totalSales: number;
  totalRevenue: number;
  averageRate: number;
  plotsSold: Plot[];
}

export interface SalesAnalytics {
  totalPlots: number;
  soldPlots: number;
  availablePlots: number;
  preBookedPlots: number;
  totalRevenue: number;
  averageRate: number;
  surveyBreakdown: { [key: string]: SalesAnalytics };
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor() { }

  generateYearlyReport(plots: Plot[], year: number): YearlyReport {
    const yearPlots = plots.filter(plot => {
      if (plot.status !== PlotStatus.SOLD || !plot.purchaser) return false;
      return plot.purchaser.registrationDate.getFullYear() === year;
    });

    const totalRevenue = yearPlots.reduce((sum, plot) => {
      return sum + plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
    }, 0);

    const totalArea = yearPlots.reduce((sum, plot) => sum + plot.dimensions.area, 0);

    return {
      year,
      totalSales: yearPlots.length,
      totalRevenue,
      averageRate: totalArea > 0 ? totalRevenue / totalArea : 0,
      plotsSold: yearPlots
    };
  }

  generateSalesAnalytics(plots: Plot[], filter?: ReportFilter): SalesAnalytics {
    let filteredPlots = plots;

    if (filter) {
      filteredPlots = this.applyFilter(plots, filter);
    }

    const soldPlots = filteredPlots.filter(p => p.status === PlotStatus.SOLD);
    const totalRevenue = soldPlots.reduce((sum, plot) => {
      return sum + plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
    }, 0);
    
    const totalArea = soldPlots.reduce((sum, plot) => sum + plot.dimensions.area, 0);

    // Survey breakdown
    const surveyBreakdown: { [key: string]: SalesAnalytics } = {};
    Object.values(SurveyNumber).forEach(surveyNum => {
      const surveyPlots = filteredPlots.filter(p => p.surveyNumber === surveyNum);
      const surveySoldPlots = surveyPlots.filter(p => p.status === PlotStatus.SOLD);
      const surveyRevenue = surveySoldPlots.reduce((sum, plot) => {
        return sum + plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      }, 0);
      const surveyArea = surveySoldPlots.reduce((sum, plot) => sum + plot.dimensions.area, 0);

      surveyBreakdown[surveyNum] = {
        totalPlots: surveyPlots.length,
        soldPlots: surveySoldPlots.length,
        availablePlots: surveyPlots.filter(p => p.status === PlotStatus.AVAILABLE).length,
        preBookedPlots: surveyPlots.filter(p => p.status === PlotStatus.PRE_BOOKED).length,
        totalRevenue: surveyRevenue,
        averageRate: surveyArea > 0 ? surveyRevenue / surveyArea : 0,
        surveyBreakdown: {}
      };
    });

    return {
      totalPlots: filteredPlots.length,
      soldPlots: soldPlots.length,
      availablePlots: filteredPlots.filter(p => p.status === PlotStatus.AVAILABLE).length,
      preBookedPlots: filteredPlots.filter(p => p.status === PlotStatus.PRE_BOOKED).length,
      totalRevenue,
      averageRate: totalArea > 0 ? totalRevenue / totalArea : 0,
      surveyBreakdown
    };
  }

  getYearOverYearTrends(plots: Plot[]): { year: number; averageRate: number }[] {
    const years = new Set<number>();
    plots.forEach(plot => {
      if (plot.purchaser) {
        years.add(plot.purchaser.registrationDate.getFullYear());
      }
    });

    return Array.from(years).sort().map(year => {
      const report = this.generateYearlyReport(plots, year);
      return {
        year,
        averageRate: report.averageRate
      };
    });
  }

  private applyFilter(plots: Plot[], filter: ReportFilter): Plot[] {
    return plots.filter(plot => {
      // Survey number filter
      if (filter.surveyNumbers && filter.surveyNumbers.length > 0) {
        if (!filter.surveyNumbers.includes(plot.surveyNumber)) {
          return false;
        }
      }

      // Plot status filter
      if (filter.plotStatus && filter.plotStatus.length > 0) {
        if (!filter.plotStatus.includes(plot.status)) {
          return false;
        }
      }

      // Owner filter
      if (filter.owners && filter.owners.length > 0) {
        if (!filter.owners.includes(plot.owner)) {
          return false;
        }
      }

      // Date range filter
      if (filter.dateRange && plot.purchaser) {
        const regDate = plot.purchaser.registrationDate;
        if (regDate < filter.dateRange.startDate || regDate > filter.dateRange.endDate) {
          return false;
        }
      }

      // Plot numbers filter
      if (filter.plotNumbers && filter.plotNumbers.length > 0) {
        if (!filter.plotNumbers.includes(plot.plotNumber)) {
          return false;
        }
      }

      return true;
    });
  }

  exportToCSV(data: any[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}