'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Code, Globe } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (prompt: string) => void;
  streaming: boolean;
  codeModeEnabled: boolean;
  webSearchEnabled: boolean;
  onToggleCodeMode: (active: boolean) => void;
  onToggleWebSearch: (active: boolean) => void;
}

export default function ChatInput({
  onSubmit,
  streaming,
  codeModeEnabled,
  webSearchEnabled,
  onToggleCodeMode,
  onToggleWebSearch,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || streaming) return;
    onSubmit(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div id="chat-input-container" role="region" aria-label="Chat input" className="chat-input-container">
      <div className="chat-input-wrapper">
        {/* Toggle Buttons */}
        <div className="input-toggles">
          <button
            className={`toggle-btn ${codeModeEnabled ? 'active' : ''}`}
            onClick={() => onToggleCodeMode(!codeModeEnabled)}
            title="Code Mode"
          >
            <Code size={16} />
            <span>Code</span>
          </button>
          <button
            className={`toggle-btn ${webSearchEnabled ? 'active' : ''}`}
            onClick={() => onToggleWebSearch(!webSearchEnabled)}
            title="Web Search"
          >
            <Globe size={16} />
            <span>Web</span>
          </button>
        </div>

        {/* Input Area */}
        <div className="input-area">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            disabled={streaming}
          />
          <button
            className="send-btn"
            onClick={handleSubmit}
            disabled={!input.trim() || streaming}
            title="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
