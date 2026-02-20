// Campus mappings and display names
export const CAMPUS_MAP: Record<string, string> = {
  'pb': 'PB',
  'lemery': 'LEM', 
  'rosario': 'ROS',
  'san-juan': 'SJ',
};

export const CAMPUS_DISPLAY_NAMES: Record<string, string> = {
  'pb': 'Pablo Borbon',
  'lemery': 'Lemery',
  'rosario': 'Rosario',
  'san-juan': 'San Juan',
};

export const CAMPUS_ID_MAP: Record<string, string> = {
  'pablo borbon': 'pb',
  'pb': 'pb',
  'lemery': 'lemery',
  'lem': 'lemery',
  'rosario': 'rosario',
  'ros': 'rosario',
  'san juan': 'san-juan',
  'sj': 'san-juan',
};

// Extension Budget Special Categories
export const EXTENSION_BUDGET_CATEGORIES: Record<string, string> = {
  'contingency': 'Contingency',
  'pb': 'PB',
  'lemery': 'Lemery',
  'rosario': 'Rosario',
  'san-juan': 'San Juan',
  'lex': 'LeX',
  'step': 'STEP for STEM',
};

// College mappings
export const COLLEGE_MAP: Record<string, string> = {
  'cabm': 'cabm',
  'cabmhm': 'cabmhm',
  'cabeihm': 'cabeihm',
  'cas': 'cas',
  'ccje': 'ccje',
  'chs': 'chs',
  'cte': 'cte',
};

// Default values
export const DEFAULT_VALUES = {
  fundCategory: 'Extension',
  fundingSource: 'University Fund',
  programName: 'Extension',
  projectName: 'Imported Project',
  activityName: 'Imported Activity',
};

// Pagination defaults
export const PAGINATION = {
  defaultRowsPerPage: 10,
  proposalRowsPerPage: 5,
};

// Status color mappings
export const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Evaluation': 'bg-blue-100 text-blue-800',
  'Proposal': 'bg-indigo-100 text-indigo-800',
  'PR': 'bg-yellow-100 text-yellow-800',
  'Obligated': 'bg-orange-100 text-orange-800',
  'Disbursed': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800',
  'Returned': 'bg-pink-100 text-pink-800',
};

// Workflow stage configurations
export const WORKFLOW_STAGES: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  wfp: { label: 'WFP Activities', color: 'text-indigo-800', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  proposal: { label: 'Proposal Logs', color: 'text-blue-800', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  monitoring: { label: 'Monitoring (ORS)', color: 'text-green-800', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  supplemental: { label: 'Supplemental', color: 'text-yellow-800', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  bur1: { label: 'BUR1 - Proposal Fund', color: 'text-orange-800', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  bur2: { label: 'BUR2 - ALOBS (Allocated Budgets)', color: 'text-purple-800', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
};
