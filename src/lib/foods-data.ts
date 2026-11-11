import type { FoodResult } from "@/lib/food-types";

// [nom, kcal, protéines, glucides, lipides, fibres, sucres, libellé portion, grammes portion] pour 100 g
type Row = [string, number, number, number, number, number, number, string?, number?];

const ROWS: Row[] = [
  // Féculents
  ["Riz blanc cuit", 130, 2.7, 28, 0.3, 0.4, 0.1, "1 bol", 200],
  ["Riz blanc cru", 350, 7, 78, 0.6, 1.3, 0.1, "1 portion", 80],
  ["Pâtes cuites", 131, 5, 25, 1.1, 1.8, 0.6, "1 assiette", 250],
  ["Pâtes crues", 360, 12.5, 72, 1.5, 3, 3, "1 portion", 100],
  ["Pomme de terre cuite", 80, 2, 17, 0.1, 1.8, 0.8, "1 patate", 150],
  ["Frites", 300, 3.5, 38, 15, 3.5, 0.5, "1 portion", 150],
  ["Patate douce cuite", 90, 1.6, 20, 0.1, 3, 6.5, "1 patate", 200],
  ["Pain baguette", 270, 8.5, 55, 1.2, 3, 3, "1 tranche", 30],
  ["Pain complet", 250, 9, 45, 3, 6.5, 3, "1 tranche", 35],
  ["Pain de mie", 265, 8, 49, 4, 3, 5, "1 tranche", 25],
  ["Biscotte", 395, 11, 72, 5, 4, 5, "1 biscotte", 9],
  ["Flocons d'avoine", 372, 13, 60, 7, 10, 1, "1 bol", 50],
  ["Céréales petit-déjeuner (corn flakes)", 375, 7, 84, 0.9, 3, 8, "1 bol", 40],
  ["Muesli", 370, 10, 64, 6, 8, 16, "1 bol", 50],
  ["Quinoa cuit", 120, 4.4, 21, 1.9, 2.8, 0.9],
  ["Semoule cuite", 112, 3.8, 23, 0.2, 1.4, 0.1],
  ["Boulgour cuit", 83, 3.1, 18, 0.2, 4.5, 0.1],
  ["Lentilles cuites", 116, 9, 20, 0.4, 7.9, 1.8],
  ["Pois chiches cuits", 139, 8, 22, 2.6, 7, 4],
  ["Haricots rouges cuits", 127, 8.7, 22, 0.5, 6.4, 0.3],
  // Viandes, poissons, œufs
  ["Blanc de poulet cuit", 165, 31, 0, 3.6, 0, 0, "1 filet", 120],
  ["Blanc de poulet cru", 110, 23, 0, 1.5, 0, 0, "1 filet", 150],
  ["Escalope de dinde cuite", 150, 30, 0, 3, 0, 0],
  ["Steak haché 5 % cuit", 140, 26, 0, 4, 0, 0, "1 steak", 100],
  ["Steak haché 15 % cuit", 215, 24, 0, 13, 0, 0, "1 steak", 100],
  ["Bœuf (bavette) cuit", 190, 28, 0, 8, 0, 0],
  ["Jambon blanc", 110, 18, 0.8, 3.5, 0, 0.5, "1 tranche", 45],
  ["Saucisse de porc cuite", 300, 14, 2, 27, 0, 1, "1 saucisse", 80],
  ["Lardons", 280, 17, 0.5, 23, 0, 0],
  ["Saumon cuit", 206, 22, 0, 13, 0, 0, "1 pavé", 130],
  ["Thon au naturel (boîte)", 110, 25, 0, 1, 0, 0, "1 boîte égouttée", 110],
  ["Cabillaud cuit", 105, 23, 0, 1, 0, 0],
  ["Crevettes cuites", 99, 24, 0.2, 0.3, 0, 0],
  ["Œuf entier", 143, 12.5, 0.7, 10, 0, 0.4, "1 œuf", 55],
  ["Blanc d'œuf", 48, 10.5, 0.7, 0.2, 0, 0.7, "1 blanc", 33],
  ["Tofu nature", 120, 12, 2, 7, 1, 0.5],
  ["Whey protéine (poudre)", 380, 78, 6, 6, 0, 4, "1 dose", 30],
  // Produits laitiers
  ["Lait demi-écrémé", 46, 3.2, 4.8, 1.6, 0, 4.8, "1 verre", 250],
  ["Lait entier", 65, 3.2, 4.8, 3.6, 0, 4.8, "1 verre", 250],
  ["Yaourt nature", 55, 4, 6, 1.5, 0, 6, "1 pot", 125],
  ["Skyr nature", 63, 11, 4, 0.2, 0, 4, "1 pot", 150],
  ["Fromage blanc 0 %", 46, 8, 4, 0.2, 0, 4, "1 pot", 100],
  ["Fromage blanc 20 %", 80, 7.5, 4, 3.5, 0, 4, "1 pot", 100],
  ["Emmental", 380, 28, 1, 29, 0, 0.5, "1 portion", 30],
  ["Mozzarella", 250, 18, 1, 19, 0, 1, "1 boule", 125],
  ["Camembert", 300, 20, 0.5, 24, 0, 0.5, "1 part", 30],
  ["Beurre", 745, 0.7, 0.6, 82, 0, 0.6, "1 noix", 10],
  ["Crème fraîche épaisse", 300, 2.3, 3, 30, 0, 3, "1 c. à soupe", 20],
  // Fruits et légumes
  ["Banane", 90, 1.1, 20, 0.3, 2, 17, "1 banane", 120],
  ["Pomme", 52, 0.3, 11.5, 0.2, 2.1, 10, "1 pomme", 150],
  ["Orange", 47, 0.9, 9, 0.2, 2.2, 8.5, "1 orange", 150],
  ["Fraises", 33, 0.7, 6, 0.3, 2, 5, "1 barquette", 250],
  ["Raisin", 70, 0.7, 16, 0.2, 1, 15, "1 grappe", 150],
  ["Kiwi", 55, 1.1, 11, 0.5, 3, 9, "1 kiwi", 80],
  ["Avocat", 160, 2, 1.8, 15, 6.7, 0.7, "1/2 avocat", 100],
  ["Tomate", 18, 0.9, 2.7, 0.2, 1.2, 2.6, "1 tomate", 120],
  ["Carotte crue", 36, 0.8, 7, 0.2, 2.8, 5, "1 carotte", 80],
  ["Concombre", 12, 0.6, 1.8, 0.1, 0.6, 1.5],
  ["Salade verte", 15, 1.3, 1.5, 0.2, 1.5, 1],
  ["Brocoli cuit", 35, 2.8, 4, 0.4, 3, 1.5],
  ["Haricots verts cuits", 31, 1.8, 4.5, 0.2, 3, 1.5],
  ["Courgette cuite", 17, 1.2, 2, 0.3, 1, 1.5],
  ["Épinards cuits", 25, 3, 1.5, 0.5, 2.5, 0.5],
  ["Champignons de Paris", 22, 3, 0.5, 0.3, 1, 0.5],
  ["Compote de pommes", 70, 0.3, 16, 0.1, 1.5, 14, "1 pot", 100],
  ["Jus d'orange", 45, 0.7, 10, 0.2, 0.2, 9, "1 verre", 200],
  // Matières grasses, oléagineux
  ["Huile d'olive", 900, 0, 0, 100, 0, 0, "1 c. à soupe", 10],
  ["Amandes", 590, 21, 8, 52, 12, 4, "1 poignée", 30],
  ["Noix", 650, 15, 7, 65, 6, 3, "1 poignée", 30],
  ["Noix de cajou", 570, 18, 30, 44, 3, 6, "1 poignée", 30],
  ["Cacahuètes", 590, 26, 16, 49, 8, 4, "1 poignée", 30],
  ["Beurre de cacahuète", 590, 25, 12, 50, 6, 6, "1 c. à soupe", 16],
  ["Houmous", 230, 7, 14, 16, 5, 1, "2 c. à soupe", 40],
  // Sucré, gourmandises
  ["Miel", 304, 0.3, 82, 0, 0, 82, "1 c. à café", 7],
  ["Sucre", 400, 0, 100, 0, 0, 100, "1 morceau", 6],
  ["Chocolat noir 70 %", 560, 8, 35, 40, 11, 25, "1 carré", 10],
  ["Chocolat au lait", 540, 7, 57, 31, 2, 55, "1 carré", 10],
  ["Pâte à tartiner (type Nutella)", 540, 6, 58, 31, 3, 56, "1 c. à soupe", 15],
  ["Barre de céréales", 400, 6, 65, 13, 4, 30, "1 barre", 25],
  ["Biscuits secs (type BN / petit-beurre)", 440, 7, 72, 14, 2, 25, "1 biscuit", 8],
  ["Croissant", 410, 8, 45, 22, 2, 8, "1 croissant", 60],
  ["Pain au chocolat", 420, 7, 46, 23, 2, 12, "1 pain au choc.", 70],
  ["Crêpe nature", 220, 6.5, 30, 8.5, 1, 8, "1 crêpe", 60],
  ["Glace vanille", 200, 3.5, 24, 10, 0, 22, "1 boule", 50],
  // Plats / fast-food
  ["Pizza margherita", 250, 11, 33, 8, 2, 3, "1/2 pizza", 200],
  ["Hamburger", 250, 13, 24, 11, 1.5, 5, "1 burger", 200],
  ["Sandwich jambon-beurre", 270, 11, 33, 10, 2, 3, "1 sandwich", 200],
  ["Kebab", 215, 12, 20, 10, 2, 3, "1 kebab", 350],
  ["Purée de pommes de terre", 100, 2, 15, 3.5, 1.5, 1.5],
  // Boissons
  ["Eau", 0, 0, 0, 0, 0, 0, "1 verre", 250],
  ["Café sans sucre", 2, 0.1, 0, 0, 0, 0, "1 tasse", 120],
  ["Coca-Cola", 42, 0, 10.6, 0, 0, 10.6, "1 canette", 330],
  ["Boisson énergétique", 45, 0, 11, 0, 0, 11, "1 canette", 250],
  ["Lait d'amande", 24, 0.5, 3, 1.1, 0.2, 2.5, "1 verre", 250],
];

export const LOCAL_FOODS: FoodResult[] = ROWS.map((r, i) => ({
  key: `local-${i}`,
  name: r[0],
  brand: "",
  kcal: r[1],
  protein: r[2],
  carbs: r[3],
  fat: r[4],
  fiber: r[5],
  sugar: r[6],
  source: "local" as const,
  portions: r[7] && r[8] ? [{ label: r[7], grams: r[8] }] : undefined,
}));

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
