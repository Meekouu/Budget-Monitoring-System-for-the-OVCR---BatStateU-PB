export interface Campus {
  id: string;
  name: string;
}

export interface College {
  id: string;
  name: string;
}

export interface Program {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  programId: string;
  name: string;
}

export interface Activity {
  id: string;
  projectId: string;
  name: string;
}

export interface FundingSource {
  id: string;
  name: string;
  code: string; // GAD, MDS, STF, SUPP, etc
}

export interface BudgetLine {
  id: string;
  fiscalYear: string;
  budgetCode: string;
  programId: string;
  projectId: string;
  activityId: string;
  campusId: string;
  collegeId?: string;
  fundingSourceId: string;
  allocationAmount: number;
}

export type BudgetTransactionStatus = 'Draft' | 'Evaluation' | 'Proposal' | 'PR' | 'Obligated' | 'Disbursed' | 'Rejected' | 'Returned';

export type WorkflowStage = 'wfp' | 'proposal' | 'monitoring' | 'supplemental' | 'bur1' | 'bur2';

export interface BudgetTransaction {
  id: string;
  budgetCode: string;
  status: BudgetTransactionStatus;
  dateReceived: Date;
  programName: string;
  projectName: string;
  activityName: string;
  campusId: string;
  collegeId?: string;
  beneficiariesMale: number;
  beneficiariesFemale: number;
  beneficiariesTotal: number;
  implementationDate?: string; // Can be a range like "March 1-31, 2025"
  motherProposalId?: string;
  isConsolidatedPR: boolean;
  otherFunding?: string;
  amountRequested: number;
  isSupplemental: boolean;
  stage?: WorkflowStage; // Workflow stage: proposal, monitoring, supplemental, bur1, bur2
  fundCategory: string; // GAD, MDS, STF, Extension, SUPP
  fundingSource: string;
  approvedAmount?: number; // BUR2 approved amount
  balance?: number; // Remaining balance after obligations/disbursements
  trackingNo?: string;
  remarks?: string;
  prNo?: string;
  prAmount?: number;
  allObsNo?: string;
  obligationDate?: Date;
  obligationAmount?: number;
  supplierPayee?: string;
  particulars?: string;
  dvNo?: string;
  dvAmount?: number;
  attachments: string[]; // File URLs
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}
