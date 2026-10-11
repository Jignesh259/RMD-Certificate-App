export const COMPETITIONS = [
  "Poster Making",
  "Debate",
  "Quiz",
  "Rangoli",
  "Singing",
  "Coding Contest",
] as const;

export type CompetitionType = (typeof COMPETITIONS)[number];
