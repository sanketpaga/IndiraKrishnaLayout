import { Injectable } from '@angular/core';
import { Payment, PaymentMode, Plot } from '../models/plot.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private plotService: any; // Will be injected later to avoid circular dependency
  
  constructor() { }

  setPlotService(plotService: any) {
    this.plotService = plotService;
  }

  addPayment(plotId: string, payment: Omit<Payment, 'id'>): Payment {
    const newPayment: Payment = {
      ...payment,
      id: this.generatePaymentId()
    };
    
    console.log('PaymentService: Adding payment', newPayment, 'to plot', plotId);
    
    // Add payment to plot if plotService is available
    if (this.plotService) {
      const plot = this.plotService.getPlotById(plotId);
      if (plot) {
        console.log('Plot found, current payments:', plot.payments.length);
        plot.payments.push(newPayment);
        plot.updatedAt = new Date();
        console.log('Plot after adding payment, payments count:', plot.payments.length);
        console.log('Calling updatePlot...');
        this.plotService.updatePlot(plot);
      } else {
        console.error('Plot not found for ID:', plotId);
      }
    } else {
      console.error('PlotService not available');
    }
    
    return newPayment;
  }

  calculateTotalPaid(payments: Payment[]): number {
    return payments.reduce((total, payment) => total + payment.amount, 0);
  }

  calculatePendingAmount(totalCost: number, payments: Payment[]): number {
    const totalPaid = this.calculateTotalPaid(payments);
    return Math.max(0, totalCost - totalPaid);
  }

  getPaymentsByDateRange(payments: Payment[], startDate: Date, endDate: Date): Payment[] {
    return payments.filter(payment => 
      payment.date >= startDate && payment.date <= endDate
    );
  }

  getPaymentsByMode(payments: Payment[], mode: PaymentMode): Payment[] {
    return payments.filter(payment => payment.mode === mode);
  }

  getAllPayments(): Payment[] {
    if (!this.plotService) {
      return [];
    }
    
    const allPayments: Payment[] = [];
    // Get all plots from plot service
    this.plotService.plots.forEach((plot: Plot) => {
      if (plot.payments && plot.payments.length > 0) {
        // Ensure each payment has the required fields
        plot.payments.forEach(payment => {
          allPayments.push({
            ...payment,
            plotNumber: payment.plotNumber || plot.plotNumber,
            surveyNumber: payment.surveyNumber || plot.surveyNumber,
            customerName: payment.customerName || plot.purchaser?.name || 'Unknown'
          });
        });
      }
    });
    
    return allPayments;
  }

  private generatePaymentId(): string {
    return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatPaymentMode(mode: PaymentMode): string {
    switch (mode) {
      case PaymentMode.RTGS:
        return 'RTGS';
      case PaymentMode.CHEQUE:
        return 'Cheque';
      case PaymentMode.CASH:
        return 'Cash';
      case PaymentMode.BANK_TRANSFER:
        return 'Bank Transfer';
      case PaymentMode.UPI:
        return 'UPI';
      case PaymentMode.CARD:
        return 'Card';
      default:
        return mode;
    }
  }

  validatePayment(payment: Partial<Payment>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payment.amount || payment.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (!payment.mode) {
      errors.push('Payment mode is required');
    }

    if (!payment.date) {
      errors.push('Payment date is required');
    }

    if (payment.mode === PaymentMode.CHEQUE && !payment.reference) {
      errors.push('Cheque number is required for cheque payments');
    }

    if (payment.mode === PaymentMode.RTGS && !payment.reference) {
      errors.push('RTGS reference is required for RTGS payments');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}