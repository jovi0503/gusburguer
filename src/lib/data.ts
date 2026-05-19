import type { Category } from '@/lib/types';

// ATENÇÃO: As categorias agora são buscadas do Firestore.
// Este array serve como um fallback inicial ou para referência.
// A gestão real é feita em /admin/categories
export const categories: Category[] = [
  { id: 'hamburgueres', name: 'Hambúrgueres' },
  { id: 'combos', name: 'Combos' },
  { id: 'acompanhamentos', name: 'Acompanhamentos' },
  { id: 'bebidas', name: 'Bebidas' },
  { id: 'sobremesas', name: 'Sobremesas' },
];

// The products array is now fetched from Firestore.
// You can remove this mock data.
export const products = [];
