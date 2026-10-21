import { describe, expect, it } from 'vitest';

import {
  CURATED_NAMES,
  isHumanName,
  modelMaker,
  modelSlug,
  platformLabel,
  prettifyModelId,
  resolveDisplayName,
  servedBy,
} from '@/lib/models/display-name';

import board from '../../../fixtures/api/model-stats.board.recorded.json';

/**
 * Every model on the recorded 2026-10-21 board: raw id, what the API called it, its provider key,
 * and the name, maker and serving note the site shows for it. A model that joins the board has to
 * be added here, which is the prompt to look at the name it gets.
 */
const RECORDED: ReadonlyArray<
  readonly [id: string, apiName: string, provider: string, name: string, maker: string, via: string | null]
> = [
  ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'llama-3.3-70b-instruct-fp8-fast', 'cloudflare', 'Llama 3.3 70B Instruct (FP8, fast)', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-3.1-70b-instruct', 'llama-3.1-70b-instruct', 'cloudflare', 'Llama 3.1 70B Instruct', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', 'deepseek-r1-distill-qwen-32b', 'cloudflare', 'DeepSeek R1 Distill Qwen 32B', 'DeepSeek', 'via Cloudflare Workers AI'],
  ['@cf/qwen/qwq-32b', 'qwq-32b', 'cloudflare', 'Qwen QwQ 32B', 'Alibaba Qwen', 'via Cloudflare Workers AI'],
  ['@cf/qwen/qwen2.5-coder-32b-instruct', 'qwen2.5-coder-32b-instruct', 'cloudflare', 'Qwen2.5 Coder 32B Instruct', 'Alibaba Qwen', 'via Cloudflare Workers AI'],
  ['@cf/qwen/qwen3-30b-a3b-fp8', 'qwen3-30b-a3b-fp8', 'cloudflare', 'Qwen3 30B A3B (FP8)', 'Alibaba Qwen', 'via Cloudflare Workers AI'],
  ['@cf/nvidia/nemotron-3-120b-a12b', 'nemotron-3-120b-a12b', 'cloudflare', 'Nemotron 3 120B A12B', 'NVIDIA', 'via Cloudflare Workers AI'],
  ['@cf/mistralai/mistral-small-3.1-24b-instruct', 'mistral-small-3.1-24b-instruct', 'cloudflare', 'Mistral Small 3.1 24B Instruct', 'Mistral', 'via Cloudflare Workers AI'],
  ['groq/compound-mini', 'Compound Mini', 'groq', 'Compound Mini', 'Groq', null],
  ['@cf/meta/llama-3.1-8b-instruct-fast', 'llama-3.1-8b-instruct-fast', 'cloudflare', 'Llama 3.1 8B Instruct (fast)', 'Meta', 'via Cloudflare Workers AI'],
  ['llama-3.1-8b-instant', 'Llama 3.1 8B Instant', 'groq', 'Llama 3.1 8B Instant', 'Meta', 'via Groq'],
  ['@hf/meta-llama/meta-llama-3-8b-instruct', 'meta-llama-3-8b-instruct', 'cloudflare', 'Meta Llama 3 8B Instruct', 'Meta', 'via Cloudflare Workers AI'],
  ['llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'groq', 'Llama 3.3 70B Versatile', 'Meta', 'via Groq'],
  ['@cf/aisingapore/gemma-sea-lion-v4-27b-it', 'gemma-sea-lion-v4-27b-it', 'cloudflare', 'Gemma SEA-LION v4 27B IT', 'AI Singapore', 'via Cloudflare Workers AI'],
  ['@hf/mistral/mistral-7b-instruct-v0.2', 'mistral-7b-instruct-v0.2', 'cloudflare', 'Mistral 7B Instruct v0.2', 'Mistral', 'via Cloudflare Workers AI'],
  ['gemma-3n-e2b-it', 'Gemma 3n E2B IT', 'google', 'Gemma 3n E2B IT', 'Google', null],
  ['gemma-3n-e4b-it', 'Gemma 3n E4B IT', 'google', 'Gemma 3n E4B IT', 'Google', null],
  ['@cf/meta/llama-3.2-11b-vision-instruct', 'llama-3.2-11b-vision-instruct', 'cloudflare', 'Llama 3.2 11B Vision Instruct', 'Meta', 'via Cloudflare Workers AI'],
  ['@hf/nousresearch/hermes-2-pro-mistral-7b', 'hermes-2-pro-mistral-7b', 'cloudflare', 'Hermes 2 Pro Mistral 7B', 'Nous Research', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-3.1-8b-instruct-fp8', 'llama-3.1-8b-instruct-fp8', 'cloudflare', 'Llama 3.1 8B Instruct (FP8)', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-3.1-8b-instruct-awq', 'llama-3.1-8b-instruct-awq', 'cloudflare', 'Llama 3.1 8B Instruct (AWQ)', 'Meta', 'via Cloudflare Workers AI'],
  ['moonshotai/kimi-k2-instruct-0905', 'Kimi K2 Instruct', 'groq', 'Kimi K2 Instruct (0905)', 'Moonshot AI', 'via Groq'],
  ['@cf/mistral/mistral-7b-instruct-v0.1', 'mistral-7b-instruct-v0.1', 'cloudflare', 'Mistral 7B Instruct v0.1', 'Mistral', 'via Cloudflare Workers AI'],
  ['@cf/zai-org/glm-4.7-flash', 'glm-4.7-flash', 'cloudflare', 'GLM 4.7 Flash', 'Z.ai', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-3.1-8b-instruct', 'llama-3.1-8b-instruct', 'cloudflare', 'Llama 3.1 8B Instruct', 'Meta', 'via Cloudflare Workers AI'],
  ['gemini-2.0-flash-lite', 'Gemini 2.0 Flash-Lite', 'google', 'Gemini 2.0 Flash-Lite', 'Google', null],
  ['@cf/meta/llama-3-8b-instruct-awq', 'llama-3-8b-instruct-awq', 'cloudflare', 'Llama 3 8B Instruct (AWQ)', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-3-8b-instruct', 'llama-3-8b-instruct', 'cloudflare', 'Llama 3 8B Instruct', 'Meta', 'via Cloudflare Workers AI'],
  ['groq/compound', 'Compound', 'groq', 'Compound', 'Groq', null],
  ['@hf/google/gemma-7b-it', 'gemma-7b-it', 'cloudflare', 'Gemma 7B IT', 'Google', 'via Cloudflare Workers AI'],
  ['@cf/defog/sqlcoder-7b-2', 'sqlcoder-7b-2', 'cloudflare', 'SQLCoder 7B 2', 'Defog', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-3.2-3b-instruct', 'llama-3.2-3b-instruct', 'cloudflare', 'Llama 3.2 3B Instruct', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/ibm-granite/granite-4.0-h-micro', 'granite-4.0-h-micro', 'cloudflare', 'Granite 4.0 H Micro', 'IBM', 'via Cloudflare Workers AI'],
  ['gemini-2.5-pro', 'Gemini 2.5 Pro', 'google', 'Gemini 2.5 Pro', 'Google', null],
  ['@cf/google/gemma-7b-it-lora', 'gemma-7b-it-lora', 'cloudflare', 'Gemma 7B IT (LoRA)', 'Google', 'via Cloudflare Workers AI'],
  ['gemma-3-1b-it', 'Gemma 3 1B IT', 'google', 'Gemma 3 1B IT', 'Google', null],
  ['@cf/meta/llama-guard-3-8b', 'llama-guard-3-8b', 'cloudflare', 'Llama Guard 3 8B', 'Meta', 'via Cloudflare Workers AI'],
  ['gemini-2.0-flash', 'Gemini 2.0 Flash', 'google', 'Gemini 2.0 Flash', 'Google', null],
  ['@cf/mistral/mistral-7b-instruct-v0.2-lora', 'mistral-7b-instruct-v0.2-lora', 'cloudflare', 'Mistral 7B Instruct v0.2 (LoRA)', 'Mistral', 'via Cloudflare Workers AI'],
  ['gemma-3-4b-it', 'Gemma 3 4B IT', 'google', 'Gemma 3 4B IT', 'Google', null],
  ['gemini-2.5-flash', 'Gemini 2.5 Flash', 'google', 'Gemini 2.5 Flash', 'Google', null],
  ['@cf/meta-llama/llama-2-7b-chat-hf-lora', 'llama-2-7b-chat-hf-lora', 'cloudflare', 'Llama 2 7B Chat (LoRA)', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-2-7b-chat-fp16', 'llama-2-7b-chat-fp16', 'cloudflare', 'Llama 2 7B Chat (FP16)', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-3.2-1b-instruct', 'llama-3.2-1b-instruct', 'cloudflare', 'Llama 3.2 1B Instruct', 'Meta', 'via Cloudflare Workers AI'],
  ['@cf/meta/llama-2-7b-chat-int8', 'llama-2-7b-chat-int8', 'cloudflare', 'Llama 2 7B Chat (INT8)', 'Meta', 'via Cloudflare Workers AI'],
  ['openai/gpt-oss-120b', 'GPT OSS 120B', 'groq', 'GPT OSS 120B', 'OpenAI', 'via Groq'],
  ['@cf/google/gemma-2b-it-lora', 'gemma-2b-it-lora', 'cloudflare', 'Gemma 2B IT (LoRA)', 'Google', 'via Cloudflare Workers AI'],
  ['gemma-3-27b-it', 'Gemma 3 27B IT', 'google', 'Gemma 3 27B IT', 'Google', null],
  ['gemma-3-12b-it', 'Gemma 3 12B IT', 'google', 'Gemma 3 12B IT', 'Google', null],
  ['openai/gpt-oss-20b', 'GPT OSS 20B', 'groq', 'GPT OSS 20B', 'OpenAI', 'via Groq'],
  ['@cf/microsoft/phi-2', 'phi-2', 'cloudflare', 'Phi-2', 'Microsoft', 'via Cloudflare Workers AI'],
  ['qwen/qwen3-32b', 'Qwen 3 32B', 'groq', 'Qwen3 32B', 'Alibaba Qwen', 'via Groq'],
  ['meta-llama/llama-4-scout-17b-16e-instruct', 'Llama 4 Scout 17B', 'groq', 'Llama 4 Scout 17B 16E Instruct', 'Meta', 'via Groq'],
];

describe('the recorded board', () => {
  it('covers every model id in the fixture', () => {
    const ids = board.items.map(item => item.modelName).sort();
    expect(RECORDED.map(row => row[0]).sort()).toEqual(ids);
  });

  it.each(RECORDED)('%s reads as "%s" -> %s', (id, apiName, provider, name, maker, via) => {
    expect(resolveDisplayName(id, apiName)).toBe(name);
    const made = modelMaker(id, provider);
    expect(made.label).toBe(maker);
    expect(servedBy(made, platformLabel(provider))).toBe(via);
  });

  it('never shows a raw id as the name', () => {
    for (const [id, , , name] of RECORDED) {
      expect(name).not.toMatch(/[/@]/);
      expect(name).toMatch(/[A-Z]/);
      expect(name).not.toBe(modelSlug(id));
    }
  });

  it('gives every model a name that is unique on the board, except true duplicates', () => {
    const names = RECORDED.map(row => row[3]);
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });
});

describe('prettifyModelId', () => {
  it('drops the @cf/org prefix, splits on dashes and capitalises known names', () => {
    expect(prettifyModelId('@cf/meta/llama-3.3-70b-instruct-fp8-fast')).toBe(
      'Llama 3.3 70B Instruct (FP8, fast)',
    );
    expect(prettifyModelId('@hf/meta-llama/meta-llama-3-8b-instruct')).toBe(
      'Meta Llama 3 8B Instruct',
    );
    expect(prettifyModelId('deepseek-r1')).toBe('DeepSeek R1');
    expect(prettifyModelId('@cf/qwen/qwen3-coder-30b-a3b-instruct')).toBe(
      'Qwen3 Coder 30B A3B Instruct',
    );
    expect(prettifyModelId('gpt-4o-mini')).toBe('GPT 4o Mini');
    expect(prettifyModelId('claude-3.5-sonnet')).toBe('Claude 3.5 Sonnet');
    expect(prettifyModelId('gemini-2.5-flash-image')).toBe('Gemini 2.5 Flash Image');
    expect(prettifyModelId('mistral-7b-instruct-v0.3')).toBe('Mistral 7B Instruct v0.3');
    expect(prettifyModelId('Gemma-3n-E2B-IT')).toBe('Gemma 3n E2B IT');
  });

  it('upper-cases sizes and mixture-of-experts tags', () => {
    expect(prettifyModelId('foo-70b')).toBe('Foo 70B');
    expect(prettifyModelId('foo-1.5b')).toBe('Foo 1.5B');
    expect(prettifyModelId('foo-e4b-a12b-16e')).toBe('Foo E4B A12B 16E');
  });

  it('moves serving variants to the end in parentheses, in the order of the id', () => {
    expect(prettifyModelId('foo-8b-awq')).toBe('Foo 8B (AWQ)');
    expect(prettifyModelId('foo-8b-instruct-fp8-fast')).toBe('Foo 8B Instruct (FP8, fast)');
    expect(prettifyModelId('foo-chat-hf-lora')).toBe('Foo Chat (LoRA)');
  });

  it('keeps a lone variant word as the name', () => {
    expect(prettifyModelId('fast')).toBe('Fast');
  });
});

describe('resolveDisplayName', () => {
  it('prefers the curated name over the API name', () => {
    expect(resolveDisplayName('qwen/qwen3-32b', 'Qwen 3 32B')).toBe('Qwen3 32B');
    expect(CURATED_NAMES['qwq-32b']).toBe('Qwen QwQ 32B');
  });

  it('uses the API name when it already reads like a title', () => {
    expect(resolveDisplayName('some-new-model', 'Some New Model')).toBe('Some New Model');
    expect(resolveDisplayName('some-new-model', '  Some New Model  ')).toBe('Some New Model');
  });

  it('ignores an API name that is just the id, and builds a title from the id', () => {
    expect(resolveDisplayName('@cf/acme/some-new-model-7b', 'some-new-model-7b')).toBe(
      'Some New Model 7B',
    );
    expect(resolveDisplayName('@cf/acme/some-new-model-7b', null)).toBe('Some New Model 7B');
    expect(resolveDisplayName('@cf/acme/some-new-model-7b')).toBe('Some New Model 7B');
    expect(resolveDisplayName('x', '@cf/Acme/x')).toBe('X');
  });

  it('knows a human name from an id', () => {
    expect(isHumanName('Gemma 3n E2B IT')).toBe(true);
    expect(isHumanName('Compound')).toBe(true);
    expect(isHumanName('gemma-3n-e2b-it')).toBe(false);
    expect(isHumanName('@cf/Meta/Llama')).toBe(false);
    expect(isHumanName('')).toBe(false);
    expect(isHumanName(undefined)).toBe(false);
  });
});

describe('modelMaker and platformLabel', () => {
  it('reads the maker from the organisation in the id', () => {
    expect(modelMaker('@cf/qwen/qwq-32b', 'cloudflare')).toEqual({
      key: 'qwen',
      label: 'Alibaba Qwen',
    });
    expect(modelMaker('@hf/meta-llama/meta-llama-3-8b-instruct', 'cloudflare').label).toBe('Meta');
    expect(modelMaker('moonshotai/kimi-k2-instruct-0905', 'groq').label).toBe('Moonshot AI');
  });

  it('falls back to the family name when the id has no organisation', () => {
    expect(modelMaker('llama-3.1-8b-instant', 'groq').label).toBe('Meta');
    expect(modelMaker('gemini-2.5-pro', 'google').label).toBe('Google');
    expect(modelMaker('gemma-3-1b-it', 'google').label).toBe('Google');
  });

  it('attributes an unknown model to the platform that serves it', () => {
    expect(modelMaker('mystery-1', 'acme')).toEqual({ key: 'acme', label: 'Acme' });
    expect(modelMaker('mystery-1', '')).toEqual({ key: 'unknown', label: 'Unknown' });
  });

  it('names the serving platforms', () => {
    expect(platformLabel('cloudflare')).toBe('Cloudflare Workers AI');
    expect(platformLabel(' Groq ')).toBe('Groq');
    expect(platformLabel('google')).toBe('Google AI');
    expect(platformLabel('openrouter')).toBe('OpenRouter');
  });

  it('says "via ..." only when someone else serves the model', () => {
    const meta = { key: 'meta', label: 'Meta' };
    expect(servedBy(meta, 'Cloudflare Workers AI')).toBe('via Cloudflare Workers AI');
    expect(servedBy({ key: 'google', label: 'Google' }, 'Google AI')).toBeNull();
    expect(servedBy({ key: 'groq', label: 'Groq' }, 'Groq')).toBeNull();
  });
});
