import { buildParsePrompt, parseLocally } from './parseService';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-3.5-flash'];

const DEFAULT_GEMINI_KEY = '';

/**
 * Resolve the API key from argument, window/global env, or Expo public env.
 */
function resolveApiKey(passedKey) {
  if (passedKey && passedKey.trim().length > 10 && !passedKey.includes('your_')) {
    return passedKey.trim();
  }

  const envKey =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_GEMENAI_API_KEY ||
    process.env.GEMENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (envKey && envKey.trim().length > 10 && !envKey.includes('your_')) {
    return envKey.trim();
  }

  // Use the verified Gemini key from .env so bundling never fails on device
  return DEFAULT_GEMINI_KEY;
}

/**
 * Call Google Generative Language API (Gemini).
 */
async function callGemini(userInput, systemPrompt, apiKey) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser request: "${userInput}"` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`Gemini model ${model} returned error: ${msg}`);
        continue; // Try next model
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`Empty response content from Gemini (${model})`);
      }

      const parsed = JSON.parse(rawText);
      return { success: true, data: parsed, source: `gemini (${model})` };
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Call OpenAI API if an OpenAI key (sk-...) is configured.
 */
async function callOpenAI(userInput, systemPrompt, userPrompt, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return { success: true, data: JSON.parse(content), source: 'openai' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse a request using Gemini, OpenAI, or on-device fallback.
 */
export async function callLLMForParsing(userInput, apiKey) {
  const resolvedKey = resolveApiKey(apiKey);

  if (!resolvedKey) {
    const localData = parseLocally(userInput);
    return {
      success: true,
      data: localData,
      source: 'local',
      message: 'Review the extracted details before continuing.',
    };
  }

  const { systemPrompt, userPrompt } = buildParsePrompt(userInput);

  // If key is an OpenAI key (typically starts with sk-)
  const isOpenAI = resolvedKey.startsWith('sk-');

  try {
    if (isOpenAI) {
      return await callOpenAI(userInput, systemPrompt, userPrompt, resolvedKey);
    } else {
      // Default to Google Gemini API
      return await callGemini(userInput, systemPrompt, resolvedKey);
    }
  } catch (error) {
    console.warn('Remote LLM parsing failed, falling back to local:', error.message);
    const fallbackData = parseLocally(userInput);
    return {
      success: true,
      data: fallbackData,
      source: 'fallback',
      warning: `LLM service unavailable (${error.message}). Extracted details using on-device rules.`,
    };
  }
}
