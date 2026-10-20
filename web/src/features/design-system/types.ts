/** A section of the style guide, listed in the hero's "On this page" navigation. */
export interface DesignSection {
  id: string;
  index: string;
  title: string;
  summary: string;
}

/** The three semantic colour roles of a battle. */
export type Role = 'a' | 'b' | 'human';

/** The four verdicts of the vote bar, in their on-screen order. */
export type VoteChoice = 'a' | 'tie' | 'bad' | 'b';
