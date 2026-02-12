'use client';

import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

interface Turn {
  prompt: string;
  left: { model: string; text: string };
  right: { model: string; text: string };
  comparisonId: string;
}

interface FloatingVotingProps {
  turns: Turn[];
  onVote: (comparisonId: string, voteChoice: string) => void;
}

export default function FloatingVoting({ turns, onVote }: FloatingVotingProps) {
  const lastTurn = turns[turns.length - 1];
  if (!lastTurn) return null;

  return (
    <div id="floating-voting" className="floating-voting">
      <div className="voting-container">
        <span className="voting-label">Which response is better?</span>
        
        <div className="voting-buttons">
          <button
            className="vote-btn left"
            onClick={() => onVote(lastTurn.comparisonId, 'left')}
            title="Left is better"
          >
            <ThumbsUp size={16} />
            <span>{lastTurn.left.model || 'Left'}</span>
          </button>

          <button
            className="vote-btn tie"
            onClick={() => onVote(lastTurn.comparisonId, 'tie')}
            title="Tie"
          >
            <Minus size={16} />
            <span>Tie</span>
          </button>

          <button
            className="vote-btn right"
            onClick={() => onVote(lastTurn.comparisonId, 'right')}
            title="Right is better"
          >
            <ThumbsUp size={16} />
            <span>{lastTurn.right.model || 'Right'}</span>
          </button>

          <button
            className="vote-btn both-bad"
            onClick={() => onVote(lastTurn.comparisonId, 'both-bad')}
            title="Both are bad"
          >
            <ThumbsDown size={16} />
            <span>Both Bad</span>
          </button>
        </div>
      </div>
    </div>
  );
}
