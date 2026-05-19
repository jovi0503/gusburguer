'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseApp } from './firebase';
import { toast } from '@/hooks/use-toast';

export async function uploadImage(file: File, filePath: string): Promise<string> {
    if (!file) throw new Error('Nenhum arquivo fornecido para upload.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Tipo de arquivo inválido. Apenas JPG, PNG e WEBP são permitidos.');
    }

    try {
        const app = getFirebaseApp();
        if (!app) throw new Error('Firebase não inicializado.');

        const storage = getStorage(app);
        const storageRef = ref(storage, filePath);

        await uploadBytes(storageRef, file, { contentType: file.type });
        const downloadURL = await getDownloadURL(storageRef);

        return downloadURL;

    } catch (error: any) {
        console.error("Erro no processo de upload de imagem (storage.ts):", error);
        toast({
            title: "Erro no Upload",
            description: error.message || "Não foi possível enviar a imagem. Tente novamente.",
            variant: "destructive"
        });
        throw error;
    }
}
