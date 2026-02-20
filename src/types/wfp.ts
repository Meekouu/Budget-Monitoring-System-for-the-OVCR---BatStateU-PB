export type WFPActivityStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export interface WFPActivity {
  id: string;
  budgetCode: string; // Links to BudgetLine
  campusId: string;
  programName: string; // e.g., CABEIHM
  projectName: string;
  activityName: string;
  beneficiaries: number; // Planned beneficiaries
  allocation: number;
  lastUpdated: Date;
  status: WFPActivityStatus;
  actualBeneficiaries?: number; // Actual count when completed
  actualExpenditure?: number; // Actual spending
  completionDate?: Date;
  notes?: string;
  attachments?: string[]; // Photo URLs, documents
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Quarterly tracking
  q1Target?: number;
  q1Accomplished?: number;
  q2Target?: number;
  q2Accomplished?: number;
  q3Target?: number;
  q3Accomplished?: number;
  q4Target?: number;
  q4Accomplished?: number;
  // Indicators
  physicalAccomplishment?: number; // Percentage
  budgetUtilization?: number; // Percentage
}
