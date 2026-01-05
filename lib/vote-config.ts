/**
 * Fee Switch Vote Configuration
 * Fee switch votes occur every 6 months and last 7 days
 */

export interface VotePeriod {
  voteNumber: number;
  label: string;
  voteStartDate: string; // YYYY-MM-DD when vote started
  voteEndDate: string; // YYYY-MM-DD when vote ended (27th)
  dataStartDate: string; // YYYY-MM-DD when to start showing data (same as voteEndDate)
  status: 'failed' | 'passed';
}

export const VOTE_PERIODS: VotePeriod[] = [
  {
    voteNumber: 1,
    label: 'Vote 1 - December 2024',
    voteStartDate: '2024-12-20',
    voteEndDate: '2024-12-27',
    dataStartDate: '2024-12-27',
    status: 'failed',
  },
  {
    voteNumber: 2,
    label: 'Vote 2 - June 2025',
    voteStartDate: '2025-06-20',
    voteEndDate: '2025-06-27',
    dataStartDate: '2025-06-27',
    status: 'failed',
  },
  {
    voteNumber: 3,
    label: 'Vote 3 - December 2025',
    voteStartDate: '2025-12-20',
    voteEndDate: '2025-12-27',
    dataStartDate: '2025-12-27',
    status: 'failed',
  },
];

/**
 * Get vote period by vote number
 */
export function getVotePeriod(voteNumber: number): VotePeriod | undefined {
  return VOTE_PERIODS.find(v => v.voteNumber === voteNumber);
}

/**
 * Get the most recent vote period
 */
export function getLatestVotePeriod(): VotePeriod {
  return VOTE_PERIODS[VOTE_PERIODS.length - 1];
}

/**
 * Calculate days since vote ended
 */
export function getDaysSinceVote(votePeriod: VotePeriod): number {
  const endDate = new Date(votePeriod.voteEndDate);
  const today = new Date();
  const diffTime = today.getTime() - endDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
