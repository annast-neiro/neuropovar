import type { Dish, Ingredient, RecommendationMode } from './types.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const confidenceSchemaValues = ['высокая', 'средняя', 'низкая'];

const recognizedIngredientsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          confidence: { type: 'string', enum: confidenceSchemaValues },
        },
        required: ['name', 'confidence'],
      },
    },
  },
  required: ['ingredients'],
} as const;

const dishesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dishes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          usedIngredients: { type: 'array', items: { type: 'string' } },
          missingIngredients: { type: 'array', items: { type: 'string' } },
          reasoning: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          macros100g: {
            type: 'object',
            additionalProperties: false,
            properties: {
              calories: { type: 'number' },
              protein: { type: 'number' },
              fat: { type: 'number' },
              carbs: { type: 'number' },
            },
            required: ['calories', 'protein', 'fat', 'carbs'],
          },
          isApproximated: { type: 'boolean' },
        },
        required: [
          'name',
          'description',
          'usedIngredients',
          'missingIngredients',
          'reasoning',
          'steps',
          'macros100g',
          'isApproximated',
        ],
      },
    },
  },
  required: ['dishes'],
} as const;

const modePrompts: Record<RecommendationMode, string> = {
  fast: 'Режим "Быстро": предлагай блюда с минимальным количеством шагов и максимально простой готовкой.',
  hearty: 'Режим "Сытно": предлагай более плотные, калорийные и насыщенные блюда.',
  light: 'Режим "Полегче": предлагай более легкие и менее тяжелые варианты из доступных продуктов.',
};

const getApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  return apiKey;
};

const createResponse = async (payload: Record<string, unknown>) => {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${details}`);
  }

  const json = await response.json() as { output_text?: string };

  if (!json.output_text) {
    throw new Error('Model returned an empty JSON payload');
  }

  return JSON.parse(json.output_text) as Record<string, unknown>;
};

export const analyzeProductsFromImage = async (imageBase64: string, mimeType: string): Promise<Ingredient[]> => {
  const parsed = await createResponse({
    model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: 'Ты распознаешь продукты на фото и возвращаешь строгий JSON по схеме.' }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Проанализируй фото продуктов. Верни только реальные продукты питания. Не добавляй кухонные предметы, упаковку или бренды.',
          },
          {
            type: 'input_image',
            image_url: `data:${mimeType};base64,${imageBase64}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'recognized_products',
        strict: true,
        schema: recognizedIngredientsSchema,
      },
    },
  });

  return (parsed.ingredients as Ingredient[]) ?? [];
};

export const generateDishesFromIngredients = async (
  ingredients: string[],
  mode: RecommendationMode,
): Promise<Dish[]> => {
  const ingredientsList = ingredients.join(', ');

  const parsed = await createResponse({
    model: process.env.OPENAI_RECIPE_MODEL ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'Ты ассистент по домашней готовке. Возвращай только строгий JSON по схеме, без markdown и комментариев.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `У меня есть следующие продукты: ${ingredientsList}. Предложи 1-4 простых, домашних блюда, которые можно приготовить из этих продуктов.\n\n${modePrompts[mode]}\n\nПравила:\n1. Блюда должны быть бытовыми и реалистичными для обычной кухни, без экзотики.\n2. Если набор продуктов странный или недостаточный, предложи меньше блюд, но более реалистичных.\n3. Для каждого блюда укажи: какие продукты из моего списка используются, каких базовых продуктов может не хватать, почему это блюдо подходит, 3-5 коротких шагов приготовления.\n4. Для каждого блюда рассчитай КБЖУ строго на 100 г готового блюда. Используй данные из баз USDA FoodData Central или Open Food Facts. Если точных данных нет, используй ближайшее совпадение и установи флаг isApproximated: true.`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'dish_recommendations',
        strict: true,
        schema: dishesSchema,
      },
    },
  });

  return (parsed.dishes as Dish[]) ?? [];
};
