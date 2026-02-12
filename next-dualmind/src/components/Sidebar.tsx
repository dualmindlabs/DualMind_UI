'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/apiInstance';
import { Plus, MessageSquare, Trash2, LogOut } from 'lucide-react';

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onLogout: () => void;
  currentThreadId: string | null;
}

export default function Sidebar({ onThreadSelect, onNewThread, onLogout, currentThreadId }: SidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch threads on mount - EXACT API call as original
  useEffect(() => {
    const loadThreads = async () => {
      try {
        // EXACT API call as original: api.threads.getThreads()
        const threadList = await api.threads.getThreads(20);
        setThreads(threadList);
      } catch (error) {
        console.error('Failed to load threads:', error);
      }
    };
    loadThreads();
  }, []);

  // Handle delete thread - EXACT API call as original
  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this thread?')) return;

    try {
      // EXACT API call as original: api.threads.deleteThread()
      await api.threads.deleteThread(threadId);
      setThreads(prev => prev.filter(t => t.id !== threadId));
    } catch (error) {
      console.error('Delete thread error:', error);
    }
  };

  return (
    <div
      id="sidebar-container"
      role="navigation"
      aria-label="Sidebar"
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
    >
      {/* New Thread Button */}
      <button
        onClick={onNewThread}
        className="new-thread-btn"
        title="New Thread"
      >
        <Plus size={18} />
        {!isCollapsed && <span>New Thread</span>}
      </button>

      {/* Thread List */}
      <div className="thread-list">
        {threads.map(thread => (
          <div
            key={thread.id}
            onClick={() => onThreadSelect(thread.id)}
            className={`thread-item ${currentThreadId === thread.id ? 'active' : ''}`}
          >
            <MessageSquare size={16} />
            {!isCollapsed && (
              <>
                <span className="thread-title">{thread.title || 'Untitled'}</span>
                <button
                  onClick={(e) => handleDeleteThread(e, thread.id)}
                  className="delete-btn"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="sidebar-actions">
        <button
          onClick={onLogout}
          className="logout-btn"
          title="Logout"
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
