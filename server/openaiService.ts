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

const toShortJson = (value: unknown, maxLength = 1500) => {
  try {
    return JSON.stringify(value).slice(0, maxLength);
  } catch {
    return '[unserializable response]';
  }
};

const stripMarkdownCodeFence = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  const withoutStart = trimmed.replace(/^```[a-zA-Z]*\n?/, '');
  return withoutStart.replace(/```$/, '').trim();
};

const extractFirstJsonBlock = (text: string): string | null => {
  const normalized = stripMarkdownCodeFence(text);
  const objectStart = normalized.indexOf('{');
  const arrayStart = normalized.indexOf('[');
  const startCandidates = [objectStart, arrayStart].filter((index) => index >= 0);

  if (startCandidates.length === 0) {
    return null;
  }

  const start = Math.min(...startCandidates);
  const stack: string[] = [];

  for (let i = start; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}' || char === ']') {
      const last = stack[stack.length - 1];
      const isMatch = (last === '{' && char === '}') || (last === '[' && char === ']');
      if (!isMatch) return null;
      stack.pop();
      if (stack.length === 0) {
        return normalized.slice(start, i + 1);
      }
    }
  }

  return null;
};

const collectResponseCandidates = (responseJson: Record<string, unknown>): unknown[] => {
  const candidates: unknown[] = [];

  if (typeof responseJson.output_text === 'string' && responseJson.output_text.trim().length > 0) {
    candidates.push(responseJson.output_text);
  }

  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const typedItem = item as Record<string, unknown>;

    if (typeof typedItem.text === 'string' && typedItem.text.trim().length > 0) {
      candidates.push(typedItem.text);
    }

    if (typedItem.arguments && typeof typedItem.arguments === 'string') {
      candidates.push(typedItem.arguments);
    }

    const content = Array.isArray(typedItem.content) ? typedItem.content : [];
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const typedPart = part as Record<string, unknown>;

      if (typeof typedPart.text === 'string' && typedPart.text.trim().length > 0) {
        candidates.push(typedPart.text);
      }

      if (typedPart.json && typeof typedPart.json === 'object') {
        candidates.push(typedPart.json);
      }
    }
  }

  return candidates;
};

const parseJsonFromCandidates = (candidates: unknown[]): Record<string, unknown> | null => {
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }

    if (typeof candidate !== 'string') continue;

    const normalized = stripMarkdownCodeFence(candidate);
    try {
      const directParsed = JSON.parse(normalized) as unknown;
      if (directParsed && typeof directParsed === 'object' && !Array.isArray(directParsed)) {
        return directParsed as Record<string, unknown>;
      }
    } catch {
      const extracted = extractFirstJsonBlock(normalized);
      if (!extracted) continue;
      try {
        const fallbackParsed = JSON.parse(extracted) as unknown;
        if (fallbackParsed && typeof fallbackParsed === 'object' && !Array.isArray(fallbackParsed)) {
          return fallbackParsed as Record<string, unknown>;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
};

const createResponse = async (payload: Record<string, unknown>, requestName: string) => {
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

  const json = await response.json() as Record<string, unknown>;
  const candidates = collectResponseCandidates(json);
  const parsed = parseJsonFromCandidates(candidates);

  if (!parsed) {
    const diagnostic = toShortJson({
      requestName,
      hasOutputText: typeof json.output_text === 'string' && json.output_text.length > 0,
      candidatesCount: candidates.length,
      rawResponse: json,
    });
    console.error(`OpenAI parse failure (${requestName}): ${diagnostic}`);
    throw new Error(`OpenAI returned an unsupported response format for ${requestName}`);
  }

  return parsed;
};

const normalizeConfidence = (value: unknown): Ingredient['confidence'] => {
  if (value === 'высокая' || value === 'средняя' || value === 'низкая' || value === 'ручная') {
    return value;
  }
  return 'низкая';
};

export const analyzeProductsFromImage = async (imageBase64: string, mimeType: string): Promise<Ingredient[]> => {
  const parsed = await createResponse({
    model: process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: [{
          type: 'input_text',
          text: 'Ты распознаешь продукты на фото и отвечаешь только JSON-объектом без markdown и пояснений.',
        }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Проанализируй фото продуктов. Верни ТОЛЬКО JSON формата {"ingredients":[{"name":"...","confidence":"высокая|средняя|низкая"}]}. Не добавляй кухонные предметы, упаковку или бренды.',
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
  }, 'analyze-products');

  const ingredientsRaw = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
  return ingredientsRaw
    .map((item) => {
      const typedItem = item as Record<string, unknown>;
      return {
        name: String(typedItem.name ?? '').trim(),
        confidence: normalizeConfidence(typedItem.confidence),
      } as Ingredient;
    })
    .filter((item) => item.name.length > 0);
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
  }, 'generate-recipes');

  return (parsed.dishes as Dish[]) ?? [];
};
