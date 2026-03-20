// Replace this sample data with your real article/price data.
// You can export from Excel as CSV and convert, or paste directly.

export interface Article {
  articleNumber: string;
  description: string;
  price: number;
  unit: string;
}

export const articles: Article[] = [
  { articleNumber: "ART-1001", description: "Steel Bracket M8", price: 4.75, unit: "pc" },
  { articleNumber: "ART-1002", description: "Copper Pipe 15mm x 3m", price: 18.90, unit: "pc" },
  { articleNumber: "ART-1003", description: "Hex Bolt M10x40 DIN 933", price: 0.42, unit: "pc" },
  { articleNumber: "ART-1004", description: "Rubber Gasket DN50", price: 2.15, unit: "pc" },
  { articleNumber: "ART-1005", description: "Cable Tray 300mm x 2m", price: 34.50, unit: "pc" },
  { articleNumber: "ART-1006", description: "PVC Elbow 90° 32mm", price: 1.85, unit: "pc" },
  { articleNumber: "ART-1007", description: "Stainless Hose Clamp 20-32", price: 1.20, unit: "pc" },
  { articleNumber: "ART-1008", description: "Welding Rod E6013 3.2mm", price: 12.40, unit: "kg" },
  { articleNumber: "ART-1009", description: "Insulation Board 50mm", price: 28.00, unit: "m²" },
  { articleNumber: "ART-1010", description: "Aluminum Profile 40x40 L=6m", price: 45.60, unit: "pc" },
];
