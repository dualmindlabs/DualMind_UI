'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatInput from './ChatInput';
import ChatView from './ChatView';
import FloatingVoting from './FloatingVoting';
import { api } from '@/lib/api/apiInstance';

interface Turn {
  prompt: string;
  left: { model: string; text: string };
  right: { model: string; text: string };
  comparisonId: string;
}

interface ChatSettings {
  codeMode: boolean;
  webSearch: boolean;
}

export default function DualMindApp() {
  const [currentMode, setCurrentMode] = useState<'battle' | 'chat'>('battle');
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    codeMode: false,
    webSearch: false,
  });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [models, setModels] = useState<any[]>([]);

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelList = await api.models.getModels();
        setModels(modelList);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    fetchModels();
  }, []);

  // Handle chat submission - EXACT API calls as original
  const handleChatSubmit = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    setStreaming(true);

    try {
      // EXACT API call as original: api.arena.dualChat()
      const result = await api.arena.dualChat(prompt, {
        threadId: currentThreadId || undefined,
        system: chatSettings.codeMode ? 'You are a coding assistant.' : undefined,
      });

      const newTurn: Turn = {
        prompt,
        left: {
          model: result.model1,
          text: result.response1,
        },
        right: {
          model: result.model2,
          text: result.response2,
        },
        comparisonId: result.comparisonId,
      };

      setTurns(prev => [...prev, newTurn]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setStreaming(false);
    }
  }, [currentThreadId, chatSettings.codeMode]);

  // Handle vote submission - EXACT API calls as original
  const handleVote = useCallback(async (comparisonId: string, voteChoice: string) => {
    try {
      // EXACT API call as original: api.arena.submitVote()
      await api.arena.submitVote(comparisonId, voteChoice);
      console.log('Vote submitted:', { comparisonId, voteChoice });
    } catch (error) {
      console.error('Vote error:', error);
    }
  }, []);

  // Handle thread selection
  const handleThreadSelect = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
    setTurns([]); // Reset turns when switching threads
  }, []);

  // Handle new thread
  const handleNewThread = useCallback(async () => {
    try {
      // EXACT API call as original: api.threads.createThread()
      const thread = await api.threads.createThread('New Chat');
      setCurrentThreadId(thread.id);
      setTurns([]);
    } catch (error) {
      console.error('Create thread error:', error);
    }
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    // Clear auth tokens
    localStorage.removeItem('dualmind.auth.token');
    localStorage.removeItem('dualmind.auth.userId');
    localStorage.removeItem('dualmind.auth.user');
    
    // Redirect to login
    window.location.href = '/login';
  }, []);

  // Toggle handlers
  const handleToggleCodeMode = useCallback((active: boolean) => {
    setChatSettings(prev => {
      // If Code Mode on, turn off Web Search
      if (active && prev.webSearch) {
        return { ...prev, codeMode: true, webSearch: false };
      }
      return { ...prev, codeMode: active };
    });
  }, []);

  const handleToggleWebSearch = useCallback((active: boolean) => {
    setChatSettings(prev => {
      // If Web Search on, turn off Code Mode
      if (active && prev.codeMode) {
        return { ...prev, webSearch: true, codeMode: false };
      }
      return { ...prev, webSearch: active };
    });
  }, []);

  return (
    <div id="app" className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onThreadSelect={handleThreadSelect}
        onNewThread={handleNewThread}
        onLogout={handleLogout}
        currentThreadId={currentThreadId}
      />

      {/* Header + Main Content Area */}
      <div className="main-wrapper flex flex-col flex-1 h-full overflow-hidden">
        {/* Header */}
        <Header
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          user={user}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <main id="main-content" className="main-content scrollable flex-1 overflow-y-auto" role="main" tabIndex={-1}>
          <ChatView
            turns={turns}
            streaming={streaming}
          />
        </main>

        {/* Chat Input at Bottom */}
        <ChatInput
          onSubmit={handleChatSubmit}
          streaming={streaming}
          codeModeEnabled={chatSettings.codeMode}
          webSearchEnabled={chatSettings.webSearch}
          onToggleCodeMode={handleToggleCodeMode}
          onToggleWebSearch={handleToggleWebSearch}
        />
      </div>

      {/* Floating Voting UI */}
      {turns.length > 0 && !streaming && (
        <FloatingVoting
          turns={turns}
          onVote={handleVote}
        />
      )}
    </div>
  );
}
