import { generateDishesFromIngredients } from '../server/openaiService';
import type { RecommendationMode } from '../server/types';

type ApiRequest = { method?: string; body?: Record<string, unknown> };
type ApiResponse = { status: (code: number) => { json: (payload: unknown) => void } };

const isMode = (value: unknown): value is RecommendationMode => {
  return value === 'fast' || value === 'hearty' || value === 'light';
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ingredients, mode } = req.body ?? {};

  if (!Array.isArray(ingredients) || ingredients.length === 0 || !ingredients.every((item) => typeof item === 'string')) {
    return res.status(400).json({ error: 'ingredients должен быть непустым массивом строк' });
  }

  if (!isMode(mode)) {
    return res.status(400).json({ error: 'mode должен быть одним из: fast, hearty, light' });
  }

  try {
    const dishes = await generateDishesFromIngredients(ingredients, mode);
    return res.status(200).json({ dishes });
  } catch (error) {
    console.error('generate-recipes error', error);
    return res.status(500).json({ error: 'Не удалось подобрать рецепты' });
  }
}
