

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { CartItem, Product, StoreSettings } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { getStoreSettings } from '@/lib/firestore';

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isHydrated: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  _recalculateTotals: () => void;
  setHydrated: () => void;
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const recalculateTotals = () => {
        const items = get().items;
        const totalItems = items.reduce((total, item) => total + item.quantity, 0);
        const totalPrice = items.reduce((total, item) => total + item.product.price * item.quantity, 0);
        set({ totalItems, totalPrice });
      };

      return {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        isHydrated: false,

        setHydrated: () => set({ isHydrated: true }),

        addItem: (product) => {
          set((state) => {
            const itemExists = state.items.find((item) => item.product.id === product.id);
            const currentQuantity = itemExists ? itemExists.quantity : 0;

            if (product.stock === 0 || currentQuantity >= product.stock) {
              toast({
                title: "Limite de estoque atingido",
                description: `Você não pode adicionar mais unidades de ${product.name}.`,
                variant: "destructive",
              });
              return state; // Retorna o estado inalterado
            }

            if (itemExists) {
              toast({
                title: "Produto adicionado!",
                description: `${product.name} foi adicionado ao seu carrinho.`,
              });
              return {
                items: state.items.map((item) =>
                  item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                ),
              };
            } else {
               toast({
                title: "Produto adicionado!",
                description: `${product.name} foi adicionado ao seu carrinho.`,
              });
              return { items: [...state.items, { product, quantity: 1 }] };
            }
          });
          recalculateTotals();
        },

        removeItem: (productId) => {
          set((state) => ({
            items: state.items.filter((item) => item.product.id !== productId),
          }));
          recalculateTotals();
        },

        updateQuantity: (productId, quantity) => {
          const itemToUpdate = get().items.find((item) => item.product.id === productId);
          
          if (!itemToUpdate) return;
          
          if (quantity > itemToUpdate.product.stock) {
              toast({
                  title: "Limite de estoque excedido",
                  description: `O estoque máximo para ${itemToUpdate.product.name} é ${itemToUpdate.product.stock}.`,
                  variant: "destructive",
              });
              // Revert to max stock quantity
              set((state) => ({
                  items: state.items.map((item) =>
                      item.product.id === productId
                          ? { ...item, quantity: item.product.stock }
                          : item
                  ),
              }));
          } else if (quantity < 1) {
            get().removeItem(productId);
          } else {
            set((state) => ({
              items: state.items.map((item) =>
                item.product.id === productId
                  ? { ...item, quantity }
                  : item
              ),
            }));
          }
          recalculateTotals();
        },

        clearCart: () => {
          set({ items: [], totalItems: 0, totalPrice: 0 });
        },
        
        _recalculateTotals: recalculateTotals,
      };
    },
    {
      name: 'cart-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
            state._recalculateTotals();
            state.setHydrated();
        }
      },
    }
  )
);

export { useCartStore };

    