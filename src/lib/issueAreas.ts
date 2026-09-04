export const ISSUE_AREAS = [
  'LFC - Chorus',
  'LFC - Enable',
  'LFC - Northpower',
  'LFC - Tuatahi Fibre',
  'Downer',
  'NZ Data',
  'Internal - Supply Chain',
  'Internal - CNS',
  'Internal - Fulfilment',
  'Internal - Enterprise Services',
  'Internal - Sales',
  'Internal - Solutions',
  'Internal - Other',
  'Systems - Tahi',
  'Systems - Flex',
  'Systems - Other',
] as const;

export type IssueArea = (typeof ISSUE_AREAS)[number];
