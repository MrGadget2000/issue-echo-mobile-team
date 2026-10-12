export type TeamSnapshot = { id: string; name: string }[];

export function parseTeamSnapshot(value: unknown): TeamSnapshot {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TeamSnapshot[number] =>
    item !== null && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string');
}

export function snapshotGroups(value: unknown): TeamSnapshot {
  const snapshot = parseTeamSnapshot(value);
  return snapshot.length ? snapshot : [{ id: 'unassigned', name: 'Unassigned / not recorded' }];
}