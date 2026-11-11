export type FoodResult = {
  key: string;
  name: string;
  brand: string;
  // valeurs pour 100 g
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  source: "local" | "saved" | "off";
  portions?: { label: string; grams: number }[];
  lastGrams?: number | null;
};

export const MEALS = [
  { id: "petit_dej", label: "Petit-déjeuner", icon: "🥐" },
  { id: "dejeuner", label: "Déjeuner", icon: "🍝" },
  { id: "collation", label: "Collation", icon: "🍎" },
  { id: "diner", label: "Dîner", icon: "🍽️" },
] as const;
