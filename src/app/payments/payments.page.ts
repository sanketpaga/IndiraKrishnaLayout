import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  IonRefresher,
  IonRefresherContent,
  IonAccordion,
  IonAccordionGroup,
  IonProgressBar,
  IonSpinner
} from '@ionic/angular/standalone';
import { PlotService } from '../services/plot.service';
import { PaymentService } from '../services/payment.service';
import { Plot, Payment, PaymentMode, PaymentStatus } from '../models/plot.model';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { 
  searchOutline, 
  addOutline, 
  cashOutline,
  cardOutline,
  receiptOutline,
  calendarOutline,
  timeOutline,
  checkmarkCircle,
  alertCircle,
  closeOutline,
  downloadOutline,
  printOutline,
  filterOutline,
  walletOutline,
  businessOutline,
  trendingUpOutline,
  statsChartOutline,
  personOutline,
  createOutline, trashOutline, chevronForwardOutline } from 'ionicons/icons';

interface PaymentFormData {
  plotId: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  description: string;
  receiptNumber: string;
}

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
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
  IonRefresher,
  IonRefresherContent,
  IonAccordion,
    IonAccordionGroup,
    IonProgressBar,
    IonSpinner
  ]
})
export class PaymentsPage implements OnInit, OnDestroy {
  plots: Plot[] = [];
  filteredPlots: Plot[] = [];
  allPayments: Payment[] = [];
  filteredPayments: Payment[] = [];
  
  // Subscription management
  private plotsSubscription: Subscription | null = null;
  
  // Loading states
  isPageLoading = true;
  isPaymentSaving = false;
  isPdfGenerating = false;
  isRefreshing = false;
  isModalLoading = false;
  
  // Search and filter
  searchTerm: string = '';
  selectedSurvey: string = 'all'; // all, 152/1, 152/2, 152/3
  
  // Modal states
  isPaymentModalOpen = false;
  isReceiptModalOpen = false;
  isEditMode = false;
  selectedPlot: Plot | null = null;
  selectedPayment: Payment | null = null;
  
  // Form data
    paymentForm: PaymentFormData = {
    plotId: '',
    amount: 0,
    mode: PaymentMode.CASH,
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    description: '',
    receiptNumber: ''
  };  // Analytics
  totalReceived = 0;
  totalPending = 0;
  monthlyCollection = 0;
  overdueAmount = 0;

  // Expose enums to template
  PaymentMode = PaymentMode;
  PaymentStatus = PaymentStatus;

  constructor(
    private plotService: PlotService,
    private paymentService: PaymentService
  ) {
    // Set plot service reference for payment service
    this.paymentService.setPlotService(this.plotService);
    addIcons({statsChartOutline,trendingUpOutline,timeOutline,cashOutline,alertCircle,addOutline,receiptOutline,createOutline,trashOutline,closeOutline,downloadOutline,printOutline,chevronForwardOutline,searchOutline,cardOutline,calendarOutline,checkmarkCircle,filterOutline,walletOutline,personOutline,businessOutline});
  }

  ngOnInit() {
    // Load data asynchronously to avoid blocking navigation
    setTimeout(() => {
      this.loadData();
    }, 100);
  }

  loadData() {
    this.isPageLoading = true;
    console.log('Loading payment data started - should show progress bar');
    
    // Subscribe to the plots observable to get real-time updates
    this.plotsSubscription = this.plotService.plots$.subscribe({
      next: (plots) => {
        console.log('Plots received for payments:', plots.length);
        
        // Don't hide loading immediately on first empty response
        // Wait for actual data from Google Sheets
        if (plots.length === 0) {
          console.log('Empty plots response - keeping progress bar visible for Google Sheets loading');
          return;
        }
        
        // Show all SOLD and PRE_BOOKED plots (even without purchaser assigned)
        this.plots = plots.filter(plot => plot.status === 'SOLD' || plot.status === 'PRE_BOOKED');
        console.log('SOLD/PRE_BOOKED plots:', this.plots.length);
        
        // Debug payment data for each plot
        this.plots.forEach(plot => {
          console.log(`Plot ${plot.id} (${plot.plotNumber}):`, {
            status: plot.status,
            paymentsCount: plot.payments.length,
            payments: plot.payments
          });
        });
        
        this.filteredPlots = [...this.plots];
        this.extractAllPayments();
        this.calculateAnalytics();
        this.applyFilters();
        
        console.log('Filtered plots after applyFilters:', this.filteredPlots.length);
        
        // Hide loading when we have actual data from Google Sheets
        setTimeout(() => {
          this.isPageLoading = false;
          console.log('Payment data loading completed - progress bar should hide');
        }, 500);
      },
      error: (error) => {
        console.error('Error loading payment data:', error);
        this.isPageLoading = false;
      }
    });

    // Fallback timeout to hide loading if Google Sheets takes too long
    setTimeout(() => {
      if (this.isPageLoading) {
        this.isPageLoading = false;
        console.log('Payment loading fallback timeout - progress bar should hide');
      }
    }, 10000); // 10 second fallback timeout
  }

extractAllPayments() {
    this.allPayments = [];
    this.plots.forEach(plot => {
      plot.payments.forEach(payment => {
        this.allPayments.push({
          ...payment,
          plotNumber: payment.plotNumber || plot.plotNumber,
          surveyNumber: payment.surveyNumber || plot.surveyNumber,
          customerName: payment.customerName || plot.purchaser?.name || 'Unknown',
          plotTotalCost: plot.totalCost
        } as Payment);
      });
    });
    this.filteredPayments = [...this.allPayments];
  }

  calculateAnalytics() {
    this.totalReceived = this.allPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    this.totalPending = this.plots.reduce((sum, plot) => {
      const totalPaid = plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      return sum + (plot.totalCost - totalPaid);
    }, 0);

    // Calculate current month collection
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    this.monthlyCollection = this.allPayments
      .filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate overdue amount (for demonstration, consider payments pending for >30 days)
    this.overdueAmount = this.plots.reduce((sum, plot) => {
      const totalPaid = plot.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
      const remaining = plot.totalCost - totalPaid;
      if (remaining > 0 && plot.purchaser) {
        const daysSinceRegistration = Math.floor(
          (new Date().getTime() - new Date(plot.purchaser.registrationDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceRegistration > 30) {
          return sum + remaining;
        }
      }
      return sum;
    }, 0);
  }

  onRefresh(event: any) {
    this.isRefreshing = true;
    this.loadData();
    setTimeout(() => {
      event.target.complete();
      this.isRefreshing = false;
    }, 1000);
  }

  onSearchChange(event: any) {
    this.searchTerm = event.target.value.toLowerCase();
    this.applyFilters();
  }

  onSurveyFilter(value: string) {
    this.selectedSurvey = value;
    this.applyFilters();
  }

  applyFilters() {
    // Filter plots (already pre-filtered to SOLD and PRE_BOOKED in loadData)
    this.filteredPlots = this.plots.filter(plot => {
      const matchesSearch = !this.searchTerm || 
        plot.plotNumber.toLowerCase().includes(this.searchTerm) ||
        plot.surveyNumber.toLowerCase().includes(this.searchTerm) ||
        plot.purchaser?.name?.toLowerCase().includes(this.searchTerm) ||
        plot.purchaser?.mobile?.includes(this.searchTerm);

      const matchesSurvey = this.selectedSurvey === 'all' || plot.surveyNumber === this.selectedSurvey;

      return matchesSearch && matchesSurvey;
    });

    // Filter payments
    this.filteredPayments = this.allPayments.filter(payment => {
      const matchesSearch = !this.searchTerm ||
        payment.plotNumber?.toLowerCase().includes(this.searchTerm) ||
        payment.surveyNumber?.toLowerCase().includes(this.searchTerm) ||
        payment.customerName?.toLowerCase().includes(this.searchTerm);

      const matchesSurvey = this.selectedSurvey === 'all' || payment.surveyNumber === this.selectedSurvey;

      return matchesSearch && matchesSurvey;
    });
  }

  openPaymentModal(plot: Plot) {
    this.selectedPlot = plot;
    this.isEditMode = false;
    this.isModalLoading = false; // No loading for new payments
    
    const currentDate = new Date();
    this.paymentForm = {
      plotId: plot.id,
      amount: 0,
      mode: PaymentMode.CASH,
      date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format for HTML date input
      description: 'Payment for Plot ' + plot.plotNumber,
      receiptNumber: this.generateReceiptNumber()
    };
    this.isPaymentModalOpen = true;
  }

  closePaymentModal() {
    this.isPaymentModalOpen = false;
    this.selectedPlot = null;
    this.selectedPayment = null;
    this.isEditMode = false;
  }

  savePayment() {
    if (this.selectedPlot && this.paymentForm.amount > 0 && this.paymentForm.date) {
      this.isPaymentSaving = true;
      
      // Validate and convert date
      let paymentDate: Date;
      try {
        paymentDate = new Date(this.paymentForm.date);
        if (isNaN(paymentDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        console.error('Invalid date provided:', this.paymentForm.date);
        paymentDate = new Date(); // fallback to current date
      }

      try {
        if (this.isEditMode && this.selectedPayment) {
          // Update existing payment
          const updatedPayment: Payment = {
            ...this.selectedPayment,
            amount: this.paymentForm.amount,
            date: paymentDate,
            mode: this.paymentForm.mode,
            description: this.paymentForm.description,
            receiptNumber: this.paymentForm.receiptNumber
          };

          this.updatePaymentInPlot(this.selectedPlot, updatedPayment);
        } else {
          // Create new payment
          const newPayment: Payment = {
            id: 'payment-' + Date.now(),
            amount: this.paymentForm.amount,
            date: paymentDate,
            mode: this.paymentForm.mode,
            description: this.paymentForm.description,
            receiptNumber: this.paymentForm.receiptNumber,
            plotNumber: this.selectedPlot.plotNumber,
            surveyNumber: this.selectedPlot.surveyNumber,
            customerName: this.selectedPlot.purchaser?.name || ''
          };

          console.log('Adding new payment:', newPayment);
          console.log('To plot:', this.selectedPlot.id);
          
          this.paymentService.addPayment(this.selectedPlot.id, newPayment);
          
          console.log('Plot after adding payment:', this.selectedPlot);
        }
        
        this.closePaymentModal();
        this.loadData(); // Refresh data
      } catch (error) {
        console.error('Error saving payment:', error);
      } finally {
        this.isPaymentSaving = false;
      }
    }
  }

  openReceiptModal(payment: Payment) {
    // Find the plot for this payment to get complete information
    const plot = this.plots.find(p => p.payments.some(pp => pp.id === payment.id));
    
    // Ensure payment has complete plot information
    this.selectedPayment = {
      ...payment,
      plotNumber: payment.plotNumber || plot?.plotNumber || 'Unknown',
      surveyNumber: payment.surveyNumber || plot?.surveyNumber || 'Unknown',
      customerName: payment.customerName || plot?.purchaser?.name || 'Unknown'
    };
    this.isReceiptModalOpen = true;
  }

  closeReceiptModal() {
    this.isReceiptModalOpen = false;
    this.selectedPayment = null;
  }

  editPayment(payment: Payment, plot: Plot) {
    this.selectedPlot = plot;
    this.selectedPayment = payment;
    this.isEditMode = true;
    this.isPaymentModalOpen = true;
    this.isModalLoading = true;
    
    // Initially populate with local data to avoid empty form
    this.populatePaymentForm(payment, plot);
    console.log('Initial payment data:', payment);
    
    // Simulate loading latest data (you can replace this with actual API call if needed)
    setTimeout(() => {
      this.isModalLoading = false;
      console.log('Payment edit modal loaded');
    }, 800);
  }

  private populatePaymentForm(payment: Payment, plot: Plot) {
    // Populate form with existing payment data
    let dateString: string;
    try {
      if (payment.date instanceof Date) {
        dateString = payment.date.toISOString().split('T')[0]; // YYYY-MM-DD format
      } else if (typeof payment.date === 'string') {
        dateString = new Date(payment.date).toISOString().split('T')[0];
      } else {
        dateString = new Date().toISOString().split('T')[0]; // fallback
      }
    } catch (error) {
      console.warn('Date conversion error:', error);
      dateString = new Date().toISOString().split('T')[0]; // fallback
    }

    this.paymentForm = {
      plotId: plot.id,
      amount: payment.amount,
      mode: payment.mode,
      date: dateString,
      description: payment.description || '',
      receiptNumber: payment.receiptNumber || ''
    };
  }

  updatePaymentInPlot(plot: Plot, updatedPayment: Payment) {
    const paymentIndex = plot.payments.findIndex(p => p.id === updatedPayment.id);
    if (paymentIndex !== -1) {
      plot.payments[paymentIndex] = updatedPayment;
      plot.updatedAt = new Date();
      this.plotService.updatePlot(plot);
    }
  }

  async deletePayment(payment: Payment, plot: Plot) {
    // Show confirmation alert
    if (confirm(`Are you sure you want to delete this payment of ${this.formatCurrency(payment.amount)}?`)) {
      const paymentIndex = plot.payments.findIndex(p => p.id === payment.id);
      if (paymentIndex !== -1) {
        plot.payments.splice(paymentIndex, 1);
        plot.updatedAt = new Date();
        this.plotService.updatePlot(plot);
        this.loadData(); // Refresh data
      }
    }
  }

  generateReceiptNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const timestamp = Date.now().toString().substr(-6);
    return `IKL${year}${month}${timestamp}`;
  }

  // Getter for sold/pre-booked plots (for payment management)
  get plotsWithPendingPayments(): Plot[] {
    return this.filteredPlots.filter(plot => 
      plot.status === 'SOLD' || plot.status === 'PRE_BOOKED'
    );
  }

  // Method to get status color (needed for template)
  getStatusColor(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'medium';
      case 'PRE_BOOKED':
        return 'warning';
      case 'SOLD':
        return 'success';
      default:
        return 'medium';
    }
  }

  getPaymentStatusColor(plot: Plot): string {
    const totalPaid = plot.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = plot.totalCost - totalPaid;
    
    if (remaining <= 0) return 'success';
    if (remaining < plot.totalCost * 0.3) return 'warning';
    return 'danger';
  }

  getPaymentProgress(plot: Plot): number {
    const totalPaid = plot.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return totalPaid / plot.totalCost;
  }

  getRemainingAmount(plot: Plot): number {
    const totalPaid = plot.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return Math.max(0, plot.totalCost - totalPaid);
  }

  getTotalPaidAmount(plot: Plot): number {
    return plot.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  fillRemainingAmount(): void {
    if (this.selectedPlot) {
      const remaining = this.getRemainingAmount(this.selectedPlot);
      if (remaining > 0) {
        this.paymentForm.amount = remaining;
      }
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

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN');
  }

  getMethodIcon(mode: PaymentMode): string {
    switch (mode) {
      case PaymentMode.CASH: return 'cash-outline';
      case PaymentMode.CHEQUE: return 'receipt-outline';
      case PaymentMode.BANK_TRANSFER: return 'bank-outline';
      case PaymentMode.UPI: return 'wallet-outline';
      case PaymentMode.CARD: return 'card-outline';
      default: return 'cash-outline';
    }
  }

  async downloadReceipt(payment: Payment) {
    this.isPdfGenerating = true;
    
    try {
      // Create a temporary div with the receipt content
      const receiptElement = this.createReceiptElement(payment);
      document.body.appendChild(receiptElement);

      // Generate canvas from the receipt element
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Remove the temporary element
      document.body.removeChild(receiptElement);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const fileName = `receipt_${payment.receiptNumber || payment.id}.pdf`;
      
      // Download the PDF
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to basic browser print dialog
      this.printReceiptFallback(payment);
    } finally {
      this.isPdfGenerating = false;
    }
  }

  async printReceipt(payment: Payment) {
    // For mobile, downloading PDF is often more practical than printing
    await this.downloadReceipt(payment);
  }

  private createReceiptElement(payment: Payment): HTMLElement {
    const receiptDiv = document.createElement('div');
    receiptDiv.innerHTML = this.generateReceiptHTML(payment);
    receiptDiv.style.position = 'absolute';
    receiptDiv.style.left = '-9999px';
    receiptDiv.style.top = '-9999px';
    receiptDiv.style.width = '600px';
    receiptDiv.style.backgroundColor = 'white';
    receiptDiv.style.padding = '20px';
    return receiptDiv;
  }

  private printReceiptFallback(payment: Payment) {
    // Fallback method for devices that don't support PDF generation
    const receiptContent = this.generateReceiptHTML(payment);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  private generateReceiptHTML(payment: Payment): string {
    const currentDate = new Date().toLocaleDateString('en-IN');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6; background: white;">
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
          <div style="font-size: 24px; font-weight: bold; color: #333;">Indira Krishna Layout</div>
          <div style="font-size: 18px; color: #666; margin-top: 5px;">Payment Receipt</div>
        </div>
        
        <div style="margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; width: 40%;">Receipt No:</div>
            <div style="width: 60%; text-align: right;">${payment.receiptNumber || payment.id}</div>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; width: 40%;">Date:</div>
            <div style="width: 60%; text-align: right;">${this.formatDate(payment.date)}</div>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; width: 40%;">Plot Number:</div>
            <div style="width: 60%; text-align: right;">${payment.plotNumber || 'N/A'}</div>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; width: 40%;">Survey:</div>
            <div style="width: 60%; text-align: right;">${payment.surveyNumber || 'N/A'}</div>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; width: 40%;">Customer:</div>
            <div style="width: 60%; text-align: right;">${payment.customerName || 'N/A'}</div>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; width: 40%;">Payment Method:</div>
            <div style="width: 60%; text-align: right;">${payment.mode}</div>
          </div>
          ${payment.description ? `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; width: 40%;">Description:</div>
            <div style="width: 60%; text-align: right;">${payment.description}</div>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 8px 0; background-color: #f5f5f5; font-size: 18px; font-weight: bold; margin-top: 10px;">
            <div style="width: 40%;">Amount Paid:</div>
            <div style="width: 60%; text-align: right;">${this.formatCurrency(payment.amount)}</div>
          </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
          <p>Thank you for your payment!</p>
          <p>Generated on: ${currentDate}</p>
        </div>
      </div>
    `;
  }

  trackByPayment(index: number, payment: Payment): string {
    return payment.id;
  }

  trackByPlot(index: number, plot: Plot): string {
    return plot.id;
  }

  ngOnDestroy() {
    if (this.plotsSubscription) {
      this.plotsSubscription.unsubscribe();
    }
  }
}