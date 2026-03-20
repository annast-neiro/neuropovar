import { analyzeProductsFromImage } from '../server/openaiService';

type ApiRequest = { method?: string; body?: Record<string, unknown> };
type ApiResponse = { status: (code: number) => { json: (payload: unknown) => void } };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
}
