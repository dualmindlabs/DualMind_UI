'use client';

import { useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.min.css';

interface Turn {
  prompt: string;
  left: { model: string; text: string };
  right: { model: string; text: string };
  comparisonId: string;
}

interface ChatViewProps {
  turns: Turn[];
  streaming: boolean;
}

export default function ChatView({ turns, streaming }: ChatViewProps) {
  // Parse markdown safely
  const parseMarkdown = (text: string): string => {
    if (!text) return '';
    const rawHtml = marked.parse(text, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  };

  // Highlight code blocks after render
  useEffect(() => {
    hljs.highlightAll();
  }, [turns]);

  return (
    <div className="chat-view">
      {turns.length === 0 ? (
        <div className="empty-state">
          <h2>Welcome to DualMind</h2>
          <p>Compare AI models side-by-side. Ask a question to see different models respond.</p>
        </div>
      ) : (
        turns.map((turn, index) => (
          <div key={index} className="turn-container">
            {/* User Prompt */}
            <div className="user-message">
              <div className="message-content">{turn.prompt}</div>
            </div>

            {/* AI Responses */}
            <div className="ai-responses">
              {/* Left Model */}
              <div className="response-column left">
                <div className="model-header">
                  <span className="model-name">{turn.left.model || 'Model A'}</span>
                </div>
                <div
                  className="response-content"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(turn.left.text) }}
                />
              </div>

              {/* Right Model */}
              <div className="response-column right">
                <div className="model-header">
                  <span className="model-name">{turn.right.model || 'Model B'}</span>
                </div>
                <div
                  className="response-content"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(turn.right.text) }}
                />
              </div>
            </div>
          </div>
        ))
      )}

      {streaming && (
        <div className="streaming-indicator">
          <div className="dot-flashing"></div>
        </div>
      )}
    </div>
  );
}
