import { Router } from 'express';
import Joi from 'joi';
import { chatWithOllama } from '../ollamaClient.js';

const router = Router();

const schema = Joi.object({
  age: Joi.number().integer().min(1).max(120).required(),
  sex: Joi.string().valid('male', 'female', 'other').required(),
  height_cm: Joi.number().min(50).max(250).required(),
  weight_kg: Joi.number().min(20).max(300).required(),
  activity_level: Joi.string().valid('sedentary', 'light', 'moderate', 'active', 'very_active').required(),
  dietary_preferences: Joi.array().items(Joi.string()).default([]),
  allergies: Joi.array().items(Joi.string()).default([]),
  goals: Joi.array().items(Joi.string()).default([]),
  cuisine_preferences: Joi.array().items(Joi.string()).default([]),
  plan_duration_value: Joi.number().integer().min(1).max(90).default(1),
  plan_duration_unit: Joi.string().valid('days', 'weeks', 'months').default('days'),
});

router.post('/generate-meals', async (req, res) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Invalid input', details: error.details });
  }

  try {
    const prompt = buildPrompt(value);
    const response = await chatWithOllama(prompt);
    res.json({ result: response });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to generate meals', details: e.message });
  }
});

function buildPrompt(input) {
  const prefs = input.dietary_preferences.join(', ') || 'none';
  const allergies = input.allergies.join(', ') || 'none';
  const goals = input.goals.join(', ') || 'balanced nutrition';
  const cuisines = input.cuisine_preferences.join(', ') || 'any';
  
  const durationValue = input.plan_duration_value || 1;
  const durationUnit = input.plan_duration_unit || 'days';

  return `You are a certified nutritionist and meal planning assistant.
Generate a ${durationValue}-${durationUnit} meal plan with easy recipes and approximate macros and calories. The daily schedule should include a pre-breakfast/early morning meal, breakfast, lunch, dinner, and any snacks.

User profile:
- Age: ${input.age}
- Sex: ${input.sex}
- Height: ${input.height_cm} cm
- Weight: ${input.weight_kg} kg
- Activity level: ${input.activity_level}
- Dietary preferences: ${prefs}
- Allergies: ${allergies}
- Goals: ${goals}
- Cuisine preferences: ${cuisines}

Constraints:
- Avoid allergens strictly.
- Respect preferences and goals.
- Provide simple ingredients.
- Output in concise markdown with clear section headings.
- For EVERY meal, explicitly specify the recommended time it should be taken (e.g., "7:00 AM" or "3:30 PM").
- For EVERY meal, provide a highly concise step-by-step recipe.
- CRITICAL: Be extremely concise. Use short bullet points and DO NOT generate any images.
`;
}

export default router;
