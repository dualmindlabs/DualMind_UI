# DualMind AI Gateway - Frontend Integration Guide

## Overview

This guide demonstrates how to integrate with the DualMind AI Gateway API in your frontend application. The integration follows the official API documentation rules and provides both streaming and non-streaming chat capabilities.

## Architecture

The integration consists of two main components:

1. **`api-service.js`** - Production-ready API service class
2. **`script.js`** - Application logic that uses the API service

## Quick Start

### 1. Include the API Service

Add the API service script to your HTML:

```html
<!-- DualMind API Service -->
<script src="api-service.js"></script>
```

### 2. Initialize the Service

```javascript
// Initialize the API service
const baseUrl = 'https://dualmind-arena-cgh0cvdfhkbgatba.uaenorth-01.azurewebsites.net';
const dualMindAPI = new DualMindAPIService(baseUrl, getAuthToken);

// Auth token provider function
async function getAuthToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}
```

## API Methods

### Non-Streaming Chat

Send a single chat request and receive the complete response:

```javascript
const result = await dualMindAPI.chatNonStreaming('Hello, how are you?', {
  model: 'auto',
  system: 'You are a helpful assistant',
  threadId: 'optional-thread-id',
  userId: 'optional-user-id',
  maxTokens: 4096
});

console.log(result.text);        // AI response text
console.log(result.model);       // Model information
console.log(result.usage);       // Token usage stats
console.log(result.responseTimeMs); // Response time
```

### Streaming Chat

Stream responses in real-time:

```javascript
let fullText = '';

await dualMindAPI.chatStreaming(
  'Write a story about AI',
  {
    model: 'auto',
    threadId: 'optional-thread-id',
    userId: 'optional-user-id'
  },
  // onChunk callback - called for each text delta
  (deltaText, accumulatedText) => {
    fullText = accumulatedText;
    updateUI(accumulatedText);
  },
  // onComplete callback - called when streaming finishes
  (result) => {
    console.log('Streaming complete!');
    console.log('Final text:', result.text);
    console.log('Finish reason:', result.finishReason);
    console.log('Token usage:', result.usage);
  },
  // onError callback - called on errors
  (error) => {
    console.error('Streaming error:', error);
  }
);
```

### Dual Chat (Battle Mode)

Compare two AI models side-by-side:

```javascript
const result = await dualMindAPI.dualChat('Explain quantum computing', {
  model1: 'gpt-4',           // Optional: specify model 1
  model2: 'claude-3-opus',   // Optional: specify model 2
  battleMode: 'random',      // 'random' or 'topper'
  threadId: 'optional-thread-id',
  userId: 'optional-user-id'
});

console.log('Agent 1:', result.agent1.text);
console.log('Agent 2:', result.agent2.text);
console.log('Comparison ID:', result.comparisonId);
```

### Get Available Models

Fetch the list of available AI models:

```javascript
const models = await dualMindAPI.getModels();

models.forEach(model => {
  console.log(model.name);
  console.log(model.displayName);
  console.log(model.provider);
});
```

### Submit Vote

Vote on which model performed better:

```javascript
await dualMindAPI.submitVote(
  comparisonId,
  winnerModelName,
  userId  // optional
);
```

### Get Leaderboard

Fetch model performance statistics:

```javascript
const leaderboard = await dualMindAPI.getLeaderboard();

leaderboard.forEach(entry => {
  console.log(entry.modelName);
  console.log(entry.winRate);
  console.log(entry.totalWins);
  console.log(entry.totalResponses);
});
```

### Thread Management

Create and manage conversation threads:

```javascript
// Create a new thread
const thread = await dualMindAPI.createThread('My Conversation', userId);
console.log('Thread ID:', thread.threadId);

// Get user's threads
const threads = await dualMindAPI.getThreads(20, userId);

// Get messages in a thread
const messages = await dualMindAPI.getThreadMessages(threadId);
```

### Health Check

Check if the API is available:

```javascript
const isHealthy = await dualMindAPI.healthCheck();
if (isHealthy) {
  console.log('API is online');
} else {
  console.log('API is offline');
}
```

## Response Structure

All responses follow the canonical structure defined in the API documentation:

### Standard Response

```javascript
{
  text: "AI-generated response",
  message: "AI-generated response",  // Same as text
  model: {
    name: "llama-3.1-70b-versatile",
    displayName: "Llama 3 70B",
    provider: "groq"
  },
  usage: {
    promptTokens: 10,
    completionTokens: 8,
    totalTokens: 18
  },
  responseTimeMs: 450,
  timestamp: "2024-12-30T10:00:00Z"
}
```

### Dual Chat Response

```javascript
{
  agent1: {
    text: "Response from model 1",
    model: { ... },
    responseTimeMs: 450
  },
  agent2: {
    text: "Response from model 2",
    model: { ... },
    responseTimeMs: 520
  },
  comparisonId: "uuid-here",
  arena: {
    comparison: { ... }
  }
}
```

## Error Handling

All methods throw errors that can be caught with try-catch:

```javascript
try {
  const result = await dualMindAPI.chatNonStreaming('Hello');
  console.log(result.text);
} catch (error) {
  console.error('API Error:', error.message);
  
  // Handle specific error types
  if (error.message.includes('401')) {
    console.log('Authentication required');
  } else if (error.message.includes('503')) {
    console.log('Service unavailable');
  }
}
```

## Streaming Implementation Details

The streaming implementation follows the API documentation rules:

1. Uses `fetch()` + `ReadableStream` (NOT EventSource)
2. Parses SSE format: `data: <JSON>`
3. Accumulates text from `ai.stream.delta` events
4. Stops on `ai.stream.done` event
5. Handles `ai.error` events

Example streaming parser:

```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    
    const jsonStr = line.substring(6);
    const event = JSON.parse(jsonStr);

    if (event.object === 'ai.stream.delta') {
      const deltaText = event.delta?.text || '';
      // Process delta text
    }

    if (event.object === 'ai.stream.done') {
      // Streaming complete
      break;
    }
  }
}
```

## Best Practices

### 1. Authentication

Always provide a valid auth token:

```javascript
async function getAuthToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data?.session?.access_token || null;
}
```

### 2. Error Handling

Implement comprehensive error handling:

```javascript
try {
  const result = await dualMindAPI.chatNonStreaming(prompt);
  displayResponse(result.text);
} catch (error) {
  if (error.message.includes('401')) {
    redirectToLogin();
  } else if (error.message.includes('503')) {
    showOfflineMessage();
  } else {
    showErrorMessage(error.message);
  }
}
```

### 3. Loading States

Show loading indicators during API calls:

```javascript
showLoadingSpinner();
try {
  const result = await dualMindAPI.chatNonStreaming(prompt);
  displayResponse(result.text);
} finally {
  hideLoadingSpinner();
}
```

### 4. Streaming UI Updates

Update UI incrementally during streaming:

```javascript
const messageElement = document.getElementById('message');

await dualMindAPI.chatStreaming(
  prompt,
  {},
  (deltaText, fullText) => {
    messageElement.textContent = fullText;
    messageElement.scrollIntoView({ behavior: 'smooth' });
  },
  (result) => {
    console.log('Complete!');
  }
);
```

### 5. Thread Management

Create threads for conversation history:

```javascript
let currentThreadId = null;

async function sendMessage(prompt) {
  if (!currentThreadId) {
    const thread = await dualMindAPI.createThread('New Chat', userId);
    currentThreadId = thread.threadId;
  }

  const result = await dualMindAPI.chatNonStreaming(prompt, {
    threadId: currentThreadId
  });

  return result;
}
```

## Example: Complete Chat Interface

```javascript
class ChatInterface {
  constructor(apiBaseUrl) {
    this.api = new DualMindAPIService(apiBaseUrl, this.getAuthToken);
    this.threadId = null;
  }

  async getAuthToken() {
    const { data } = await supabaseClient.auth.getSession();
    return data?.session?.access_token || null;
  }

  async sendMessage(prompt, streaming = false) {
    const userId = await this.getCurrentUserId();

    if (!this.threadId) {
      const thread = await this.api.createThread('New Chat', userId);
      this.threadId = thread.threadId;
    }

    if (streaming) {
      return this.sendStreamingMessage(prompt, userId);
    } else {
      return this.sendNonStreamingMessage(prompt, userId);
    }
  }

  async sendNonStreamingMessage(prompt, userId) {
    const result = await this.api.chatNonStreaming(prompt, {
      threadId: this.threadId,
      userId: userId
    });

    this.displayMessage('assistant', result.text);
    return result;
  }

  async sendStreamingMessage(prompt, userId) {
    const messageElement = this.createMessageElement('assistant');

    await this.api.chatStreaming(
      prompt,
      {
        threadId: this.threadId,
        userId: userId
      },
      (deltaText, fullText) => {
        messageElement.textContent = fullText;
      },
      (result) => {
        console.log('Streaming complete');
      },
      (error) => {
        messageElement.textContent = 'Error: ' + error.message;
        messageElement.classList.add('error');
      }
    );
  }

  displayMessage(role, text) {
    const messageElement = this.createMessageElement(role);
    messageElement.textContent = text;
  }

  createMessageElement(role) {
    const element = document.createElement('div');
    element.className = `message ${role}`;
    document.getElementById('chat-container').appendChild(element);
    return element;
  }

  async getCurrentUserId() {
    const { data } = await supabaseClient.auth.getSession();
    return data?.session?.user?.id || null;
  }
}

// Usage
const chat = new ChatInterface('https://api.dualmind.ai');
await chat.sendMessage('Hello!', true);  // Streaming
await chat.sendMessage('How are you?', false);  // Non-streaming
```

## Testing

Test the integration with different scenarios:

```javascript
// Test non-streaming
console.log('Testing non-streaming...');
const result1 = await dualMindAPI.chatNonStreaming('Hello');
console.log('✓ Non-streaming works:', result1.text);

// Test streaming
console.log('Testing streaming...');
await dualMindAPI.chatStreaming(
  'Count to 5',
  {},
  (delta, full) => console.log('Delta:', delta),
  () => console.log('✓ Streaming works')
);

// Test dual chat
console.log('Testing dual chat...');
const result2 = await dualMindAPI.dualChat('What is AI?');
console.log('✓ Dual chat works');
console.log('Agent 1:', result2.agent1.text.substring(0, 50));
console.log('Agent 2:', result2.agent2.text.substring(0, 50));

// Test models
console.log('Testing models...');
const models = await dualMindAPI.getModels();
console.log('✓ Models loaded:', models.length);

// Test health check
console.log('Testing health check...');
const isHealthy = await dualMindAPI.healthCheck();
console.log('✓ Health check:', isHealthy ? 'Online' : 'Offline');
```

## Troubleshooting

### API Not Initialized

**Error:** "API service not initialized"

**Solution:** Ensure the API service is initialized before making calls:

```javascript
if (!dualMindAPI) {
  console.error('API service not loaded');
  return;
}
```

### Authentication Errors

**Error:** "401 Unauthorized"

**Solution:** Verify the auth token is valid:

```javascript
const token = await getAuthToken();
if (!token) {
  console.log('User not logged in');
  redirectToLogin();
}
```

### Network Errors

**Error:** "Failed to fetch"

**Solution:** Check API base URL and network connectivity:

```javascript
const isHealthy = await dualMindAPI.healthCheck();
if (!isHealthy) {
  console.log('API is offline');
  showOfflineMessage();
}
```

### Streaming Not Working

**Issue:** Streaming events not received

**Solution:** Verify the Accept header is set correctly (handled automatically by the service):

```javascript
headers: {
  'Accept': 'text/event-stream'
}
```

## Migration from Old API

If migrating from the old `apiCall` function:

### Before:
```javascript
const json = await apiCall('/api/arena/chat', 'POST', {
  prompt: 'Hello',
  model: 'auto'
});
```

### After:
```javascript
const result = await dualMindAPI.chatNonStreaming('Hello', {
  model: 'auto'
});
```

## Support

For issues or questions:
- Check the API documentation: `API_DOCUMENTATION.md`
- Review this integration guide
- Check browser console for errors
- Verify API base URL is correct
- Ensure authentication token is valid

## License

This integration follows the DualMind API terms of service.
