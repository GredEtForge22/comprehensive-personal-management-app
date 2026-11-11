import type { Macros } from "./types";

export type Food = Macros & {
  name: string;
  brand?: string;
  portion?: { label: string; g: number };
  source?: "local" | "recent" | "off";
};

// Valeurs pour 100 g (aliments courants, moyennes type CIQUAL)
// name, kcal, protein, carbs, fat, fiber, sugar, portion
const raw: [string, number, number, number, number, number, number, [string, number]?][] = [
  ["Riz blanc cuit", 130, 2.7, 28, 0.3, 0.4, 0.1],
  ["Riz complet cuit", 123, 2.7, 25, 1, 1.8, 0.4],
  ["Pâtes cuites", 131, 5, 25, 1.1, 1.8, 0.6],
  ["Pâtes complètes cuites", 124, 5.3, 23, 1.2, 3.9, 1],
  ["Semoule cuite", 120, 4, 24, 0.3, 1.4, 0.3],
  ["Quinoa cuit", 120, 4.4, 21, 1.9, 2.8, 0.9],
  ["Pommes de terre cuites", 86, 1.7, 20, 0.1, 1.8, 0.8],
  ["Patate douce cuite", 90, 2, 21, 0.1, 3.3, 6.5],
  ["Frites", 300, 3.5, 41, 14, 3.8, 0.3],
  ["Pain baguette", 270, 9, 55, 1.2, 2.7, 3, ["tranche", 30]],
  ["Pain complet", 250, 9, 45, 3, 6, 3, ["tranche", 35]],
  ["Pain de mie", 265, 8, 49, 3.5, 3, 5, ["tranche", 25]],
  ["Flocons d'avoine", 370, 13, 60, 7, 10, 1, ["bol", 50]],
  ["Muesli", 360, 9, 62, 6, 8, 18, ["bol", 60]],
  ["Granola", 450, 10, 64, 15, 7, 20, ["portion", 50]],
  ["Céréales chocolatées", 380, 7, 78, 3.5, 5, 28, ["bol", 40]],
  ["Œuf entier", 143, 12.6, 0.7, 9.5, 0, 0.4, ["œuf", 60]],
  ["Blanc d'œuf", 48, 11, 0.7, 0.2, 0, 0.7, ["blanc", 33]],
  ["Blanc de poulet cuit", 165, 31, 0, 3.6, 0, 0],
  ["Cuisse de poulet cuite", 209, 26, 0, 11, 0, 0],
  ["Dinde escalope cuite", 150, 30, 0, 3, 0, 0],
  ["Steak haché 5% cuit", 170, 26, 0, 7, 0, 0, ["steak", 100]],
  ["Bœuf rumsteck cuit", 180, 28, 0, 8, 0, 0],
  ["Jambon blanc", 110, 20, 1, 3, 0, 0.5, ["tranche", 45]],
  ["Saumon cuit", 208, 22, 0, 13, 0, 0],
  ["Thon en boîte au naturel", 116, 26, 0, 1, 0, 0, ["boîte", 112]],
  ["Sardines à l'huile", 210, 24, 0, 12, 0, 0, ["boîte", 95]],
  ["Cabillaud cuit", 105, 23, 0, 1, 0, 0],
  ["Crevettes cuites", 99, 24, 0, 0.3, 0, 0],
  ["Tofu nature", 120, 13, 2, 7, 1, 0.5],
  ["Lentilles cuites", 116, 9, 20, 0.4, 8, 1.8],
  ["Pois chiches cuits", 139, 7, 22, 2.6, 6, 4],
  ["Haricots rouges cuits", 127, 9, 22, 0.5, 6, 2],
  ["Haricots verts cuits", 31, 1.8, 5, 0.2, 3, 2],
  ["Brocoli cuit", 34, 2.8, 7, 0.4, 2.6, 1.7],
  ["Carotte crue", 41, 0.9, 10, 0.2, 2.8, 4.7],
  ["Tomate", 18, 0.9, 3.9, 0.2, 1.2, 2.6, ["tomate", 120]],
  ["Courgette cuite", 17, 1.2, 3, 0.3, 1, 2],
  ["Épinards cuits", 23, 3, 3.6, 0.4, 2.4, 0.4],
  ["Salade verte", 15, 1.4, 2, 0.2, 1.3, 0.8],
  ["Concombre", 15, 0.7, 3.6, 0.1, 0.5, 1.7],
  ["Avocat", 160, 2, 9, 15, 7, 0.7, ["avocat", 150]],
  ["Banane", 90, 1.1, 20, 0.3, 2.6, 17, ["banane", 120]],
  ["Pomme", 52, 0.3, 12, 0.2, 2.4, 10, ["pomme", 150]],
  ["Orange", 47, 0.9, 9, 0.1, 2.4, 9, ["orange", 150]],
  ["Fraises", 33, 0.7, 6, 0.3, 2, 5],
  ["Raisin", 70, 0.7, 17, 0.2, 0.9, 16],
  ["Compote de pomme", 70, 0.3, 16, 0.1, 1.4, 14, ["pot", 100]],
  ["Dattes", 280, 2.5, 65, 0.4, 7, 63, ["datte", 8]],
  ["Amandes", 579, 21, 22, 50, 12, 4, ["poignée", 30]],
  ["Noix", 654, 15, 14, 65, 7, 3, ["poignée", 30]],
  ["Noix de cajou", 570, 18, 30, 44, 3, 6, ["poignée", 30]],
  ["Cacahuètes", 590, 26, 16, 49, 8, 4, ["poignée", 30]],
  ["Beurre de cacahuète", 600, 25, 15, 50, 6, 9, ["c. à soupe", 20]],
  ["Lait demi-écrémé", 46, 3.2, 4.8, 1.6, 0, 4.8, ["verre", 250]],
  ["Lait entier", 64, 3.3, 4.7, 3.6, 0, 4.7, ["verre", 250]],
  ["Lait d'avoine", 45, 1, 7, 1.5, 0.8, 4, ["verre", 250]],
  ["Yaourt nature", 55, 4, 6, 1.5, 0, 6, ["pot", 125]],
  ["Skyr nature", 63, 11, 4, 0.2, 0, 4, ["pot", 150]],
  ["Fromage blanc 0%", 45, 8, 4, 0.2, 0, 4, ["pot", 100]],
  ["Fromage blanc 20%", 75, 7.5, 4, 3, 0, 4],
  ["Emmental", 380, 28, 0, 30, 0, 0, ["portion", 30]],
  ["Mozzarella", 250, 18, 1, 19, 0, 1, ["boule", 125]],
  ["Beurre", 745, 0.7, 0.6, 82, 0, 0.6, ["noix", 10]],
  ["Huile d'olive", 900, 0, 0, 100, 0, 0, ["c. à soupe", 10]],
  ["Whey protéine (poudre)", 400, 80, 8, 6, 0, 4, ["dose", 30]],
  ["Chocolat noir 70%", 560, 8, 35, 40, 11, 24, ["carré", 10]],
  ["Chocolat au lait", 540, 7, 58, 31, 2, 55, ["carré", 10]],
  ["Pâte à tartiner", 539, 6, 58, 31, 3.4, 56, ["c. à soupe", 15]],
  ["Miel", 304, 0.3, 82, 0, 0, 82, ["c. à soupe", 20]],
  ["Confiture", 250, 0.4, 62, 0.1, 1, 60, ["c. à soupe", 20]],
  ["Barre de céréales", 400, 6, 65, 13, 4, 30, ["barre", 25]],
  ["Biscuits secs", 450, 6.5, 70, 15, 2, 25, ["biscuit", 10]],
  ["Croissant", 406, 8, 45, 21, 2, 11, ["croissant", 60]],
  ["Pain au chocolat", 420, 8, 46, 23, 2.5, 14, ["pièce", 70]],
  ["Crêpe", 200, 6.5, 28, 7, 1, 8, ["crêpe", 60]],
  ["Pizza margherita", 250, 11, 33, 9, 2, 3, ["pizza", 350]],
  ["Hamburger", 250, 13, 25, 11, 1.5, 5, ["burger", 200]],
  ["Kebab", 215, 13, 20, 9, 2, 3, ["kebab", 350]],
  ["Jus d'orange", 45, 0.7, 10, 0.2, 0.2, 8.5, ["verre", 250]],
  ["Soda cola", 42, 0, 10.6, 0, 0, 10.6, ["canette", 330]],
  ["Boisson énergétique", 45, 0, 11, 0, 0, 11, ["bouteille", 500]],
  ["Eau", 0, 0, 0, 0, 0, 0, ["verre", 250]],
];

export const LOCAL_FOODS: Food[] = raw.map(([name, kcal, protein, carbs, fat, fiber, sugar, p]) => ({
  name,
  kcal,
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  portion: p ? { label: p[0], g: p[1] } : undefined,
  source: "local" as const,
}));

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .trim();

export function searchFoods(list: Food[], q: string, limit = 8): Food[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return list
    .map((f) => {
      const n = norm(f.name + " " + (f.brand ?? ""));
      if (!words.every((w) => n.includes(w))) return null;
      const starts = n.startsWith(words[0]) ? 0 : 1;
      return { f, score: starts * 100 + f.name.length };
    })
    .filter((x): x is { f: Food; score: number } => x !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.f);
}

/** "200g riz", "200 g de riz", "3 oeufs" → { grams, count, text } */
export function parseQuantity(input: string): { grams?: number; count?: number; text: string } {
  const g = /^\s*(\d+(?:[.,]\d+)?)\s*(g|gr|grammes?|ml)\b\s*(?:de |d'|du |des )?(.*)$/i.exec(input);
  if (g) return { grams: Number(g[1].replace(",", ".")), text: g[3] };
  const n = /^\s*(\d+)\s*(?:x\s*)?(?!\d)(?:de |d'|du |des )?([a-zA-Zéèêàùçœ].*)$/i.exec(input);
  if (n) return { count: Number(n[1]), text: n[2] };
  return { text: input };
}

export const scaleMacros = (f: Macros, grams: number): Macros => {
  const k = grams / 100;
  const r = (v: number) => Math.round(v * k * 10) / 10;
  return {
    kcal: Math.round(f.kcal * k),
    protein: r(f.protein),
    carbs: r(f.carbs),
    fat: r(f.fat),
    fiber: r(f.fiber),
    sugar: r(f.sugar),
  };
};
