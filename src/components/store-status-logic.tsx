

'use client';

import { useState, useEffect } from 'react';
import { getStoreSettings } from '@/lib/firestore';
import type { StoreSettings } from '@/lib/types';
import { collection, onSnapshot, doc, getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';

// Horário de Funcionamento (Fuso Horário de Salvador)
// Dia da semana: 0=Domingo, 1=Segunda, ..., 6=Sábado
const schedule = {
  0: { open: 10, close: 19 }, // Domingo: 10:00 às 19:00
  1: null,                    // Segunda (Fechado)
  2: { open: 13, close: 20 }, // Terça: 13:00 às 20:00
  3: { open: 13, close: 20 }, // Quarta: 13:00 às 20:00
  4: { open: 13, close: 20 }, // Quinta: 13:00 às 20:00
  5: { open: 13, close: 20 }, // Sexta: 13:00 às 20:00
  6: { open: 10, close: 20 }, // Sábado: 10:00 às 20:00
};

type AutomaticStatus = 'open' | 'closed';
type EffectiveStatus = 'open' | 'closed';

/**
 * Hook customizado para gerenciar o status da loja,
 * combinando a programação automática com o controle manual do admin.
 */
export const useStoreStatus = () => {
    const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState<Date | null>(null); // Inicia como null

    const app = getFirebaseApp();

    // Listener para as configurações da loja em tempo real
    useEffect(() => {
        if (!app) {
            setLoading(false);
            return;
        }
        const db = getFirestore(app);
        const settingsDocRef = doc(db, 'store_settings', 'status');
        
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setStoreSettings(doc.data() as StoreSettings);
            } else {
                setStoreSettings({ isManuallyOpen: null }); // Padrão para automático
            }
            setLoading(false);
        }, (error) => {
            console.error("Erro ao ouvir as configurações da loja:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [app]);
    
    // Atualiza a hora atual a cada minuto, mas só no cliente
    useEffect(() => {
        // Define a hora inicial assim que o componente monta no cliente
        setCurrentTime(new Date());

        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // 1 minuto
        return () => clearInterval(timer);
    }, []);

    // --- LÓGICA DE STATUS ---
    
    // 1. Calcula o status automático com base no horário
    const getAutomaticStatus = (): { status: AutomaticStatus, message: string } => {
        // Se currentTime ainda for null, significa que estamos no SSR ou no primeiro render do cliente
        if (!currentTime) {
            return { status: 'closed', message: 'Verificando horário...' };
        }

        // Obtém a data e hora no fuso horário de Salvador/Bahia
        const now = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const currentDay = now.getDay();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        
        const daySchedule = schedule[currentDay as keyof typeof schedule];

        if (!daySchedule) { // Dia fechado (ex: Segunda)
             // Encontra o próximo dia de abertura
            for (let i = 1; i <= 7; i++) {
                const nextDayIndex = (currentDay + i) % 7;
                const nextDaySchedule = schedule[nextDayIndex as keyof typeof schedule];
                if (nextDaySchedule) {
                    const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][nextDayIndex];
                    return { status: 'closed', message: `Abre ${dayName} às ${nextDaySchedule.open}:00.` };
                }
            }
            return { status: 'closed', message: 'Fechado no momento.' };
        }

        const { open, close } = daySchedule;

        if (currentHour >= open && currentHour < close) { // Aberto agora
             const closingSoonHour = close - 1; // 1 hora antes de fechar
             if (currentHour >= closingSoonHour) {
                const minutesLeft = Math.round((close - currentHour) * 60);
                return { status: 'open', message: `Fecha em ${minutesLeft} min.` };
            }
            return { status: 'open', message: `Aberto até às ${close}:00.` };
        } else { // Fechado (antes de abrir ou depois de fechar)
             // Encontra o próximo dia de abertura
            for (let i = 0; i <= 7; i++) { // Começa em 'i = 0' para checar se abre mais tarde no mesmo dia
                const nextDayIndex = (currentDay + i) % 7;
                const nextDaySchedule = schedule[nextDayIndex as keyof typeof schedule];
                
                // Se estamos no mesmo dia mas antes do horário de abertura
                if (i === 0 && currentHour < open && nextDaySchedule) {
                    const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][nextDayIndex];
                    return { status: 'closed', message: `Abre hoje às ${nextDaySchedule.open}:00.` };
                }
                
                // Se não for hoje, procura o próximo dia com horário
                if (i > 0 && nextDaySchedule) {
                    const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][nextDayIndex];
                    return { status: 'closed', message: `Abre ${dayName} às ${nextDaySchedule.open}:00.` };
                }
            }
            return { status: 'closed', message: 'Fechado no momento.' };
        }
    };

    const { status: automaticStatus, message: scheduleMessage } = getAutomaticStatus();

    // 2. Determina o status final (efetivo)
    const getEffectiveStatus = (): EffectiveStatus => {
        // Se ainda não temos o tempo, assumimos fechado para segurança
        if (!currentTime) return 'closed';

        // Se o admin definiu manualmente, esse status tem prioridade
        if (storeSettings?.isManuallyOpen !== null && storeSettings?.isManuallyOpen !== undefined) {
            return storeSettings.isManuallyOpen ? 'open' : 'closed';
        }
        // Caso contrário, usa o status automático baseado no horário
        return automaticStatus;
    };
    
    const effectiveStatus = getEffectiveStatus();

    return {
        loading: loading || !currentTime, // Considera carregando se a hora ainda não foi definida
        storeSettings,
        automaticStatus,
        scheduleMessage,
        effectiveStatus
    };
};
