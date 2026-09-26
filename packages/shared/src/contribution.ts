export type ContributionCounts = {
  reportsFiled: number;
  helpfulVotesReceived: number;
  venuesAdded: number;
  helpfulVotesGiven: number;
};

export function contributionScore(counts: ContributionCounts): number {
  return counts.reportsFiled * 10 + counts.helpfulVotesReceived * 3 + counts.venuesAdded * 8 + counts.helpfulVotesGiven;
}
