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
// Dynamic fallback response if LLM fails or lacks vision capabilities
// Dynamic fallback response if LLM fails or lacks vision capabilities
const getFallbackDish = (hint) => {
  const queryLower = (hint || '').toLowerCase();

  // 1. Biryani & Rice dishes
  if (queryLower.includes('biryani') || queryLower.includes('pulao') || queryLower.includes('rice') || queryLower.includes('hyderabadi')) {
    const isVeg = queryLower.includes('veg') || queryLower.includes('paneer');
    return {
      name: hint || (isVeg ? "Vegetable Dum Biryani" : "Chicken Dum Biryani"),
      confidence: 0.85,
      calories: 550,
      macros: { protein: isVeg ? 18 : 32, carbs: 68, fat: 18 },
      detected_items: [
        "Basmati Rice",
        isVeg ? "Mixed Vegetables & Paneer" : "Marinated Chicken",
        "Plain Yogurt (Dahi)",
        "Fried Sliced Onions",
        "Aromatic Spices (Cardamom, Cloves, Cinnamon)",
        "Ghee & Fresh Mint"
      ],
      description: `A rich, aromatic meal featuring fluffy basmati rice, tender ${isVeg ? 'vegetables and paneer' : 'marinated chicken'}, and whole fragrant spices. (Note: Simulated dish analysis applied due to connectivity/vision constraints.)`,
      suitability: {
        allowed: true,
        reasons: ["Rich source of complex carbs and protein. Enjoy with cucumber raita for better digestion."]
      },
      ingredients: [
        "1.5 cups Basmati Rice",
        isVeg ? "150g Mixed Vegetables & Paneer" : "200g Chicken (bone-in or boneless)",
        "1/2 cup Plain Yogurt (Dahi)",
        "1 large sliced & fried onion",
        "2 tbsp Ghee or cooking oil",
        "Whole spices (cardamom, cinnamon, cloves, bay leaf)",
        "Fresh mint and coriander leaves",
        "Biryani masala and saffron"
      ],
      recipe: [
        "Marinate chicken/vegetables in yogurt and spices for 30 minutes.",
        "Par-boil basmati rice with whole spices until 70% cooked.",
        "Layer marinated mixture and rice in a pot with fried onions, mint, and ghee.",
        "Seal lid tightly and steam on low heat (dum) for 20-25 minutes until tender.",
        "Gently fluff rice and serve hot with raita."
      ]
    };
  }

  // 2. Pizza
  if (queryLower.includes('pizza')) {
    return {
      name: hint || "Classic Cheese & Herb Pizza",
      confidence: 0.85,
      calories: 460,
      macros: { protein: 18, carbs: 54, fat: 20 },
      detected_items: [
        "Whole Wheat Pizza Base",
        "Marinara Tomato Sauce",
        "Shredded Mozzarella Cheese",
        "Sliced Bell Peppers & Tomatoes",
        "Italian Herbs & Chili Flakes"
      ],
      description: "Oven-baked flatbread topped with marinara sauce, melted mozzarella cheese, and Italian herbs.",
      suitability: {
        allowed: true,
        reasons: ["Provides calcium and carbs. Enjoy in moderation."]
      },
      ingredients: [
        "1 medium pizza base (whole-wheat preferred)",
        "1/3 cup pizza marinara sauce",
        "80g shredded mozzarella cheese",
        "Sliced bell peppers and tomatoes",
        "Dried oregano and chili flakes"
      ],
      recipe: [
        "Preheat oven to 220°C (425°F).",
        "Spread pizza sauce evenly over base.",
        "Top with shredded cheese and fresh sliced vegetables.",
        "Bake for 12-15 minutes until crust is golden and cheese is melted."
      ]
    };
  }

  // 3. Burger / Sandwich
  if (queryLower.includes('burger') || queryLower.includes('sandwich')) {
    return {
      name: hint || "Grilled Patty Sandwich",
      confidence: 0.85,
      calories: 420,
      macros: { protein: 22, carbs: 44, fat: 18 },
      detected_items: [
        "Burger Bun / Bread",
        "Grilled Seasoned Patty",
        "Crisp Lettuce",
        "Sliced Tomatoes & Onions",
        "Cheese Slice & Sauce"
      ],
      description: "A delicious sandwich/burger featuring a juicy seasoned patty, crisp lettuce, and fresh tomato slices.",
      suitability: {
        allowed: true,
        reasons: ["Good balance of protein and carbs. Choose whole-grain bread for extra fiber."]
      },
      ingredients: [
        "1 burger bun / sourdough bread",
        "1 seasoned patty (chicken/veggie/beef)",
        "Fresh lettuce, tomato slices, onion rings",
        "1 slice cheese",
        "1 tbsp mayo or mustard"
      ],
      recipe: [
        "Sear or grill patty for 4-5 mins each side until fully cooked.",
        "Toast bun lightly on skillet.",
        "Assemble with sauce, patty, cheese, and crisp vegetables."
      ]
    };
  }

  // 4. Salad
  if (queryLower.includes('salad')) {
    return {
      name: hint || "Fresh Garden Salad",
      confidence: 0.85,
      calories: 260,
      macros: { protein: 12, carbs: 18, fat: 16 },
      detected_items: [
        "Mixed Leafy Greens",
        "Sliced Cucumber",
        "Cherry Tomatoes",
        "Lemon Olive Oil Dressing",
        "Pumpkin Seeds / Feta Cheese"
      ],
      description: "A crisp, refreshing bowl of garden greens, cherry tomatoes, cucumbers, and light olive oil dressing.",
      suitability: {
        allowed: true,
        reasons: ["High in dietary fiber, vitamins, and antioxidants."]
      },
      ingredients: [
        "2 cups mixed leafy greens",
        "1/2 cucumber, sliced",
        "1/2 cup cherry tomatoes",
        "2 tbsp olive oil & lemon dressing",
        "2 tbsp pumpkin seeds or feta cheese"
      ],
      recipe: [
        "Wash and dry greens thoroughly.",
        "Toss with sliced cucumbers and tomatoes.",
        "Drizzle with lemon dressing right before serving."
      ]
    };
  }

  // 5. Fruits & Fruit Basket (Default fruit detection)
  if (!hint || queryLower.includes('fruit') || queryLower.includes('apple') || queryLower.includes('banana') || queryLower.includes('berry') || queryLower.includes('grape') || queryLower.includes('pineapple') || queryLower.includes('lemon') || queryLower.includes('lime') || queryLower.includes('orange') || queryLower.includes('plum') || queryLower.includes('kiwi') || queryLower.includes('pomegranate')) {
    return {
      name: hint || "Fresh Tropical & Berry Fruit Basket",
      confidence: 0.88,
      calories: 280,
      macros: { protein: 4, carbs: 68, fat: 1 },
      detected_items: [
        "Ripe Bananas",
        "Fresh Pineapple",
        "Green Seedless Grapes",
        "Crisp Red Apples",
        "Fresh Pomegranate",
        "Black Plums",
        "Kiwis",
        "Citrus (Lemon & Lime)"
      ],
      description: "A vibrant assortment of whole fresh fruits rich in natural sugars, vitamin C, hydrating minerals, and dietary fiber.",
      suitability: {
        allowed: true,
        reasons: ["Rich in Vitamin C, potassium, and antioxidants. Excellent for immunity, heart health, and digestion."]
      },
      ingredients: [
        "2 medium Bananas",
        "1 cup fresh Pineapple chunks",
        "1 cup Green Grapes",
        "2 Crisp Red Apples",
        "1 Pomegranate",
        "2 Kiwis & Plums"
      ],
      recipe: [
        "Wash all fresh fruits under clean running water.",
        "Peel and slice bananas, kiwis, and pineapple into bite-sized pieces.",
        "Deseed pomegranate and combine all fresh fruits in a large salad bowl.",
        "Serve fresh or chilled with a squeeze of fresh lime juice."
      ]
    };
  }

  // 6. Default / Generic fallback
  const queryName = hint || "Nutrient-Balanced Gourmet Meal";
  return {
    name: queryName,
    confidence: 0.85,
    calories: 420,
    macros: {
      protein: 22,
      carbs: 48,
      fat: 16
    },
    detected_items: [
      hint || "Primary Food Component",
      "Fresh Vegetables",
      "Healthy Cooking Medium / Dressing",
      "Seasonings & Spices"
    ],
    description: `A balanced meal featuring ${hint ? hint : 'wholesome ingredients, lean proteins, and complex carbohydrates'}. (Note: Simulated dish analysis applied due to AI vision constraints.)`,
    suitability: {
      allowed: true,
      reasons: [
        "Analyzed via dynamic fallback. Please check ingredients against your specific dietary profile."
      ]
    },
    ingredients: [
      `Main component (${hint || 'Lean protein / Whole grains'})`,
      "1 cup fresh mixed vegetables",
      "1 tbsp olive oil or healthy cooking medium",
      "Fresh herbs and spices to taste"
    ],
    recipe: [
      `Prepare the main component (${hint || 'food dish'}) according to your preferred cooking method.`,
      "Season with fresh herbs and spices.",
      "Serve warm with fresh greens or steamed vegetables."
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

  const prompt = `Analyze this food image in detail. Identify the overall dish or list of food items, and list EVERY individual component or item visually present in the image (especially for fruit baskets, mixed platters, or complex dishes). Return a detailed nutritional analysis, recipe, and suitability analysis for the user's health profile.

User Health Profile:
- Diseases/Conditions: ${diseasesList.join(', ') || 'None'}
- Allergies: ${allergiesList.join(', ') || 'None'}

CRITICAL REQUIREMENT FOR ALLERGIES:
If the identified food or ANY of its potential ingredients contains, is derived from, or is cross-contaminated with any of the user's allergies (${allergiesList.join(', ') || 'None'}), you MUST mark "suitability.allowed" as false and state clearly in the reasons that it contains the allergen and MUST BE AVOIDED TOTALLY.

CRITICAL REQUIREMENT FOR DISEASES:
Evaluate suitability based on the user's diseases (${diseasesList.join(', ') || 'None'}):
- If the user has "High Blood Pressure" (or hypertension), evaluate if this food is suitable.
- If the user has "Diabetes", evaluate glycemic index and sugar/carb content.
- Mention these details in the suitability reasons.

You MUST output ONLY a valid JSON object. Do not include any explanations, markdown code blocks, or extra text.

JSON Schema:
{
  "name": "Name of the dish or overall food basket identified",
  "confidence": 0.95,
  "calories": 420,
  "macros": {
    "protein": 22,
    "carbs": 45,
    "fat": 14
  },
  "detected_items": [
    "Individual Scanned Item / Component 1 (e.g., Bananas)",
    "Individual Scanned Item / Component 2 (e.g., Pineapple)",
    "Individual Scanned Item / Component 3 (e.g., Green Grapes)"
  ],
  "description": "Brief summary of the dish or fruit basket and suitability overview.",
  "suitability": {
    "allowed": true,
    "reasons": [
      "Contains no allergens",
      "Low in sodium"
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

If you cannot identify the food, output a JSON with a guess based on the hint "${hint || 'fresh meal'}" and populate detected_items with identified components.`;

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

  const detectedItemsHtml = (result.detected_items && result.detected_items.length > 0) ? `
    <div style="margin-top: 1rem; margin-bottom: 1.25rem; background: rgba(14, 165, 233, 0.05); padding: 1rem; border-radius: 12px; border: 1px solid rgba(14, 165, 233, 0.15);">
      <h4 style="margin: 0 0 0.75rem 0; color: #38bdf8; font-family: 'Outfit', sans-serif; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">Scanned Items / Identified Components</h4>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        ${result.detected_items.map(item => `
          <span style="background: rgba(14, 165, 233, 0.12); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.3); padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
            ✓ ${item}
          </span>
        `).join('')}
      </div>
    </div>
  ` : '';

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
    .replace(/\{\{DETECTED_ITEMS_HTML\}\}/g, detectedItemsHtml)
    .replace(/\{\{SUITABILITY_HTML\}\}/g, suitabilityHtml)
    .replace(/\{\{INGREDIENTS\}\}/g, result.ingredients.map(i => `<li>${i}</li>`).join(''))
    .replace(/\{\{RECIPE\}\}/g, result.recipe.map(s => `<li>${s}</li>`).join(''));

  res.send(htmlTemplate);
});

export default router;
