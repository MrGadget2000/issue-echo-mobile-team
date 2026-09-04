import { Issue } from '@/types/issue';

const escape = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

export function exportIssuesToCsv(issues: Issue[]): void {
  const headers = [
    'Title',
    'Description',
    'Issue Area',
    'Status',
    'Votes',
    'Customer Examples',
    'Customer Impact',
    'Team Impact',
    'Effort Estimate',
    'Workaround Available',
    'Churn Risk',
    'Reported By',
    'Created At',
    'Updated At',
    'Closed At',
    'Closed By',
    'Example Details',
  ];

  const rows = issues.map((issue) => {
    const examples = issue.customerData
      .map((ex) =>
        [
          ex.customerName && `Customer: ${ex.customerName}`,
          ex.orderId && `Order: ${ex.orderId}`,
          ex.phoneNumber && `Phone: ${ex.phoneNumber}`,
          ex.serviceType && `Service: ${ex.serviceType}`,
          ex.additionalDetails && `Details: ${ex.additionalDetails}`,
        ]
          .filter(Boolean)
          .join(' | ')
      )
      .join(' || ');

    return [
      issue.title,
      issue.description,
      issue.issueArea ?? '',
      issue.closed ? 'Closed' : 'Open',
      issue.votes,
      issue.customerData.length,
      issue.customerImpact ?? '',
      issue.teamImpact ?? '',
      issue.effortEstimate ?? '',
      issue.workaroundAvailable ?? '',
      issue.churnRisk ? 'Yes' : 'No',
      issue.createdByProfile?.displayName || issue.createdByProfile?.email || '',
      issue.createdAt ? new Date(issue.createdAt).toISOString() : '',
      issue.updatedAt ? new Date(issue.updatedAt).toISOString() : '',
      issue.closedAt ? new Date(issue.closedAt).toISOString() : '',
      issue.closedBy ?? '',
      examples,
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `issues-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
