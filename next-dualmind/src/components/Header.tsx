'use client';

import { Trophy, User } from 'lucide-react';

interface HeaderProps {
  currentMode: 'battle' | 'chat';
  onModeChange: (mode: 'battle' | 'chat') => void;
  user: any;
  onLogout: () => void;
}

export default function Header({ currentMode, onModeChange, user, onLogout }: HeaderProps) {
  return (
    <header id="header-container" role="banner" className="header">
      {/* Logo */}
      <div className="logo">
        <span className="logo-text">DualMind</span>
        <span className="logo-badge">Beta</span>
      </div>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          className={currentMode === 'battle' ? 'active' : ''}
          onClick={() => onModeChange('battle')}
        >
          Battle
        </button>
        <button
          className={currentMode === 'chat' ? 'active' : ''}
          onClick={() => onModeChange('chat')}
        >
          Chat
        </button>
      </div>

      {/* Actions */}
      <div className="header-actions">
        <button className="leaderboard-btn" title="Leaderboard">
          <Trophy size={20} />
        </button>
        
        <div className="user-menu">
          <button className="user-btn" title="User">
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
