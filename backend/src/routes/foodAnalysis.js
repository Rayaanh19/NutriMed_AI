import { Router } from 'express';
import { chatWithGemini } from '../geminiClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../templates');

const router = Router();

// Robust JSON parser helper
function extractJSON(text) {
  try {
    let clean = text.trim();
    // Remove markdown code fences if present
    if (clean.includes('```')) {
      const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        clean = match[1];
      } else {
        clean = clean.replace(/```(?:json)?/g, '').replace(/```/g, '');
      }
    }
    clean = clean.trim();
    return JSON.parse(clean);
  } catch (err) {
    console.warn("Failed to parse JSON directly from Gemini output. Attempting regex extract...", err);
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (regexErr) {
      console.error("Regex JSON extraction also failed:", regexErr);
    }
    throw new Error("Invalid JSON format returned by LLM");
  }
}

// Default fallback response if LLM fails or lacks vision capabilities
const getFallbackDish = (hint) => {
  const queryName = hint || "Avocado Toast with Egg";
  return {
    name: queryName,
    confidence: 0.85,
    calories: 380,
    macros: {
      protein: 16,
      carbs: 24,
      fat: 22
    },
    description: `A delicious and nutrient-dense meal featuring toasted whole-grain sourdough bread, smashed avocado, and a poached or boiled egg. (Note: Fallback simulated analysis applied due to Gemini vision constraints.)`,
    suitability: {
      allowed: true,
      reasons: [
        "Analyzed via static fallback. Please ensure ingredients are checked manually against your allergies."
      ]
    },
    ingredients: [
      "1 slice of whole-grain sourdough bread",
      "1/2 ripe avocado",
      "1 large egg",
      "Salt and black pepper to taste",
      "Red pepper flakes (optional)",
      "Squeeze of fresh lemon juice"
    ],
    recipe: [
      "Toast the slice of sourdough bread to your desired crispiness.",
      "In a bowl, mash the ripe avocado with lemon juice, salt, pepper, and red pepper flakes.",
      "Poach, fry, or boil the egg to your preference.",
      "Spread the mashed avocado evenly over the toasted bread.",
      "Top with the cooked egg, garnish with extra seasoning, and serve immediately."
    ]
  };
};

// Route 1: Scan food image
router.post('/scan-food', async (req, res) => {
  const { image, hint, diseases, allergies } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Missing image data" });
  }

  const diseasesList = Array.isArray(diseases) ? diseases : (diseases ? [diseases] : []);
  const allergiesList = Array.isArray(allergies) ? allergies : (allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : []);

  const prompt = `Analyze this food image. Identify the dish/ingredients and return a detailed nutritional analysis, recipe, and suitability analysis for the user's health profile.

User Health Profile:
- Diseases/Conditions: ${diseasesList.join(', ') || 'None'}
- Allergies: ${allergiesList.join(', ') || 'None'}

CRITICAL REQUIREMENT FOR ALLERGIES:
If the identified food or ANY of its potential ingredients contains, is derived from, or is cross-contaminated with any of the user's allergies (${allergiesList.join(', ') || 'None'}), you MUST mark "suitability.allowed" as false and state clearly in the reasons that it contains the allergen and MUST BE AVOIDED TOTALLY.

CRITICAL REQUIREMENT FOR DISEASES:
Evaluate suitability based on the user's diseases (${diseasesList.join(', ') || 'None'}):
- If the user has "High Blood Pressure" (or hypertension), evaluate if this food is suitable (e.g. low sodium is good, high sodium/processed food is unsuitable and "allowed" should be false or true with warnings).
- If the user has "Diabetes", evaluate glycemic index and sugar/carb content (e.g. low simple sugar, low glycemic index, or moderate portions are suitable; high sugar/highly refined carb foods are unsuitable and "allowed" should be false or true with warning reasons).
- Mention these details in the suitability reasons.

You MUST output ONLY a valid JSON object. Do not include any explanations, markdown code blocks, or extra text.

JSON Schema:
{
  "name": "Name of the dish or food items identified",
  "confidence": 0.95,
  "calories": 420,
  "macros": {
    "protein": 22,
    "carbs": 45,
    "fat": 14
  },
  "description": "Brief summary of the dish and suitability overview.",
  "suitability": {
    "allowed": true,
    "reasons": [
      "Contains no allergens",
      "Low in sodium, suitable for High Blood Pressure"
    ]
  },
  "ingredients": [
    "ingredient 1 with amount",
    "ingredient 2 with amount"
  ],
  "recipe": [
    "Step 1 to prepare",
    "Step 2 to prepare"
  ]
}

If you cannot identify the food, output a JSON with a guess based on the hint "${hint || 'healthy meal'}" and indicate this in the description.`;

  try {
    // Attempt vision chat
    const response = await chatWithGemini(prompt, [image], 'application/json');
    const parsedData = extractJSON(response);
    return res.json(parsedData);
  } catch (err) {
    console.error("Error in AI vision analysis, running text-only backup plan:", err.message);
    
    // Fallback: If vision fails (e.g. model doesn't support vision), ask Gemini to generate text analysis using the hint
    try {
      const textPrompt = `Generate a nutritional details JSON for the food dish described as: "${hint || 'Healthy salad with proteins'}".
Evaluate suitability for:
- Diseases: ${diseasesList.join(', ') || 'None'}
- Allergies: ${allergiesList.join(', ') || 'None'}

You MUST output ONLY a valid JSON object matching this schema:
{
  "name": "Name of the dish",
  "confidence": 0.80,
  "calories": 350,
  "macros": { "protein": 20, "carbs": 30, "fat": 15 },
  "description": "Brief description of the dish...",
  "suitability": {
    "allowed": true,
    "reasons": ["suitability reason 1", "suitability reason 2"]
  },
  "ingredients": ["ingredient 1", "ingredient 2"],
  "recipe": ["step 1", "step 2"]
}
Do not add any extra text or code fences.`;

      const responseText = await chatWithGemini(textPrompt, [], 'application/json');
      const parsedData = extractJSON(responseText);
      // Mark description so user knows it's text-guess
      parsedData.description = `${parsedData.description} (Analyzed via text analysis model fallback)`;
      return res.json(parsedData);
    } catch (fallbackErr) {
      console.error("Text fallback failed as well, serving static fallback:", fallbackErr.message);
      return res.json(getFallbackDish(hint));
    }
  }
});

// Route 2: Get details of a food dish from text query (e.g. from QR scan)
router.post('/food-details', async (req, res) => {
  const { query, diseases, allergies } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  const diseasesList = Array.isArray(diseases) ? diseases : (diseases ? [diseases] : []);
  const allergiesList = Array.isArray(allergies) ? allergies : (allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : []);

  const prompt = `Provide detailed nutrition statistics, quick recipe, and suitability report for the food item: "${query}".

User Health Profile:
- Diseases/Conditions: ${diseasesList.join(', ') || 'None'}
- Allergies: ${allergiesList.join(', ') || 'None'}

Evaluate suitability:
- Allergies: If it contains ${allergiesList.join(', ') || 'None'}, set "suitability.allowed" to false and explain.
- Diseases: Assess sodium, carbohydrates, sugars, etc. for ${diseasesList.join(', ') || 'None'}.

You MUST output ONLY a valid JSON object. Do not include any explanations, markdown code blocks, or extra text.

JSON Schema:
{
  "name": "${query}",
  "confidence": 1.0,
  "calories": 350,
  "macros": {
    "protein": 20,
    "carbs": 40,
    "fat": 10
  },
  "description": "High-quality nutritional analysis and overview.",
  "suitability": {
    "allowed": true,
    "reasons": [
      "suitability reason 1",
      "suitability reason 2"
    ]
  },
  "ingredients": [
    "ingredient 1 with amount",
    "ingredient 2 with amount"
  ],
  "recipe": [
    "Step 1 to prepare",
    "Step 2 to prepare"
  ]
}`;

  try {
    const response = await chatWithGemini(prompt, [], 'application/json');
    const parsedData = extractJSON(response);
    return res.json(parsedData);
  } catch (err) {
    console.error("Error fetching food details:", err.message);
    try {
      // Direct JS simulated result
      return res.json(getFallbackDish(query));
    } catch (e) {
      return res.status(500).json({ error: "Failed to fetch details", details: err.message });
    }
  }
});

// GET /api/dishes/:name - serves a beautifully styled page for the dish
router.get('/dishes/:name', async (req, res) => {
  const { name } = req.params;
  const { diseases, allergies } = req.query;

  const diseasesList = diseases ? (Array.isArray(diseases) ? diseases : [diseases]) : [];
  const allergiesList = allergies ? (Array.isArray(allergies) ? allergies : allergies.split(',').map(s => s.trim()).filter(Boolean)) : [];
  
  // Reuse the logic from food-details
  const prompt = `Provide detailed nutrition statistics, a quick recipe, and health suitability report for the food item: "${name}".

User Health Profile:
- Diseases/Conditions: ${diseasesList.join(', ') || 'None'}
- Allergies: ${allergiesList.join(', ') || 'None'}

Evaluate suitability:
- Allergies: If it contains any of ${allergiesList.join(', ') || 'None'}, set "suitability.allowed" to false.
- Diseases: Assess for conditions like ${diseasesList.join(', ') || 'None'}.

You MUST output ONLY a valid JSON object. Do not include any explanations, markdown code blocks, or extra text.

JSON Schema:
{
  "name": "${name}",
  "confidence": 1.0,
  "calories": 350,
  "macros": {
    "protein": 20,
    "carbs": 40,
    "fat": 10
  },
  "description": "High-quality nutritional analysis and overview.",
  "suitability": {
    "allowed": true,
    "reasons": [
      "suitability reason 1",
      "suitability reason 2"
    ]
  },
  "ingredients": [
    "ingredient 1 with amount",
    "ingredient 2 with amount"
  ],
  "recipe": [
    "Step 1 to prepare",
    "Step 2 to prepare"
  ]
}`;

  let result;
  try {
    const response = await chatWithGemini(prompt, [], 'application/json');
    result = extractJSON(response);
  } catch (err) {
    console.error("Error fetching food details for page:", err.message);
    result = getFallbackDish(name);
  }

  // Render a beautiful HTML page with the macros wheel and instructions
  const { protein = 0, carbs = 0, fat = 0 } = result.macros || {};
  const total = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
  const pPercent = Math.round(((protein * 4) / total) * 100);
  const cPercent = Math.round(((carbs * 4) / total) * 100);
  const fPercent = Math.round(((fat * 9) / total) * 100);

  const suitabilityHtml = result.suitability ? `
    <div style="margin-top: 1.5rem; padding: 1.25rem; border-radius: 12px; background: ${result.suitability.allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; border: 1px solid ${result.suitability.allowed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
        <span style="font-size: 1.2rem;">${result.suitability.allowed ? '✅' : '❌'}</span>
        <strong style="color: ${result.suitability.allowed ? '#10b981' : '#ef4444'}; font-family: 'Outfit', sans-serif;">
          ${result.suitability.allowed ? 'HEALTH SUITABILITY: RECOMMENDED' : 'HEALTH SUITABILITY: NOT RECOMMENDED / AVOID'}
        </strong>
      </div>
      <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-main);">
        ${result.suitability.reasons.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);

  const templateFile = isMobile ? 'phone_dish.html' : 'laptop_dish.html';
  const cssFile = isMobile ? 'phone_dish.css' : 'laptop_dish.css';

  const htmlPath = path.join(templatesDir, templateFile);
  const cssPath = path.join(templatesDir, cssFile);

  let htmlTemplate = fs.readFileSync(htmlPath, 'utf8');
  const cssTemplate = fs.readFileSync(cssPath, 'utf8');

  htmlTemplate = htmlTemplate
    .replace(/\{\{STYLE\}\}/g, cssTemplate)
    .replace(/\{\{NAME\}\}/g, result.name || '')
    .replace(/\{\{CALORIES\}\}/g, result.calories || '0')
    .replace(/\{\{PROTEIN\}\}/g, protein)
    .replace(/\{\{CARBS\}\}/g, carbs)
    .replace(/\{\{FAT\}\}/g, fat)
    .replace(/\{\{P_PERCENT\}\}/g, pPercent)
    .replace(/\{\{C_PERCENT\}\}/g, cPercent)
    .replace(/\{\{F_PERCENT\}\}/g, fPercent)
    .replace(/\{\{P_OFFSET\}\}/g, pPercent)
    .replace(/\{\{F_OFFSET\}\}/g, pPercent + cPercent)
    .replace(/\{\{DESCRIPTION\}\}/g, result.description || '')
    .replace(/\{\{SUITABILITY_HTML\}\}/g, suitabilityHtml)
    .replace(/\{\{INGREDIENTS\}\}/g, result.ingredients.map(i => `<li>${i}</li>`).join(''))
    .replace(/\{\{RECIPE\}\}/g, result.recipe.map(s => `<li>${s}</li>`).join(''));

  res.send(htmlTemplate);
});

export default router;
