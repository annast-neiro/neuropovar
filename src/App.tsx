import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { UploadCloud, Image as ImageIcon, Loader2, AlertTriangle, CheckCircle2, HelpCircle, UtensilsCrossed, Info, Lightbulb, ShoppingCart, ListOrdered, Plus, X, Edit2, Zap, Flame, Leaf, Scale, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Ingredient {
  id: string;
  name: string;
  confidence: 'высокая' | 'средняя' | 'низкая' | 'ручная';
}

interface Macros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface Dish {
  name: string;
  description: string;
  usedIngredients: string[];
  missingIngredients: string[];
  reasoning: string;
  steps: string[];
  macros100g: Macros;
  isApproximated: boolean;
}

type Step = 'upload' | 'review' | 'results';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newIngredient, setNewIngredient] = useState('');
  const [isListModified, setIsListModified] = useState(false);
  const [mode, setMode] = useState<'fast' | 'hearty' | 'light'>('fast');
  const [portionSize, setPortionSize] = useState<number>(200);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Кажется, это не фото. Пожалуйста, загрузите изображение в формате JPG или PNG.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('upload');
    setIngredients([]);
    setDishes([]);
    setIsListModified(false);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Image = await fileToBase64(selectedFile);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: base64Image,
              mimeType: selectedFile.type,
            }
          },
          "Проанализируй это фото продуктов. Определи, какие продукты ты видишь. Верни только список продуктов с указанием уверенности ('высокая', 'средняя', 'низкая')."
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Название продукта" },
                    confidence: { type: Type.STRING, description: "Уверенность: 'высокая', 'средняя', 'низкая'" }
                  },
                  required: ["name", "confidence"]
                }
              }
            },
            required: ["ingredients"]
          }
        }
      });

      if (response.text) {
        const parsedResult = JSON.parse(response.text);
        const ingredientsWithIds = parsedResult.ingredients.map((ing: any) => ({
          ...ing,
          id: Date.now().toString() + Math.random().toString()
        }));
        setIngredients(ingredientsWithIds);
        setStep('review');
      } else {
        throw new Error("Пустой ответ от модели");
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось распознать продукты на фото. Попробуйте загрузить другую фотографию.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRecipes = async () => {
    if (ingredients.length === 0) {
      setError("Добавьте хотя бы один продукт для поиска рецептов.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const ingredientsList = ingredients.map(i => i.name).join(', ');
      
      let modePrompt = '';
      if (mode === 'fast') {
        modePrompt = 'Режим "Быстро": предлагай блюда с минимальным количеством шагов и максимально простой готовкой.';
      } else if (mode === 'hearty') {
        modePrompt = 'Режим "Сытно": предлагай более плотные, калорийные и насыщенные блюда.';
      } else if (mode === 'light') {
        modePrompt = 'Режим "Полегче": предлагай более легкие и менее тяжелые варианты из доступных продуктов.';
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          `У меня есть следующие продукты: ${ingredientsList}. Предложи 1-4 простых, домашних блюда, которые можно приготовить из этих продуктов.\n\n${modePrompt}\n\nПравила:\n1. Блюда должны быть бытовыми и реалистичными для обычной кухни, без экзотики.\n2. Если набор продуктов странный или недостаточный, предложи меньше блюд, но более реалистичных.\n3. Для каждого блюда укажи: какие продукты из моего списка используются, каких базовых продуктов может не хватать, почему это блюдо подходит, 3-5 коротких шагов приготовления.\n4. Для каждого блюда рассчитай КБЖУ строго на 100 г готового блюда. Используй данные из баз USDA FoodData Central или Open Food Facts. Если точных данных нет, используй ближайшее совпадение и установи флаг isApproximated: true.`
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dishes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Название блюда" },
                    description: { type: Type.STRING, description: "Краткое описание блюда" },
                    usedIngredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Список используемых продуктов из моего списка" },
                    missingIngredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Список продуктов, которых не хватает (базовые)" },
                    reasoning: { type: Type.STRING, description: "Почему это блюдо подходит под данный набор продуктов" },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 коротких шагов приготовления" },
                    macros100g: {
                      type: Type.OBJECT,
                      description: "КБЖУ строго на 100 г готового блюда",
                      properties: {
                        calories: { type: Type.NUMBER, description: "Калории на 100 г" },
                        protein: { type: Type.NUMBER, description: "Белки (г) на 100 г" },
                        fat: { type: Type.NUMBER, description: "Жиры (г) на 100 г" },
                        carbs: { type: Type.NUMBER, description: "Углеводы (г) на 100 г" }
                      },
                      required: ["calories", "protein", "fat", "carbs"]
                    },
                    isApproximated: { type: Type.BOOLEAN, description: "Установлен в true, если расчет выполнен по ближайшему совпадению" }
                  },
                  required: ["name", "description", "usedIngredients", "missingIngredients", "reasoning", "steps", "macros100g", "isApproximated"]
                }
              }
            },
            required: ["dishes"]
          }
        }
      });

      if (response.text) {
        const parsedResult = JSON.parse(response.text);
        setDishes(parsedResult.dishes);
        setIsListModified(false);
        setStep('results');
      } else {
        throw new Error("Пустой ответ от модели");
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось составить рецепты. Попробуйте еще раз или немного измените список продуктов.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, { id: Date.now().toString() + Math.random().toString(), name: newIngredient.trim(), confidence: 'ручная' }]);
      setNewIngredient('');
      setIsListModified(true);
    }
  };

  const handleUpdateIngredient = (id: string, newName: string) => {
    setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, name: newName } : ing));
    setIsListModified(true);
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
    setIsListModified(true);
  };

  const handleModeChange = (newMode: 'fast' | 'hearty' | 'light') => {
    setMode(newMode);
    if (dishes.length > 0) {
      setIsListModified(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2 pt-4 sm:pt-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 flex items-center justify-center gap-3">
            <UtensilsCrossed className="w-8 h-8 text-emerald-600" />
            НейроПовар
          </h1>
          <p className="text-zinc-500 max-w-lg mx-auto">
            Загрузите фото продуктов, и мы предложим, что из них приготовить, с примерным расчетом КБЖУ.
          </p>
        </header>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <p>{error}</p>
          </div>
        )}

        {/* Step 1: Upload Zone */}
        {step === 'upload' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer
                ${previewUrl ? 'border-emerald-200 bg-emerald-50/50' : 'border-zinc-300 hover:border-emerald-400 hover:bg-zinc-100/50'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              
              {previewUrl ? (
                <div className="space-y-4">
                  <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-sm object-contain" />
                  <p className="text-sm text-zinc-500">Нажмите или перетащите другое фото для замены</p>
                </div>
              ) : (
                <div className="space-y-4 py-8">
                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                    <UploadCloud className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-zinc-700 font-medium">Нажмите для загрузки или перетащите фото сюда</p>
                    <p className="text-zinc-500 text-sm mt-1">PNG, JPG до 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex justify-center">
                <button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Внимательно изучаем фото...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      Распознать продукты
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Review Ingredients */}
        {step === 'review' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Распознанные продукты
              </h2>
              <p className="text-zinc-600 text-sm mb-6 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                Мы посмотрели на фото и вот что нашли. Проверьте список: если что-то распознано неточно, вы можете удалить лишнее или добавить продукты вручную.
              </p>
              
              <div className="space-y-3 mb-6">
                {ingredients.map((ing) => (
                  <div key={ing.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => handleUpdateIngredient(ing.id, e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors
                        ${ing.confidence === 'высокая' ? 'bg-emerald-50/30 border-emerald-200 text-emerald-900' : 
                          ing.confidence === 'средняя' ? 'bg-amber-50/30 border-amber-200 text-amber-900' : 
                          ing.confidence === 'ручная' ? 'bg-blue-50/30 border-blue-200 text-blue-900' :
                          'bg-zinc-50 border-zinc-200 text-zinc-900'}`}
                    />
                    {ing.confidence !== 'высокая' && ing.confidence !== 'ручная' && (
                      <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" title={`Уверенность: ${ing.confidence}`} />
                    )}
                    <button
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {ingredients.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                    <p>Список продуктов пуст. Добавьте хотя бы один продукт, чтобы получить рекомендации.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                  placeholder="Добавить продукт..."
                  className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  onClick={handleAddIngredient}
                  disabled={!newIngredient.trim()}
                  className="px-4 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h2 className="text-lg font-semibold mb-4 text-zinc-900">Режим рекомендаций</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleModeChange('fast')}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${mode === 'fast' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-emerald-200 hover:bg-emerald-50/50'}`}
                >
                  <Zap className={`w-6 h-6 mb-2 ${mode === 'fast' ? 'text-emerald-500' : 'text-zinc-400'}`} />
                  <span className="font-medium text-sm">Быстро</span>
                </button>
                <button
                  onClick={() => handleModeChange('hearty')}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${mode === 'hearty' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-orange-200 hover:bg-orange-50/50'}`}
                >
                  <Flame className={`w-6 h-6 mb-2 ${mode === 'hearty' ? 'text-orange-500' : 'text-zinc-400'}`} />
                  <span className="font-medium text-sm">Сытно</span>
                </button>
                <button
                  onClick={() => handleModeChange('light')}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all ${mode === 'light' ? 'border-green-500 bg-green-50 text-green-700' : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-green-200 hover:bg-green-50/50'}`}
                >
                  <Leaf className={`w-6 h-6 mb-2 ${mode === 'light' ? 'text-green-500' : 'text-zinc-400'}`} />
                  <span className="font-medium text-sm">Полегче</span>
                </button>
              </div>
            </div>

            {isListModified && dishes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-start gap-3 text-sm">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
                <p>Список изменен. Обновите рекомендации, чтобы пересчитать рецепты и КБЖУ.</p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Загрузить другое фото
              </button>
              <button
                onClick={generateRecipes}
                disabled={isGenerating || ingredients.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Составляем меню...
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="w-5 h-5" />
                    Обновить рекомендации
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Results */}
        <AnimatePresence>
          {step === 'results' && dishes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pb-12"
            >
              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 text-sm">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                <p>
                  <strong>Обратите внимание:</strong> Это первая MVP-версия. Расчет калорийности и БЖУ является приблизительным и основан на распознанных продуктах.
                </p>
              </div>

              {/* Confirmed Ingredients Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-zinc-200 shadow-sm gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium text-zinc-900">Продукты ({ingredients.length})</span>
                  </div>
                  <div className="w-px h-4 bg-zinc-300 hidden sm:block"></div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200">
                    {mode === 'fast' && <><Zap className="w-4 h-4 text-emerald-500" /> Быстро</>}
                    {mode === 'hearty' && <><Flame className="w-4 h-4 text-orange-500" /> Сытно</>}
                    {mode === 'light' && <><Leaf className="w-4 h-4 text-green-500" /> Полегче</>}
                  </div>
                </div>
                <button 
                  onClick={() => setStep('review')} 
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors self-start sm:self-auto"
                >
                  <Edit2 className="w-4 h-4" />
                  Изменить
                </button>
              </div>

              {/* Portion Selector */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-900">
                  <Scale className="w-5 h-5 text-emerald-500" />
                  Размер порции
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  {[100, 150, 200, 250, 300, 400].map(size => (
                    <button
                      key={size}
                      onClick={() => setPortionSize(size)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${portionSize === size ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:border-emerald-500'}`}
                    >
                      {size} г
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="number"
                      value={portionSize || ''}
                      onChange={(e) => setPortionSize(Number(e.target.value) || 0)}
                      className="w-20 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Свой вес"
                    />
                    <span className="text-sm text-zinc-500">г</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  Расчет выполнен по значениям на 100 г из базы продуктов (USDA / Open Food Facts) и пересчитан на выбранную порцию.
                </p>
              </div>

              {/* Dishes */}
              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 px-1">
                  <UtensilsCrossed className="w-5 h-5 text-zinc-700" />
                  Варианты блюд
                </h2>
                <div className="grid gap-6 sm:grid-cols-1">
                  {dishes.map((dish, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col xl:flex-row gap-6">
                      <div className="flex-1 space-y-6">
                        <div>
                          <h3 className="text-xl font-semibold text-zinc-900">{dish.name}</h3>
                          <p className="text-zinc-600 text-sm mt-1">{dish.description}</p>
                        </div>

                        <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50 space-y-2">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-zinc-700">{dish.reasoning}</p>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              Используем из списка:
                            </h4>
                            <ul className="flex flex-wrap gap-1.5">
                              {dish.usedIngredients.map((ing, i) => (
                                <li key={i} className="text-xs px-2 py-1 bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200">
                                  {ing}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {dish.missingIngredients.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                                <ShoppingCart className="w-4 h-4 text-amber-500" />
                                Нужно добавить:
                              </h4>
                              <ul className="flex flex-wrap gap-1.5">
                                {dish.missingIngredients.map((ing, i) => (
                                  <li key={i} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                                    {ing}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                            <ListOrdered className="w-4 h-4 text-zinc-500" />
                            Как готовить:
                          </h4>
                          <ol className="space-y-2 text-sm text-zinc-700 list-decimal list-inside marker:text-zinc-400">
                            {dish.steps.map((step, i) => (
                              <li key={i} className="pl-1 leading-relaxed">{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                      
                      <div className="xl:w-64 shrink-0 space-y-4 h-fit">
                        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 space-y-4">
                          <h4 className="font-medium text-zinc-900 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-600" />
                            Пищевая ценность
                          </h4>
                          
                          {/* 100g */}
                          <div>
                            <div className="text-xs text-zinc-500 mb-2">На 100 г</div>
                            <div className="grid grid-cols-4 gap-2">
                              <div className="bg-white p-2 rounded-lg border border-zinc-200 text-center">
                                <div className="text-xs text-zinc-500">Ккал</div>
                                <div className="font-semibold text-zinc-900">{dish.macros100g?.calories || 0}</div>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-zinc-200 text-center">
                                <div className="text-xs text-zinc-500">Белки</div>
                                <div className="font-semibold text-zinc-900">{dish.macros100g?.protein || 0}г</div>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-zinc-200 text-center">
                                <div className="text-xs text-zinc-500">Жиры</div>
                                <div className="font-semibold text-zinc-900">{dish.macros100g?.fat || 0}г</div>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-zinc-200 text-center">
                                <div className="text-xs text-zinc-500">Углеводы</div>
                                <div className="font-semibold text-zinc-900">{dish.macros100g?.carbs || 0}г</div>
                              </div>
                            </div>
                          </div>

                          {/* Portion */}
                          <div>
                            <div className="text-xs text-zinc-500 mb-2">На порцию ({portionSize} г)</div>
                            <div className="grid grid-cols-4 gap-2">
                              <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 text-center">
                                <div className="text-xs text-emerald-600">Ккал</div>
                                <div className="font-semibold text-emerald-900">{Math.round((dish.macros100g?.calories || 0) * portionSize / 100)}</div>
                              </div>
                              <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 text-center">
                                <div className="text-xs text-emerald-600">Белки</div>
                                <div className="font-semibold text-emerald-900">{Math.round((dish.macros100g?.protein || 0) * portionSize / 100)}г</div>
                              </div>
                              <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 text-center">
                                <div className="text-xs text-emerald-600">Жиры</div>
                                <div className="font-semibold text-emerald-900">{Math.round((dish.macros100g?.fat || 0) * portionSize / 100)}г</div>
                              </div>
                              <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 text-center">
                                <div className="text-xs text-emerald-600">Углеводы</div>
                                <div className="font-semibold text-emerald-900">{Math.round((dish.macros100g?.carbs || 0) * portionSize / 100)}г</div>
                              </div>
                            </div>
                          </div>
                          
                          {dish.isApproximated && (
                            <div className="text-xs text-amber-600 flex items-start gap-1.5 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>Расчет выполнен по ближайшему совпадению продуктов в базе.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep('upload')}
                  className="px-6 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Загрузить другое фото
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
