export interface Article {
  articleNumber: string;
  description: string;
  price: number;
  unit: string;
  stock: number;
  stockUnit: string;
}

export const articles: Article[] = [
  { articleNumber: "1", description: "Article 1", price: 100, unit: "pc", stock: 10, stockUnit: "meter" },
  { articleNumber: "2", description: "Article 2", price: 200, unit: "pc", stock: 20, stockUnit: "meter" },
  { articleNumber: "3", description: "Article 3", price: 300, unit: "pc", stock: 30, stockUnit: "meter" },
  { articleNumber: "4", description: "Article 4", price: 400, unit: "pc", stock: 40, stockUnit: "meter" },
  { articleNumber: "5", description: "Article 5", price: 500, unit: "pc", stock: 50, stockUnit: "meter" },
  { articleNumber: "6", description: "Article 6", price: 600, unit: "pc", stock: 60, stockUnit: "meter" },
  { articleNumber: "7", description: "Article 7", price: 700, unit: "pc", stock: 70, stockUnit: "meter" },
  { articleNumber: "8", description: "Article 8", price: 800, unit: "pc", stock: 80, stockUnit: "meter" },
  { articleNumber: "9", description: "Article 9", price: 900, unit: "pc", stock: 90, stockUnit: "meter" },
  { articleNumber: "10", description: "Article 10", price: 1000, unit: "pc", stock: 100, stockUnit: "meter" },
];
