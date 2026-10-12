import { expect, test } from 'bun:test';
import { parseTeamSnapshot, snapshotGroups } from '../src/lib/teams';

test('one submission rolls up from Mobile Fulfilment into Fulfilment', () => {
  expect(snapshotGroups([{ id: 'mobile', name: 'Mobile Fulfilment' }, { id: 'fulfilment', name: 'Fulfilment' }]).map((team) => team.name)).toEqual(['Mobile Fulfilment', 'Fulfilment']);
});
test('historical team attribution is independent of current membership', () => {
  const saved = [{ id: 'mobile', name: 'Mobile Fulfilment' }];
  const membership = { team: 'Mobile Fulfilment' };
  membership.team = 'Sales';
  expect(parseTeamSnapshot(saved)[0]?.name).toBe('Mobile Fulfilment');
});
test('old submissions do not acquire an invented team', () => {
  expect(snapshotGroups(null)).toEqual([{ id: 'unassigned', name: 'Unassigned / not recorded' }]);
});