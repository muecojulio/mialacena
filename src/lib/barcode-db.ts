export type BarcodeProduct = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  packageType: string;
  unit: string;
  targetQty: number;
  usualPrice: number;
};

// Common Mexican barcodes & household goods for instant offline / fallback resolution
export const COMMON_BARCODES: Record<string, Partial<BarcodeProduct>> = {
  // Leche Lala Entera 1L
  "7501020512130": { name: "Leche Entera 1L", brand: "Lala", category: "Lácteos y huevo", packageType: "pieza", unit: "L", targetQty: 1, usualPrice: 28 },
  "7501020512123": { name: "Leche Deslactosada 1L", brand: "Lala", category: "Lácteos y huevo", packageType: "pieza", unit: "L", targetQty: 1, usualPrice: 30 },
  // Huevos San Juan 30 pzas
  "7501055300078": { name: "Huevo Blanco 30 pzas", brand: "San Juan", category: "Lácteos y huevo", packageType: "paquete", unit: "pza", targetQty: 12, usualPrice: 92 },
  // Aceite Nutrioli 850ml / 1L
  "7501039120401": { name: "Aceite Puro de Soya", brand: "Nutrioli", category: "Abarrotes", packageType: "botella", unit: "L", targetQty: 1, usualPrice: 48 },
  "7501039120012": { name: "Aceite 123", brand: "1-2-3", category: "Abarrotes", packageType: "botella", unit: "L", targetQty: 1, usualPrice: 44 },
  // Frijol Negro Verde Valle 1kg
  "7501071301011": { name: "Frijol Negro 1kg", brand: "Verde Valle", category: "Abarrotes", packageType: "bolsa", unit: "kg", targetQty: 1, usualPrice: 46 },
  // Arroz Verde Valle 1kg
  "7501071300021": { name: "Arroz Super Extra 1kg", brand: "Verde Valle", category: "Abarrotes", packageType: "bolsa", unit: "kg", targetQty: 1, usualPrice: 35 },
  // Atun Dolores Agua 140g
  "7501045401013": { name: "Atún en Agua", brand: "Dolores", category: "Abarrotes", packageType: "lata", unit: "lata", targetQty: 3, usualPrice: 22 },
  // Pasta Barilla Spaghetti 500g
  "7501006550017": { name: "Pasta Spaghetti", brand: "Barilla", category: "Abarrotes", packageType: "paquete", unit: "paq", targetQty: 2, usualPrice: 23 },
  // Cafe Nescafé Clásico 200g
  "7501058617838": { name: "Café Soluble Clásico", brand: "Nescafé", category: "Bebidas", packageType: "frasco", unit: "pza", targetQty: 1, usualPrice: 115 },
  // Sal La Fina 1kg
  "7501012500013": { name: "Sal Yodada 1kg", brand: "La Fina", category: "Abarrotes", packageType: "bote", unit: "kg", targetQty: 1, usualPrice: 16 },
  // Jabón Salvo Limón 750ml
  "7500435123456": { name: "Jabón Líquido Limón", brand: "Salvo", category: "Limpieza", packageType: "botella", unit: "pza", targetQty: 1, usualPrice: 38 },
  // Cloralex 950ml
  "7501025400012": { name: "Cloro El Rendidor", brand: "Cloralex", category: "Limpieza", packageType: "botella", unit: "L", targetQty: 1, usualPrice: 20 },
  // Papel Pétalo 4 rollos
  "7501943481234": { name: "Papel Higiénico Rendimax", brand: "Pétalo", category: "Limpieza", packageType: "paquete", unit: "paq", targetQty: 1, usualPrice: 45 },
  // Salsa Valentina 370ml
  "7501017001010": { name: "Salsa Picante", brand: "Valentina", category: "Abarrotes", packageType: "botella", unit: "pza", targetQty: 1, usualPrice: 19 },
};
