/**
 * DualMind AI Gateway API Service
 * Production-ready integration following API documentation rules
 * 
 * Rules:
 * - Use POST /api/arena/chat for non-streaming
 * - Use POST /api/arena/chat/stream for streaming
 * - Streaming uses fetch() + ReadableStream (NOT EventSource)
 * - Append text from ai.stream.delta.delta.text
 * - Stop on ai.stream.done
 * - Final assistant text always comes from output.content[].text
 */

class DualMindAPIService {
  constructor(baseUrl, getAuthToken) {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken;
  }

  async chatNonStreaming(prompt, options = {}) {
    const {
      model = 'auto',
      system = null,
      threadId = null,
      maxTokens = 4096,
      userId = null
    } = options;

    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = {
      prompt,
      model,
      max_tokens: maxTokens
    };

    if (system) body.system = system;
    if (threadId) body.thread_id = threadId;
    if (userId) body.userId = userId;

    const response = await fetch(`${this.baseUrl}/api/arena/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.object === 'ai.error') {
      throw new Error(data.message || 'AI Gateway error');
    }

    return this.extractResponse(data);
  }

  async chatStreaming(prompt, options = {}, onChunk, onComplete, onError) {
    const {
      model = 'auto',
      system = null,
      threadId = null,
      maxTokens = 4096,
      userId = null
    } = options;

    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = {
      prompt,
      model,
      max_tokens: maxTokens
    };

    if (system) body.system = system;
    if (threadId) body.thread_id = threadId;
    if (userId) body.userId = userId;

    try {
      console.log('API SERVICE: Making streaming request to:', `${this.baseUrl}/api/arena/chat/stream`);
      const response = await fetch(`${this.baseUrl}/api/arena/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      console.log('API SERVICE: Streaming response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      console.log('API SERVICE: Starting to read streaming response');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let finalData = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('API SERVICE: Streaming reader done');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        console.log('API SERVICE: Received buffer chunk, processing lines:', lines.length);

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.substring(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);
            console.log('API SERVICE: Parsed SSE event:', event);

            if (event.object === 'ai.error') {
              throw new Error(event.message || 'Streaming error');
            }

            if (event.object === 'ai.stream.delta') {
              const deltaText = event.delta?.text || '';
              console.log('API SERVICE: Delta text received:', deltaText);
              if (deltaText) {
                accumulatedText += deltaText;
                if (onChunk) {
                  onChunk(deltaText, accumulatedText);
                }
              }
            }

            if (event.object === 'ai.stream.done') {
              console.log('API SERVICE: Streaming done event received');
              finalData = event;
            }
          } catch (parseError) {
            console.warn('API SERVICE: Failed to parse SSE event:', parseError);
          }
        }
      }

      console.log('API SERVICE: Streaming loop completed, accumulated text length:', accumulatedText.length);

      if (onComplete) {
        onComplete({
          text: accumulatedText,
          finishReason: finalData?.finish_reason || 'stop',
          usage: finalData?.usage || null
        });
      }

      return accumulatedText;
    } catch (error) {
      console.error('API SERVICE: Streaming error:', error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  async dualChat(prompt, options = {}) {
    const {
      model1 = null,
      model2 = null,
      system = null,
      threadId = null,
      maxTokens = 4096,
      userId = null,
      battleMode = 'random'
    } = options;

    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = {
      prompt,
      max_tokens: maxTokens,
      battle_mode: battleMode
    };

    if (model1) body.model1 = model1;
    if (model2) body.model2 = model2;
    if (system) body.system = system;
    if (threadId) body.thread_id = threadId;
    if (userId) body.userId = userId;

    const response = await fetch(`${this.baseUrl}/api/arena/dualchat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.object === 'ai.error') {
      throw new Error(data.message || 'AI Gateway error');
    }

    return {
      agent1: this.extractResponse(data.agent1),
      agent2: this.extractResponse(data.agent2),
      arena: data.arena || null,
      comparisonId: data.comparisonId || null
    };
  }

  extractResponse(responseData) {
    if (!responseData) {
      return {
        text: '',
        message: '',
        model: null,
        usage: null,
        responseTimeMs: null
      };
    }

    let text = '';
    
    if (responseData.output?.content && Array.isArray(responseData.output.content)) {
      const textContent = responseData.output.content.find(c => c.type === 'output_text');
      text = textContent?.text || '';
    }

    if (!text && responseData.message) {
      text = responseData.message;
    }

    return {
      text,
      message: text,
      model: responseData.model || null,
      usage: responseData.usage || null,
      responseTimeMs: responseData.responseTimeMs || null,
      timestamp: responseData.timestamp || null
    };
  }

  async getModels() {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/models`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.items || data || [];
  }

  async submitVote(comparisonId, winnerModelName, userId = null) {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = {
      comparisonId,
      winnerModelName
    };

    if (userId) body.userId = userId;

    const response = await fetch(`${this.baseUrl}/api/arena/model-vote`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Vote failed: ${response.status}`);
    }

    return await response.json();
  }

  async getLeaderboard() {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${this.baseUrl}/api/arena/model-stats`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const data = await response.json();
      return data.items || data || [];
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getThreads(limit = 20, userId = null) {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = new URLSearchParams({ limit: limit.toString() });
    if (userId) params.append('userId', userId);

    const response = await fetch(`${this.baseUrl}/api/threads?${params}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch threads: ${response.status}`);
    }

    const data = await response.json();
    return data.items || data || [];
  }

  async getThreadMessages(threadId) {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/threads/${threadId}/messages`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch thread messages: ${response.status}`);
    }

    const data = await response.json();
    return data.items || data || [];
  }

  async createThread(title, userId = null) {
    const token = await this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body = { title };
    if (userId) body.userId = userId;

    const response = await fetch(`${this.baseUrl}/api/threads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create thread: ${response.status}`);
    }

    return await response.json();
  }

  async healthCheck() {
    try {
      // Use config for timeout
      const timeout = window.DUALMIND_CONFIG?.api?.timeout || 3000;
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeout)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.DualMindAPIService = DualMindAPIService;
}
