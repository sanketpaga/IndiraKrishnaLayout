import { Injectable } from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
  ChartType,
  registerables
} from 'chart.js';
import { SalesBySurvey, SalesByOwner, SalesByYear } from './reports.service';

// Register Chart.js components
Chart.register(...registerables);

@Injectable({
  providedIn: 'root'
})
export class ChartService {

  constructor() { }

  // Chart color schemes
  private colors = {
    primary: '#3880ff',
    secondary: '#3dc2ff',
    success: '#2dd36f',
    warning: '#ffc409',
    danger: '#eb445a',
    medium: '#92949c',
    light: '#f4f5f8'
  };

  private chartColors = [
    this.colors.primary,
    this.colors.success,
    this.colors.warning,
    this.colors.secondary,
    this.colors.danger,
    this.colors.medium
  ];

  // Survey Sales Chart (Doughnut)
  createSurveyChartConfig(surveyData: SalesBySurvey[]): ChartConfiguration {
    const data: ChartData = {
      labels: surveyData.map(s => s.surveyName),
      datasets: [{
        data: surveyData.map(s => s.soldPlots),
        backgroundColor: this.chartColors.slice(0, surveyData.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = surveyData.reduce((sum, item) => sum + item.soldPlots, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${label}: ${value} plots (${percentage}%)`;
            }
          }
        }
      }
    };

    return {
      type: 'doughnut' as ChartType,
      data,
      options
    };
  }

  // Owner Sales Chart (Pie)
  createOwnerChartConfig(ownerData: SalesByOwner[]): ChartConfiguration {
    const data: ChartData = {
      labels: ownerData.map(o => o.ownerName),
      datasets: [{
        data: ownerData.map(o => o.soldPlots),
        backgroundColor: this.chartColors.slice(0, ownerData.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed;
              const total = ownerData.reduce((sum, item) => sum + item.soldPlots, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${label}: ${value} plots (${percentage}%)`;
            }
          }
        }
      }
    };

    return {
      type: 'pie' as ChartType,
      data,
      options
    };
  }

  // Year over Year Sales Trend (Line Chart)
  createYearTrendChartConfig(yearData: SalesByYear[]): ChartConfiguration {
    const sortedData = yearData.sort((a, b) => a.year - b.year);
    
    const data: ChartData = {
      labels: sortedData.map(y => y.year.toString()),
      datasets: [
        {
          label: 'Plots Sold',
          data: sortedData.map(y => y.totalSales),
          borderColor: this.colors.primary,
          backgroundColor: this.colors.primary + '20',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: this.colors.primary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6
        },
        {
          label: 'Revenue (₹ Crores)',
          data: sortedData.map(y => y.totalRevenue / 10000000), // Convert to crores
          borderColor: this.colors.success,
          backgroundColor: this.colors.success + '20',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: this.colors.success,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          yAxisID: 'y1'
        }
      ]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Plots Sold'
          },
          grid: {
            drawOnChartArea: true,
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Revenue (₹ Crores)'
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Year'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            afterLabel: (context) => {
              if (context.dataset.label === 'Revenue (₹ Crores)') {
                const actualValue = sortedData[context.dataIndex].totalRevenue;
                return `Actual: ₹${this.formatCurrency(actualValue)}`;
              }
              return '';
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };

    return {
      type: 'line' as ChartType,
      data,
      options
    };
  }

  // Monthly Sales Distribution (Bar Chart)
  createMonthlyChartConfig(yearData: SalesByYear, year: number): ChartConfiguration {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const data: ChartData = {
      labels: months,
      datasets: [{
        label: `${year} Monthly Sales`,
        data: months.map(month => yearData.monthlyBreakdown[month] || 0),
        backgroundColor: this.colors.primary + '80',
        borderColor: this.colors.primary,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Sales'
          },
          ticks: {
            stepSize: 1
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.dataset.label}: ${context.parsed.y} plots`;
            }
          }
        }
      }
    };

    return {
      type: 'bar' as ChartType,
      data,
      options
    };
  }

  // Revenue Distribution Chart (Bar Chart)
  createRevenueChartConfig(surveyData: SalesBySurvey[]): ChartConfiguration {
    const data: ChartData = {
      labels: surveyData.map(s => s.surveyNumber),
      datasets: [{
        label: 'Revenue (₹ Crores)',
        data: surveyData.map(s => s.totalRevenue / 10000000), // Convert to crores
        backgroundColor: [
          this.colors.success + '80',
          this.colors.warning + '80',
          this.colors.secondary + '80'
        ],
        borderColor: [
          this.colors.success,
          this.colors.warning,
          this.colors.secondary
        ],
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    };

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Revenue (₹ Crores)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Survey Number'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const actualValue = surveyData[context.dataIndex].totalRevenue;
              return `Revenue: ₹${this.formatCurrency(actualValue)}`;
            }
          }
        }
      }
    };

    return {
      type: 'bar' as ChartType,
      data,
      options
    };
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Destroy chart instance
  destroyChart(chart: Chart | null): void {
    if (chart) {
      chart.destroy();
    }
  }
}