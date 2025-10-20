export enum PlotStatus {
  AVAILABLE = 'AVAILABLE',
  PRE_BOOKED = 'PRE_BOOKED',
  SOLD = 'SOLD'
}

export enum OwnerType {
  BAPURAO = 'BAPURAO',
  NARAYANRAO = 'NARAYANRAO',
  JOINT = 'JOINT'
}

export enum PaymentMode {
  RTGS = 'RTGS',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CARD = 'CARD'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE'
}

export enum SurveyNumber {
  SURVEY_152_1 = '152/1',
  SURVEY_152_2 = '152/2',
  SURVEY_152_3 = '152/3'
}

export interface Purchaser {
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  registrationDate: Date;
}

export interface Payment {
  id: string;
  amount: number;
  mode: PaymentMode;
  date: Date;
  reference?: string; // Cheque number, RTGS reference, etc.
  remarks?: string;
  description?: string;
  receiptNumber?: string;
  // Extended fields for payment management (added dynamically)
  plotNumber?: string;
  surveyNumber?: string;
  customerName?: string;
  plotTotalCost?: number;
}

export interface PlotDimensions {
  length: number; // in meters
  width: number;  // in meters
  area: number;   // in sq.meters (calculated)
}

export interface Plot {
  id: string;
  surveyNumber: SurveyNumber;
  plotNumber: string;
  dimensions: PlotDimensions;
  status: PlotStatus;
  owner: OwnerType;
  ratePerSqMeter: number;
  totalCost: number;
  governmentRate: number;
  purchaser?: Purchaser;
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveySummary {
  surveyNumber: SurveyNumber;
  totalPlots: number;
  availablePlots: number;
  preBookedPlots: number;
  soldPlots: number;
  totalArea: number; // in sq.meters
  soldArea: number;
  totalRevenue: number;
  pendingAmount: number;
}

export interface DashboardStats {
  totalPlots: number;
  totalSoldPlots: number;
  totalRevenue: number;
  pendingAmount: number;
  surveySummaries: SurveySummary[];
}