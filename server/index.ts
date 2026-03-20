import express from 'express';
import { analyzeProductsFromImage, generateDishesFromIngredients } from './openaiService.js';
import type { RecommendationMode } from './types.js';

const app = express();
const port = Number(process.env.API_PORT ?? 8787);

app.use(express.json({ limit: '15mb' }));

const isMode = (value: unknown): value is RecommendationMode => {
  return value === 'fast' || value === 'hearty' || value === 'light';
};

app.post('/api/analyze-products', async (req, res) => {
  const { imageBase64, mimeType } = req.body ?? {};

  if (!imageBase64 || typeof imageBase64 !== 'string' || !mimeType || typeof mimeType !== 'string') {
    return res.status(400).json({ error: 'imageBase64 и mimeType обязательны' });
  }

  try {
    const ingredients = await analyzeProductsFromImage(imageBase64, mimeType);
    return res.status(200).json({ ingredients });
  } catch (error) {
    console.error('analyze-products error', error);
    return res.status(500).json({ error: 'Не удалось распознать продукты' });
  }
});

app.post('/api/generate-recipes', async (req, res) => {
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
});

app.listen(port, () => {
  console.log(`API server started on http://localhost:${port}`);
});
