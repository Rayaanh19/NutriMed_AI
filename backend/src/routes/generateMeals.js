import { Router } from 'express';
import Joi from 'joi';
import { streamChatWithGemini } from '../geminiClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../templates');

const router = Router();

const schema = Joi.object({
  age: Joi.number().integer().min(1).max(120).required(),
  sex: Joi.string().valid('male', 'female', 'other').required(),
  height_cm: Joi.number().min(50).max(250).required(),
  weight_kg: Joi.number().min(20).max(300).required(),
  activity_level: Joi.string().valid('sedentary', 'light', 'moderate', 'active', 'very_active').required(),
  dietary_preferences: Joi.array().items(Joi.string()).default([]),
  allergies: Joi.array().items(Joi.string()).default([]),
  diseases: Joi.array().items(Joi.string()).default([]),
  goals: Joi.array().items(Joi.string()).default([]),
  cuisine_preferences: Joi.array().items(Joi.string()).default([]),
  plan_duration_value: Joi.number().integer().min(1).max(90).default(1),
  plan_duration_unit: Joi.string().valid('days', 'weeks', 'months').default('days'),
  eggs_per_week: Joi.number().integer().min(0).max(100).default(0),
  non_veg_per_week: Joi.number().integer().min(0).max(100).default(0),
  daily_meal_plan: Joi.string().allow('').default(''),
});

const plansCache = new Map();

router.post('/generate-meals', async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Invalid input', details: error.details });
  }

  try {
    const prompt = buildPrompt(value);
    const planId = 'plan_' + Math.random().toString(36).substring(2, 15);
    
    // Set headers for SSE-like chunked text stream
    res.setHeader('X-Plan-ID', planId);
    res.setHeader('Access-Control-Expose-Headers', 'X-Plan-ID');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    await streamChatWithGemini(prompt, (chunk) => {
      fullText += chunk;
      res.write(chunk);
    });

    plansCache.set(planId, fullText);
    res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate meals', details: e.message });
    } else {
      res.end();
    }
  }
});

// GET plan by ID - serves a beautifully styled dark-theme print-ready HTML page
router.get('/plans/:id', (req, res) => {
  const { id } = req.params;
  const plan = plansCache.get(id);

  if (!plan) {
    return res.status(404).send(`
      <html>
        <head>
          <title>Plan Not Found</title>
          <style>
            body { background: #090d16; color: #ef4444; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: rgba(17, 25, 40, 0.75); padding: 2rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Meal Plan Expired or Not Found</h2>
            <p style="color: #94a3b8;">Please generate a new meal plan and scan the active QR code.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Simple Markdown to HTML parser
  const renderMarkdown = (md) => {
    let html = md;
    html = html.replace(/### (.*)/g, '<h3>$1</h3>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^- (.*)/gm, '<li>$1</li>');
    html = html.replace(/\n/g, '<br>');
    return html;
  };

  const renderedHtml = renderMarkdown(plan);

  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);

  const templateFile = isMobile ? 'phone_plan.html' : 'laptop_plan.html';
  const cssFile = isMobile ? 'phone_plan.css' : 'laptop_plan.css';

  const htmlPath = path.join(templatesDir, templateFile);
  const cssPath = path.join(templatesDir, cssFile);

  let htmlTemplate = fs.readFileSync(htmlPath, 'utf8');
  const cssTemplate = fs.readFileSync(cssPath, 'utf8');

  htmlTemplate = htmlTemplate
    .replace(/\{\{STYLE\}\}/g, cssTemplate)
    .replace(/\{\{RENDERED_HTML\}\}/g, renderedHtml);

  res.send(htmlTemplate);
});

function buildPrompt(input) {
  const prefs = input.dietary_preferences.join(', ') || 'none';
  const allergies = input.allergies.join(', ') || 'none';
  const goals = input.goals.join(', ') || 'balanced nutrition';
  const cuisines = input.cuisine_preferences.join(', ') || 'any';
  const diseases = input.diseases.join(', ') || 'none';
  
  const durationValue = input.plan_duration_value || 1;
  const durationUnit = input.plan_duration_unit || 'days';

  // Calculate BMI dynamically
  const heightM = input.height_cm / 100;
  const bmi = parseFloat((input.weight_kg / (heightM * heightM)).toFixed(1));
  let bmiStatus = 'Normal';
  let bmiRecommendation = '';
  if (bmi < 18.5) {
    bmiStatus = 'Underweight';
    bmiRecommendation = 'The user is underweight. Ensure the meal plan provides a healthy caloric surplus with calorie-dense, nutrient-rich foods, adequate protein, and healthy fats to encourage healthy weight gain.';
  } else if (bmi >= 18.5 && bmi < 25) {
    bmiStatus = 'Normal weight';
    bmiRecommendation = 'The user has a healthy weight. Focus on weight maintenance, nutrient density, variety, and supporting their physical activities.';
  } else if (bmi >= 25 && bmi < 30) {
    bmiStatus = 'Overweight';
    bmiRecommendation = 'The user is overweight. Ensure the meal plan focuses on a moderate caloric deficit, portion control, lean proteins, high fiber, and reduced refined sugars/carbohydrates to support healthy fat loss.';
  } else {
    bmiStatus = 'Obese';
    bmiRecommendation = 'The user is obese. Design the plan to support gradual, safe weight loss via structured portion sizes, low glycemic index foods, high satiety from fiber and protein, and heart-healthy ingredients.';
  }

  const eggsText = input.eggs_per_week !== undefined ? `${input.eggs_per_week} eggs per week` : 'not specified';
  const nonVegText = input.non_veg_per_week !== undefined ? `${input.non_veg_per_week} non-veg meals per week` : 'not specified';
  const currentDietText = input.daily_meal_plan || 'not specified';

  let dietaryPreferenceInstructions = '';
  if (prefs.toLowerCase().includes('vegetarian')) {
    dietaryPreferenceInstructions = '- STRICT CONSTRAINT: The user is vegetarian. Do not include any meat, poultry, fish, seafood, or eggs.\n';
  } else {
    // Prohibit pork explicitly and enforce Halal preparation rules
    dietaryPreferenceInstructions = `- STRICT CONSTRAINT: The user is Muslim. All recommended meat dishes MUST be 100% Halal.
- ABSOLUTE PROHIBITION: Do NOT under any circumstances recommend pork, bacon, ham, lard, gelatin, or any pig-derived meat/ingredients. It is strictly prohibited (haram).
- Allowed meats include: ${prefs}. Make sure to suggest only these chosen meats.
- Always assume and verify that meat dishes are prepared using Halal-certified ingredients.\n`;
  }

  return `You are a certified nutritionist and meal planning assistant.
Generate a highly accurate, customized ${durationValue}-${durationUnit} meal plan.
CRITICAL: Be extremely concise. Use short bullet points. Do not include introductory/concluding explanations or pleasantries. Output raw markdown directly.

User profile:
- Age: ${input.age}
- Sex: ${input.sex}
- Height: ${input.height_cm} cm
- Weight: ${input.weight_kg} kg
- BMI: ${bmi} (${bmiStatus})
- Activity level: ${input.activity_level}
- Dietary preferences: ${prefs}
- Allergies: ${allergies}
- Medical Conditions / Diseases: ${diseases}
- Goals: ${goals}
- Cuisine preferences: ${cuisines}

Current Eating Habits & Lifestyle:
- Eggs consumed per week: ${eggsText}
- Non-veg meals consumed per week: ${nonVegText}
- Typical daily diet / current meal plan: ${currentDietText}

BMI Focus Instructions:
- BMI is ${bmi} (${bmiStatus}).
- ${bmiRecommendation}
- Incorporate their current eating habits (eggs and non-veg meals per week) into the plan dynamically where healthy, adjusting portion sizes or meal frequencies to align with their BMI focus and health goals. If their current daily diet contains unhealthy habits, correct them constructively in the generated plan.

Constraints:
${dietaryPreferenceInstructions}- Strictly avoid all allergies: ${allergies}.
- Ensure all meal suggestions are fully safe, suitable, and therapeutic for their medical conditions / diseases: ${diseases}.
  - E.g. If the user has High Blood Pressure (hypertension), ensure meals are low-sodium, rich in potassium/magnesium, and heart-healthy.
  - E.g. If the user has Diabetes, ensure meals are low-glycemic, low-sugar, have controlled carbohydrates, and are high-fiber.
- Include a pre-breakfast/early morning meal, breakfast, lunch, dinner, and snacks.
- CRITICAL VARIETY: Each day must feature completely unique meals and recipes. Do not repeat the same dishes, recipes, or main ingredients across different days. Ensure variety and updated choices for every single day.

For each day, use this structure:
### Day X
- **[Meal Name]** ([HH:MM AM/PM])
  - Macros: [Calories] kcal | P: [X]g | C: [X]g | F: [X]g
  - Ingredients: [short list]
  - Recipe: 1. [Step one] 2. [Step two]
`;
}

export default router;
