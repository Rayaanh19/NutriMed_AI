import { GoogleGenAI } from '@google/genai';

const getModelName = () => process.env.GEMINI_MODEL || 'gemini-3.6-flash';

let ai = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please obtain a valid API key starting with AIzaSy... from Google AI Studio (https://aistudio.google.com/) and set GEMINI_API_KEY in Vercel.');
  }
  return new GoogleGenAI({ apiKey });
}

function parseImage(imgStr) {
  const mimeMatch = imgStr.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const data = imgStr.replace(/^data:image\/\w+;base64,/, '');
  return {
    inlineData: {
      data,
      mimeType
    }
  };
}

/**
 * Standard non-streaming generateContent call
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
        parts.push(parseImage(img));
      }
    });
  }

  const config = {
    systemInstruction: 'You are a helpful nutrition and meal planning assistant.'
  };

  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  const response = await client.models.generateContent({
    model: getModelName(),
    contents: [{ role: 'user', parts }],
    config
  });

  if (response && response.text) {
    return response.text;
  }
  
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
