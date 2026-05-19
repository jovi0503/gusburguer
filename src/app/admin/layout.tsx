'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BellOff } from 'lucide-react';
import { onSnapshot, collection, getFirestore, query, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';

import AdminSidebar from '@/components/admin-sidebar';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseApp } from '@/lib/firebase';
import { ADMIN_USER_UIDS } from '@/lib/admins';
import { AlarmProvider, useAlarm } from '@/context/alarm-context';
import { Button } from '@/components/ui/button';

function AdminContent({ children }: { children: React.ReactNode }) {
    const { isRinging, stopRinging } = useAlarm();

    return (
        <>
            {isRinging && (
                <div className="fixed top-4 right-4 z-50 no-print">
                    <Button onClick={stopRinging} variant="destructive" size="lg" className="flex items-center gap-2 animate-pulse">
                        <BellOff className="h-5 w-5"/>
                        Silenciar Alarme
                    </Button>
                </div>
            )}
            <main className="flex-1 p-8 bg-muted/30">
                {children}
            </main>
        </>
    );
}

function AdminLayoutController({ children }: { children: React.ReactNode }) {
  const { user, setUser, isAuthLoading, logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const { startRinging, initAudio } = useAlarm();
  const app = getFirebaseApp();

  useEffect(() => {
    if (!app) {
        setUser(null, false);
        return;
    }
    const auth = getAuth(app);

    setPersistence(auth, browserLocalPersistence).then(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const isUserAdmin = ADMIN_USER_UIDS.includes(firebaseUser.uid);
            if (isUserAdmin) {
               setUser(firebaseUser, false);
            } else {
              toast({
                  title: "Acesso Negado",
                  description: "Você não tem permissão para acessar o painel de administração.",
                  variant: "destructive",
              });
              await logout();
              router.replace('/login');
            }
          } else {
            setUser(null, false);
            router.replace('/login');
          }
        });
        return () => unsubscribe();
    }).catch(() => {
        setUser(null, false);
    });
  }, [app, setUser, router, toast, logout]);

  useEffect(() => {
    if (!user || !app) return;
    const db = getFirestore(app);
    const ordersQuery = query(
      collection(db, "orders"),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                startRinging();
            }
        });
    }, (error) => {
        console.error("[ERRO DE LISTENER DE PEDIDOS]:", error);
        toast({
            title: "Erro de Conexão",
            description: "Não foi possível monitorar novos pedidos em tempo real.",
            variant: "destructive",
        });
    });
    return () => unsubscribe();
  }, [user, app, startRinging, toast]);

  useEffect(() => {
    if (!user) return;
    const handleFirstUserInteraction = () => {
      initAudio();
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };
    window.addEventListener('click', handleFirstUserInteraction);
    window.addEventListener('keydown', handleFirstUserInteraction);
    return () => {
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };
  }, [user, initAudio]);

  if (isAuthLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Verificando permissões...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
        <AdminSidebar />
        <AdminContent>
            {children}
        </AdminContent>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlarmProvider>
      <AdminLayoutController>
        {children}
      </AdminLayoutController>
    </AlarmProvider>
  );
}
