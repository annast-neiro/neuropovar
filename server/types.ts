export type Confidence = 'высокая' | 'средняя' | 'низкая' | 'ручная';

export interface Ingredient {
  id?: string;
  name: string;
  confidence: Confidence;
}

export interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface Dish {
  name: string;
  description: string;
  usedIngredients: string[];
  missingIngredients: string[];
  reasoning: string;
  steps: string[];
  macros100g: Macros;
  isApproximated: boolean;
}

export type RecommendationMode = 'fast' | 'hearty' | 'light';
