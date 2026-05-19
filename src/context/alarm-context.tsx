
'use client';

import React, { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';

// --- Tipagem do Contexto ---
interface AlarmContextType {
    isRinging: boolean;
    startRinging: () => void;
    stopRinging: () => void;
    initAudio: () => void;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

// --- Componente Provedor ---
interface AlarmProviderProps {
  children: ReactNode;
}

export const AlarmProvider: React.FC<AlarmProviderProps> = ({ children }) => {
    const [isRinging, setIsRinging] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isInitialized = useRef(false);

    /**
     * Toca e pausa o som rapidamente no primeiro gesto do usuário.
     * Isso "autoriza" o áudio para tocar programaticamente depois.
     */
    const initAudio = useCallback(() => {
        // Evita múltiplas inicializações
        if (isInitialized.current || typeof window === 'undefined') return;

        console.log('[DEBUG] initAudio chamado pela primeira vez.');

        // Cria o elemento de áudio se ele não existir
        if (!audioRef.current) {
            audioRef.current = new Audio('/sounds/alarm.mp3');
            audioRef.current.loop = true;
        }
        
        const audio = audioRef.current;
        // O truque é tocar e pausar um som silencioso ou o próprio alarme no volume 0
        // para obter a permissão do navegador.
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Pausa imediatamente após o play ter sucesso.
                audio.pause();
                console.log('[DEBUG] Audio element inicializado e pausado pelo gesto do usuário.');
                isInitialized.current = true; // Marca como inicializado COM SUCESSO
            }).catch(error => {
                console.error('[DEBUG] Tentativa de play inicial falhou:', error);
                // Não marcamos como inicializado se falhar, para que outra interação possa tentar.
            });
        } else {
             // Se playPromise for undefined, algo está muito errado, mas tentamos na próxima.
             console.warn('[DEBUG] audio.play() não retornou uma promise.');
        }
    }, []);

    const startRinging = useCallback(() => {
        if (!isInitialized.current || !audioRef.current) {
            console.warn('[DEBUG] Tentativa de tocar alarme falhou: não inicializado.');
            // Opcional: Adicionar um alerta visual aqui como fallback
            return;
        }
        
        console.log('[DEBUG] Alarme sonoro iniciado.');
        audioRef.current.play().catch(error => console.error("Erro ao tentar tocar o alarme:", error));
        setIsRinging(true);
    }, []);

    const stopRinging = useCallback(() => {
        if (!audioRef.current) return;

        console.log('[DEBUG] Alarme sonoro parado.');
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsRinging(false);
    }, []);

    const contextValue = { isRinging, startRinging, stopRinging, initAudio };

    return (
        <AlarmContext.Provider value={contextValue}>
            {children}
        </AlarmContext.Provider>
    );
};

// --- Hook para usar o contexto ---
export const useAlarm = () => {
    const context = useContext(AlarmContext);
    if (context === undefined) {
        throw new Error('useAlarm deve ser usado dentro de um AlarmProvider');
    }
    return context;
};
