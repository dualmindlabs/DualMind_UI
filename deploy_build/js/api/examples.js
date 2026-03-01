/**
 * DualMind API - Usage Examples
 * 
 * This file demonstrates how to use the new modular API client.
 * Run with: node --experimental-vm-modules js/api/examples.js
 * 
 * @module api/examples
 */

import { DualMindApi, toUserMessage } from './index.js';

// ============================================================
// SETUP
// ============================================================

// Create API instance with custom config
const api = new DualMindApi({
    baseUrl: 'http://localhost:5079',
    timeout: 30000,
    retryAttempts: 2,
    debug: true, // Enable debug logging
});

// ============================================================
// EXAMPLE 1: Non-Streaming Chat
// ============================================================
async function exampleNonStreamingChat() {
    console.log('\n📝 Example 1: Non-Streaming Chat\n');

    try {
        const response = await api.arena.chat('What is the capital of France?', {
            model: 'auto',
            maxTokens: 1024,
        });

        console.log('Response:', response.text);
        console.log('Model:', response.model?.name);
        console.log('Time:', response.responseTimeMs, 'ms');
    } catch (error) {
        console.error('Error:', toUserMessage(error));
    }
}

// ============================================================
// EXAMPLE 2: Streaming Chat with AsyncIterator
// ============================================================
async function exampleStreamingChat() {
    console.log('\n🌊 Example 2: Streaming Chat\n');

    try {
        let fullText = '';

        process.stdout.write('AI: ');

        for await (const chunk of api.arena.chatStream('Tell me a short joke')) {
            process.stdout.write(chunk);
            fullText += chunk;
        }

        console.log('\n');
        console.log('Total length:', fullText.length, 'characters');
    } catch (error) {
        console.error('\nError:', toUserMessage(error));
    }
}

// ============================================================
// EXAMPLE 3: Abort Streaming
// ============================================================
async function exampleAbortStreaming() {
    console.log('\n🛑 Example 3: Abort Streaming after 2 seconds\n');

    const controller = new AbortController();

    // Abort after 2 seconds
    setTimeout(() => {
        console.log('\n⚠️ Aborting...');
        controller.abort();
    }, 2000);

    try {
        let chars = 0;

        for await (const chunk of api.arena.chatStream('Write a very long story about space exploration', {
            signal: controller.signal,
        })) {
            process.stdout.write(chunk);
            chars += chunk.length;
        }

        console.log('\n\nCompleted:', chars, 'characters');
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.log('Stream was aborted as expected!');
        } else {
            console.error('Error:', toUserMessage(error));
        }
    }
}

// ============================================================
// EXAMPLE 4: Battle Mode (Dual Chat)
// ============================================================
async function exampleDualChat() {
    console.log('\n⚔️ Example 4: Battle Mode\n');

    try {
        const battle = await api.arena.dualChat('Explain quantum computing simply', {
            selectionMode: 'random',
        });

        console.log('--- Agent 1 ---');
        console.log('Model:', battle.agent1.model?.displayName || battle.agent1.model?.name);
        console.log('Response:', battle.agent1.text.substring(0, 200) + '...');
        console.log();

        console.log('--- Agent 2 ---');
        console.log('Model:', battle.agent2.model?.displayName || battle.agent2.model?.name);
        console.log('Response:', battle.agent2.text.substring(0, 200) + '...');
        console.log();

        console.log('Comparison ID:', battle.comparisonId);

        // Submit vote for agent1
        if (battle.comparisonId && battle.agent1.model?.name) {
            await api.arena.submitVote(battle.comparisonId, battle.agent1.model.name);
            console.log('✅ Vote submitted for Agent 1!');
        }
    } catch (error) {
        console.error('Error:', toUserMessage(error));
    }
}

// ============================================================
// EXAMPLE 5: Get Leaderboard
// ============================================================
async function exampleLeaderboard() {
    console.log('\n🏆 Example 5: Leaderboard\n');

    try {
        const models = await api.arena.getLeaderboard();

        console.log('Top Models:');
        models.slice(0, 5).forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.modelName || m.name} - ${m.wins || 0} wins`);
        });
    } catch (error) {
        console.error('Error:', toUserMessage(error));
    }
}

// ============================================================
// EXAMPLE 6: Thread Management
// ============================================================
async function exampleThreads() {
    console.log('\n💬 Example 6: Thread Management\n');

    try {
        // Create a new thread
        const thread = await api.threads.createThread('API Test Thread');
        console.log('Created thread:', thread.id);

        // Get all threads
        const threads = await api.threads.getThreads(5);
        console.log('Recent threads:', threads.length);

        // Update thread title
        await api.threads.updateThread(thread.id, 'Updated Title');
        console.log('Thread updated');

        // Delete thread
        await api.threads.deleteThread(thread.id);
        console.log('Thread deleted');
    } catch (error) {
        console.error('Error:', toUserMessage(error));
    }
}

// ============================================================
// EXAMPLE 7: Health Check
// ============================================================
async function exampleHealthCheck() {
    console.log('\n❤️ Example 7: Health Check\n');

    const isHealthy = await api.healthCheck();
    console.log('Backend status:', isHealthy ? '✅ Healthy' : '❌ Unavailable');
}

// ============================================================
// RUN ALL EXAMPLES
// ============================================================
async function runAll() {
    console.log('='.repeat(60));
    console.log('DualMind API Examples');
    console.log('='.repeat(60));

    await exampleHealthCheck();

    // Only run other examples if backend is available
    const isHealthy = await api.healthCheck();
    if (!isHealthy) {
        console.log('\n⚠️ Backend not available. Skipping remaining examples.');
        return;
    }

    await exampleNonStreamingChat();
    await exampleStreamingChat();
    await exampleDualChat();
    await exampleLeaderboard();
    // await exampleAbortStreaming();  // Uncomment to test abort
    // await exampleThreads();         // Uncomment to test threads

    console.log('\n' + '='.repeat(60));
    console.log('All examples completed!');
    console.log('='.repeat(60));
}

// Run if executed directly
runAll().catch(console.error);
