import { describe, expect, test } from 'bun:test';
import { weeklyActivity } from '../src/lib/recentActivity';
import type { Issue } from '../src/types/issue';

const issue = (createdAt: string, closedAt?: string): Issue => ({
  id: createdAt, title: 'Example', description: '', votes: 0, customerData: [],
  votedBy: [], createdAt: new Date(createdAt), updatedAt: new Date(createdAt),
  closed: Boolean(closedAt), closedAt: closedAt ? new Date(closedAt) : undefined,
});

describe('weekly activity', () => {
  test('counts new issues from Monday in Auckland, including closed issues', () => {
    const result = weeklyActivity([
      issue('2026-10-11T10:59:59Z'),
      issue('2026-10-11T11:00:00Z'),
      issue('2026-10-11T12:00:00Z', '2026-10-11T13:00:00Z'),
      issue('2026-10-12T23:00:00Z'),
    ], new Date('2026-10-11T22:16:00Z'));
    expect(result.raised).toBe(2);
    expect(result.closed).toBe(1);
  });
});