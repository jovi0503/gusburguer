
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocalUser, Address } from '@/lib/types';

interface UserState {
  user: LocalUser;
  addresses: Omit<Address, 'nickname'>[];
  orderIds: string[];
  setUser: (user: LocalUser) => void;
  addAddress: (address: Omit<Address, 'nickname'>) => void;
  updateAddress: (address: Omit<Address, 'nickname'>) => void;
  removeAddress: (addressId: string) => void;
  addOrderId: (orderId: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: {
        name: '',
        phone: '',
      },
      addresses: [],
      orderIds: [],
      setUser: (user) => set({ user }),
      addAddress: (address) =>
        set((state) => ({
          addresses: [...state.addresses, address],
        })),
      updateAddress: (address) =>
        set((state) => ({
          addresses: state.addresses.map((a) =>
            a.id === address.id ? address : a
          ),
        })),
      removeAddress: (addressId) =>
        set((state) => ({
          addresses: state.addresses.filter((a) => a.id !== addressId),
        })),
      addOrderId: (orderId) =>
        set((state) => ({
          orderIds: [...state.orderIds, orderId],
        })),
    }),
    {
      name: 'user-guest-storage', // Nome do item no localStorage
    }
  )
);
