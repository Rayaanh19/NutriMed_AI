import { GoogleGenAI } from '@google/genai';

const getModelName = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let ai = null;

function getClient() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please obtain a valid API key starting with AIzaSy... from Google AI Studio (https://aistudio.google.com/) and set GEMINI_API_KEY in Vercel.');
  }
  return new GoogleGenAI({ apiKey });
}

function parseImage(imgStr) {
  if (!imgStr) return null;
  const mimeMatch = imgStr.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const data = imgStr.includes('base64,') ? imgStr.split('base64,')[1].trim() : imgStr.trim();
  return {
    inlineData: {
      data,
      mimeType
    }
  };
}

/**
 * Standard non-streaming generateContent call with model retries
 * @param {string} prompt 
 * @param {string[]} images 
 * @param {string} responseMimeType 
 * @returns {Promise<string>}
 */
export async function chatWithGemini(prompt, images = [], responseMimeType = null) {
  const client = getClient();
  const parts = [{ text: prompt }];

  if (images && images.length > 0) {
    images.forEach(img => {
      if (img) {
        const parsed = parseImage(img);
        if (parsed) {
          parts.push(parsed);
        }
      }
    });
  }

  const config = {
    systemInstruction: 'You are an expert global culinary AI, master chef, and clinical nutritionist. Your job is to accurately identify any dish, meal, street food, beverage, or food item from any culture around the world (Asian, Indian, Italian, Mexican, Middle Eastern, American, African, European, etc.), precisely determine all visual components, and return accurate nutritional metrics, recipes, and health suitability reports.'
  };

  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  const primaryModel = getModelName();
  const candidateModels = [
    primaryModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastErr = null;
  for (const model of candidateModels) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn(`Gemini API call failed with model ${model}:`, err.message);
      lastErr = err;
      if (err.message && (err.message.includes('API key') || err.message.includes('API_KEY'))) {
        throw err;
      }
    }
  }

  if (lastErr) throw lastErr;
  return '';
}

/**
 * Streaming generateContent call
 * @param {string} prompt 
 * @param {function(string): void} onChunk 
 * @returns {Promise<void>}
 */
export async function streamChatWithGemini(prompt, onChunk) {
  const client = getClient();
  const responseStream = await client.models.generateContentStream({
    model: getModelName(),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: 'You are a helpful nutrition and meal planning assistant.'
    }
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
}
