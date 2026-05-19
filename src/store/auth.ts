
import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import { getAuth, signOut } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';

interface AuthState {
  user: FirebaseUser | null;
  isAuthLoading: boolean;
  setUser: (user: FirebaseUser | null, isLoading: boolean) => void;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthLoading: true, // Inicia como true para aguardar a verificação inicial
  setUser: (user, isLoading) => set({ user, isAuthLoading: isLoading }),
  logout: async () => {
    const app = getFirebaseApp();
    if (!app) return;
    const auth = getAuth(app);
    await signOut(auth);
    set({ user: null, isAuthLoading: false });
  },
}));

export { useAuthStore };

    