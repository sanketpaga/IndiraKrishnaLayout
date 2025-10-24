import { Injectable } from '@angular/core';
import { Plot, SurveyNumber, PlotStatus, OwnerType } from '../models/plot.model';
import { ReportFilter } from '../models/survey-config.model';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

export interface SalesBySurvey {
  surveyNumber: string;
  surveyName: string;
  totalPlots: number;
  soldPlots: number;
  availablePlots: number;
  preBookedPlots: number;
  totalRevenue: number;
  averageRate: number;
  salesPercentage: number;
  plotsSold: Plot[];
}

export interface SalesByOwner {
  owner: OwnerType;
  ownerName: string;
  totalPlots: number;
  soldPlots: number;
  availablePlots: number;
  preBookedPlots: number;
  totalRevenue: number;
  averageRate: number;
  salesPercentage: number;
  plotsSold: Plot[];
}

export interface SalesByYear {
  year: number;
  totalSales: number;
  totalRevenue: number;
  averageRate: number;
  monthlyBreakdown: { [month: string]: number };
  surveyBreakdown: { [survey: string]: number };
  plotsSold: Plot[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  constructor() { }

  /**
   * Utility function to safely clean up temporary DOM elements
   */
  private cleanupElement(element: HTMLElement): void {
    try {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    } catch (error) {
      console.warn('Error cleaning up temporary element:', error);
    }
  }

  /**
   * Utility function to create timeout wrapper for promises
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  }

  generateYearlyReport(plots: Plot[], year: number): YearlyReport {
    const yearPlots = plots.filter(plot => {
      if (plot.status !== PlotStatus.SOLD || !plot.purchaser) return false;
      const plotYear = this.getYearFromDate(plot.purchaser.registrationDate);
      return plotYear === year;
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
        const year = this.getYearFromDate(plot.purchaser.registrationDate);
        if (year) {
          years.add(year);
        }
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

  async exportToCSV(data: any[], filename: string): Promise<void> {
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

    await this.saveFile(csvContent, `${filename}.csv`, 'text/csv', false);
  }

  // Enhanced export methods
  async exportSalesBySurveyCSV(salesBySurvey: SalesBySurvey[]): Promise<void> {
    const data = salesBySurvey.map(survey => ({
      'Survey Number': survey.surveyNumber,
      'Survey Name': survey.surveyName,
      'Total Plots': survey.totalPlots,
      'Sold Plots': survey.soldPlots,
      'Available Plots': survey.availablePlots,
      'Pre-booked Plots': survey.preBookedPlots,
      'Total Revenue (₹)': survey.totalRevenue,
      'Average Rate (₹/sq ft)': Math.round(survey.averageRate),
      'Sales Percentage (%)': Math.round(survey.salesPercentage * 100) / 100
    }));
    
    await this.exportToCSV(data, 'sales-by-survey');
  }

  async exportSalesByOwnerCSV(salesByOwner: SalesByOwner[]): Promise<void> {
    const data = salesByOwner.map(owner => ({
      'Owner': owner.ownerName,
      'Total Plots': owner.totalPlots,
      'Sold Plots': owner.soldPlots,
      'Available Plots': owner.availablePlots,
      'Pre-booked Plots': owner.preBookedPlots,
      'Total Revenue (₹)': owner.totalRevenue,
      'Average Rate (₹/sq ft)': Math.round(owner.averageRate),
      'Sales Percentage (%)': Math.round(owner.salesPercentage * 100) / 100
    }));
    
    await this.exportToCSV(data, 'sales-by-owner');
  }

  async exportSalesByYearCSV(salesByYear: SalesByYear[]): Promise<void> {
    const data = salesByYear.map(year => ({
      'Year': year.year,
      'Total Sales': year.totalSales,
      'Total Revenue (₹)': year.totalRevenue,
      'Average Rate (₹/sq ft)': Math.round(year.averageRate),
      'Jan': year.monthlyBreakdown['Jan'] || 0,
      'Feb': year.monthlyBreakdown['Feb'] || 0,
      'Mar': year.monthlyBreakdown['Mar'] || 0,
      'Apr': year.monthlyBreakdown['Apr'] || 0,
      'May': year.monthlyBreakdown['May'] || 0,
      'Jun': year.monthlyBreakdown['Jun'] || 0,
      'Jul': year.monthlyBreakdown['Jul'] || 0,
      'Aug': year.monthlyBreakdown['Aug'] || 0,
      'Sep': year.monthlyBreakdown['Sep'] || 0,
      'Oct': year.monthlyBreakdown['Oct'] || 0,
      'Nov': year.monthlyBreakdown['Nov'] || 0,
      'Dec': year.monthlyBreakdown['Dec'] || 0
    }));
    
    await this.exportToCSV(data, 'sales-by-year');
  }

  async exportReportToPDF(elementId: string, filename: string): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Report element with ID '${elementId}' not found`);
      }

      // Check if element has content
      if (element.children.length === 0) {
        throw new Error('Report element is empty');
      }

      // Create canvas from the report element with timeout
      const canvas = await this.withTimeout(
        html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            // Ensure styles are applied to cloned document
            const clonedElement = clonedDoc.getElementById(elementId);
            if (clonedElement) {
              clonedElement.style.display = 'block';
              clonedElement.style.visibility = 'visible';
            }
          }
        }),
        30000,
        'Canvas generation timeout'
      );

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to generate canvas from report element');
      }

      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add header
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Indira Krishna Layout - Sales Report', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      
      position = 40;

      // Add the report image
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF with mobile support
      await this.downloadPDFOnMobile(pdf, `${filename}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('PDF generation took too long. Please try again with a smaller report.');
        } else if (error.message.includes('not found')) {
          throw new Error('Unable to find report content. Please refresh the page and try again.');
        } else {
          throw new Error(`PDF generation failed: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred during PDF generation');
      }
    }
  }

  async exportComprehensivePDF(
    salesBySurvey: SalesBySurvey[], 
    salesByOwner: SalesByOwner[], 
    salesByYear: SalesByYear[]
  ): Promise<void> {
    try {
      // Validate input data
      if (!salesBySurvey || !salesByOwner || !salesByYear) {
        throw new Error('Missing required data for comprehensive report');
      }

      if (salesBySurvey.length === 0 && salesByOwner.length === 0 && salesByYear.length === 0) {
        throw new Error('No data available for comprehensive report');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let yPosition = 20;

      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Indira Krishna Layout', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(16);
      pdf.text('Comprehensive Sales Report', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
      yPosition += 20;

      // Sales by Survey Section
      pdf.setFontSize(16);
      pdf.setTextColor(51, 122, 183);
      pdf.text('Sales by Survey', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      salesBySurvey.forEach(survey => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(`${survey.surveyName}:`, 25, yPosition);
        yPosition += 5;
        pdf.text(`  Total: ${survey.totalPlots} | Sold: ${survey.soldPlots} | Revenue: ₹${this.formatNumber(survey.totalRevenue)}`, 30, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Sales by Owner Section
      if (yPosition > 230) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(16);
      pdf.setTextColor(51, 122, 183);
      pdf.text('Sales by Owner', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      salesByOwner.forEach(owner => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(`${owner.ownerName}:`, 25, yPosition);
        yPosition += 5;
        pdf.text(`  Total: ${owner.totalPlots} | Sold: ${owner.soldPlots} | Revenue: ₹${this.formatNumber(owner.totalRevenue)}`, 30, yPosition);
        yPosition += 8;
      });

      yPosition += 10;

      // Sales by Year Section
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(16);
      pdf.setTextColor(51, 122, 183);
      pdf.text('Sales by Year', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      salesByYear.forEach(year => {
        if (yPosition > 240) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(`Year ${year.year}:`, 25, yPosition);
        yPosition += 5;
        pdf.text(`  Sales: ${year.totalSales} plots | Revenue: ₹${this.formatNumber(year.totalRevenue)}`, 30, yPosition);
        yPosition += 5;
        pdf.text(`  Average Rate: ₹${this.formatNumber(year.averageRate)}/sq ft`, 30, yPosition);
        yPosition += 10;
      });

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, 180, 285);
      }

      await this.downloadPDFOnMobile(pdf, 'indira-krishna-layout-comprehensive-report.pdf');
    } catch (error) {
      console.error('Error generating comprehensive PDF:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Missing required data')) {
          throw new Error('Cannot generate report: Required data is missing. Please refresh the page and try again.');
        } else if (error.message.includes('No data available')) {
          throw new Error('Cannot generate report: No sales data available for the selected criteria.');
        } else {
          throw new Error(`Comprehensive report generation failed: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred while generating the comprehensive report');
      }
    }
  }

  private async downloadPDFOnMobile(pdf: jsPDF, fileName: string): Promise<void> {
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    await this.saveFile(pdfBase64, fileName, 'application/pdf', true);
  }

  private async saveFile(content: string, fileName: string, mimeType: string, isBase64: boolean): Promise<void> {
    try {
      const isNativePlatform = Capacitor.isNativePlatform();
      
      if (isNativePlatform) {
        // Native mobile app - use Capacitor Filesystem
        console.log('Saving file on native platform...');
        
        let data: string;
        if (isBase64) {
          data = content;
        } else {
          // Convert CSV to base64
          data = btoa(unescape(encodeURIComponent(content)));
        }
        
        // Save to device
        const result = await Filesystem.writeFile({
          path: fileName,
          data: data,
          directory: Directory.Documents,
          recursive: true
        });
        
        console.log('File saved to:', result.uri);
        
        // Try to share the file
        try {
          await Share.share({
            title: fileName.includes('.pdf') ? 'Report PDF' : 'Report Export',
            text: `Report from Indira Krishna Layout`,
            url: result.uri,
            dialogTitle: 'Share Report'
          });
        } catch (shareError) {
          console.log('Share not available, file saved to Documents folder');
          console.log(`✅ ${fileName} saved successfully`);
        }
        
      } else {
        // Web platform - use traditional browser download
        console.log('Saving file on web platform...');
        
        let blob: Blob;
        if (isBase64) {
          // Convert base64 to blob for PDF
          const byteCharacters = atob(content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: mimeType });
        } else {
          // Direct content for CSV
          blob = new Blob([content], { type: mimeType });
        }
        
        // Try Web Share API first (if available)
        if (navigator.share && navigator.canShare) {
          try {
            const file = new File([blob], fileName, { type: mimeType });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: fileName.includes('.pdf') ? 'Report PDF' : 'Report Export',
                text: 'Report from Indira Krishna Layout',
                files: [file]
              });
              return;
            }
          } catch (shareError) {
            console.log('Web Share API failed, falling back to download');
          }
        }
        
        // Fallback: Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`✅ ${fileName} downloaded successfully`);
      }
      
    } catch (error) {
      console.error('Error saving file:', error);
      
      // Fallback for PDFs
      if (fileName.includes('.pdf') && isBase64) {
        try {
          // Reconstruct PDF and use basic save
          const byteCharacters = atob(content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
        } catch (fallbackError) {
          console.error('Fallback save also failed:', fallbackError);
          throw new Error(`Unable to save ${fileName}. Please try again.`);
        }
      } else {
        throw new Error(`Unable to save ${fileName}. Please try again.`);
      }
    }
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('en-IN').format(num);
  }

  // New specific report methods
  getSalesBySurvey(plots: Plot[]): SalesBySurvey[] {
    const surveyNumbers = Object.values(SurveyNumber);
    const totalSoldPlots = plots.filter(p => p.status === PlotStatus.SOLD).length;
    
    return surveyNumbers.map(surveyNumber => {
      const surveyPlots = plots.filter(p => p.surveyNumber === surveyNumber);
      const soldPlots = surveyPlots.filter(p => p.status === PlotStatus.SOLD);
      
      const totalRevenue = soldPlots.reduce((sum, plot) => {
        return sum + plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      }, 0);
      
      const totalArea = soldPlots.reduce((sum, plot) => sum + plot.dimensions.area, 0);
      
      return {
        surveyNumber,
        surveyName: this.getSurveyDisplayName(surveyNumber),
        totalPlots: surveyPlots.length,
        soldPlots: soldPlots.length,
        availablePlots: surveyPlots.filter(p => p.status === PlotStatus.AVAILABLE).length,
        preBookedPlots: surveyPlots.filter(p => p.status === PlotStatus.PRE_BOOKED).length,
        totalRevenue,
        averageRate: totalArea > 0 ? totalRevenue / totalArea : 0,
        salesPercentage: totalSoldPlots > 0 ? (soldPlots.length / totalSoldPlots) * 100 : 0,
        plotsSold: soldPlots
      };
    });
  }

  getSalesByOwner(plots: Plot[]): SalesByOwner[] {
    const owners = Object.values(OwnerType);
    const totalSoldPlots = plots.filter(p => p.status === PlotStatus.SOLD).length;
    
    return owners.map(owner => {
      const ownerPlots = plots.filter(p => p.owner === owner);
      const soldPlots = ownerPlots.filter(p => p.status === PlotStatus.SOLD);
      
      const totalRevenue = soldPlots.reduce((sum, plot) => {
        return sum + plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      }, 0);
      
      const totalArea = soldPlots.reduce((sum, plot) => sum + plot.dimensions.area, 0);
      
      return {
        owner,
        ownerName: this.getOwnerDisplayName(owner),
        totalPlots: ownerPlots.length,
        soldPlots: soldPlots.length,
        availablePlots: ownerPlots.filter(p => p.status === PlotStatus.AVAILABLE).length,
        preBookedPlots: ownerPlots.filter(p => p.status === PlotStatus.PRE_BOOKED).length,
        totalRevenue,
        averageRate: totalArea > 0 ? totalRevenue / totalArea : 0,
        salesPercentage: totalSoldPlots > 0 ? (soldPlots.length / totalSoldPlots) * 100 : 0,
        plotsSold: soldPlots
      };
    });
  }

  getSalesByYear(plots: Plot[]): SalesByYear[] {
    // Get all unique years from sold plots
    const years = new Set<number>();
    plots.forEach(plot => {
      if (plot.status === PlotStatus.SOLD && plot.purchaser) {
        const year = this.getYearFromDate(plot.purchaser.registrationDate);
        if (year) {
          years.add(year);
        }
      }
    });

    return Array.from(years).sort((a, b) => b - a).map(year => {
      const yearPlots = plots.filter(plot => {
        if (plot.status !== PlotStatus.SOLD || !plot.purchaser) return false;
        const plotYear = this.getYearFromDate(plot.purchaser.registrationDate);
        return plotYear === year;
      });

      const totalRevenue = yearPlots.reduce((sum, plot) => {
        return sum + plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      }, 0);

      const totalArea = yearPlots.reduce((sum, plot) => sum + plot.dimensions.area, 0);

      // Monthly breakdown
      const monthlyBreakdown: { [month: string]: number } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      months.forEach(month => monthlyBreakdown[month] = 0);
      
      yearPlots.forEach(plot => {
        if (plot.purchaser) {
          const date = this.parseDate(plot.purchaser.registrationDate);
          if (date) {
            const month = months[date.getMonth()];
            monthlyBreakdown[month]++;
          }
        }
      });

      // Survey breakdown
      const surveyBreakdown: { [survey: string]: number } = {};
      Object.values(SurveyNumber).forEach(survey => {
        surveyBreakdown[survey] = yearPlots.filter(p => p.surveyNumber === survey).length;
      });

      return {
        year,
        totalSales: yearPlots.length,
        totalRevenue,
        averageRate: totalArea > 0 ? totalRevenue / totalArea : 0,
        monthlyBreakdown,
        surveyBreakdown,
        plotsSold: yearPlots
      };
    });
  }

  private parseDate(date: Date | string): Date | null {
    try {
      if (date instanceof Date) {
        return date;
      }
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
      }
      return null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }

  private getSurveyDisplayName(surveyNumber: string): string {
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

  private getOwnerDisplayName(owner: OwnerType): string {
    switch (owner) {
      case OwnerType.BAPURAO:
        return 'Bapurao Paga';
      case OwnerType.NARAYANRAO:
        return 'Narayanrao Paga';
      case OwnerType.JOINT:
        return 'Joint Ownership';
      default:
        return owner;
    }
  }
}