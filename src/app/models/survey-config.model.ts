export interface SurveyConfig {
  surveyNumber: string;
  owner: string;
  totalPlots: number;
  totalArea: number; // in sq.meters
  plotTypes: PlotTypeConfig[];
}

export interface PlotTypeConfig {
  dimensions: string; // e.g., "9x15", "9x12", "9xodd"
  count: number;
  length: number; // in feet
  width: number;  // in feet
}

export const SURVEY_CONFIGS: SurveyConfig[] = [
  {
    surveyNumber: '152/1',
    owner: 'Bapurao',
    totalPlots: 67,
    totalArea: 14771,
    plotTypes: [
      { dimensions: '9x15', count: 4, length: 9, width: 15 },
      { dimensions: '9x12', count: 50, length: 9, width: 12 },
      { dimensions: '9xodd', count: 13, length: 9, width: 10 } // assuming avg 10 for odd
    ]
  },
  {
    surveyNumber: '152/2',
    owner: 'Narayanrao',
    totalPlots: 57,
    totalArea: 14771,
    plotTypes: [
      { dimensions: '9x12', count: 47, length: 9, width: 12 },
      { dimensions: '9xodd', count: 10, length: 9, width: 10 }
    ]
  },
  {
    surveyNumber: '152/3',
    owner: 'Shared',
    totalPlots: 166,
    totalArea: 36118,
    plotTypes: [
      { dimensions: '9x15', count: 33, length: 9, width: 15 },
      { dimensions: '9x12', count: 98, length: 9, width: 12 },
      { dimensions: '9xodd', count: 14, length: 9, width: 10 },
      { dimensions: 'oddxodd', count: 21, length: 10, width: 10 }
    ]
  }
];

export interface ReportFilter {
  surveyNumbers?: string[];
  plotStatus?: string[];
  owners?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  plotNumbers?: string[];
}