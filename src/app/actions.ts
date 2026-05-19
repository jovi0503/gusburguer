
'use server';

import type { Address, Order, OrderStatus } from "@/lib/types";
import * as admin from 'firebase-admin';

// ===================================================================
// LÓGICA DE INICIALIZAÇÃO DO FIREBASE ADMIN
// ===================================================================

/**
 * Inicializa o Firebase Admin SDK de forma robusta e idempotente.
 * Detecta automaticamente o ambiente (local vs. App Hosting) e usa as
 * credenciais apropriadas.
 */
function initializeFirebaseAdmin() {
    // Se o app já foi inicializado, retorna a instância existente para evitar erros.
    if (admin.apps.length > 0 && admin.apps[0]) {
        return admin.apps[0];
    }
    
    // Em produção (App Hosting), as credenciais são injetadas automaticamente
    // via variáveis de ambiente. O `initializeApp()` sem argumentos funciona.
    // Em desenvolvimento local, ele usa as credenciais do `firebase login`.
    console.log("--- [SERVER ACTION] Inicializando Firebase Admin SDK... ---");
    return admin.initializeApp();
}

// Inicializa o app imediatamente
const adminApp = initializeFirebaseAdmin();
const adminDb = admin.firestore(adminApp);
const adminStorage = admin.storage(adminApp);


// ===================================================================
// CONFIGURAÇÃO DA LÓGICA DE FRETE (DINÂMICO POR BAIRRO)
// ===================================================================

const FRETE_PROMOCIONAL = 5.99;
const FRETE_PADRAO = 9.99;
const UNAVAILABLE_SHIPPING_COST = -1;

/**
 * Calcula o custo de frete com base no bairro do cliente.
 * Se o bairro for 'pernambues', aplica o frete promocional.
 * Caso contrário, aplica o frete padrão.
 * @param address - O endereço de destino do cliente.
 * @returns O custo do frete calculado.
 */
export async function calculateShippingAction(address: Address): Promise<number> {
    console.log(`--- [SERVER ACTION] Calculando frete para o bairro: ${address?.neighborhood}`);
    
    if (!address || !address.neighborhood) {
        console.error('--- [SERVER ACTION] ERRO: Endereço ou bairro não fornecido.');
        return UNAVAILABLE_SHIPPING_COST;
    }

    const bairro = address.neighborhood.toLowerCase().trim();
    
    if (bairro === 'pernambues') {
        console.log(`--- [SERVER ACTION] Bairro promocional detectado. Frete: R$ ${FRETE_PROMOCIONAL}`);
        return FRETE_PROMOCIONAL;
    } else {
        console.log(`--- [SERVER ACTION] Bairro padrão. Frete: R$ ${FRETE_PADRAO}`);
        return FRETE_PADRAO;
    }
}


/**
 * Server Action para lidar com uploads de arquivos do cliente de forma segura.
 * Usa o SDK Admin para fazer o upload, eliminando a necessidade de regras
 * de segurança complexas no lado do cliente para o Storage.
 */
export async function uploadFileAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const bucket = adminStorage.bucket();

        const file = formData.get('file') as File | null;
        const filePath = formData.get('filePath') as string | null;

        if (!file || !filePath) {
            throw new Error('Arquivo ou caminho do arquivo não fornecido.');
        }

        console.log(`--- [SERVER ACTION] Recebido arquivo '${file.name}' para o caminho: ${filePath}`);

        const buffer = Buffer.from(await file.arrayBuffer());

        const fileRef = bucket.file(filePath);

        // Salva o arquivo no bucket
        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });
        
        // Torna o arquivo público para leitura
        await fileRef.makePublic();

        // Obtém a URL pública
        const publicUrl = fileRef.publicUrl();

        console.log(`--- [SERVER ACTION] Upload concluído. URL Pública: ${publicUrl}`);

        return { success: true, url: publicUrl };

    } catch (error: any) {
        console.error("--- [SERVER ACTION] Erro no uploadFileAction:", error);
        return { success: false, error: error.message || "Falha ao fazer upload do arquivo." };
    }
}

/**
 * Server Action segura para que um cliente cancele um pedido.
 */
export async function cancelOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const orderDocRef = adminDb.collection('orders').doc(orderId);

    const doc = await orderDocRef.get();
    if (!doc.exists) {
      return { success: false, error: 'Pedido não encontrado.' };
    }

    const newStatusEntry = {
      status: 'cancelled' as OrderStatus,
      timestamp: Date.now(),
    };

    await orderDocRef.update({
      status: 'cancelled',
      statusHistory: admin.firestore.FieldValue.arrayUnion(newStatusEntry)
    });
    
    console.log(`--- [SERVER ACTION] Pedido ${orderId} cancelado com sucesso. ---`);
    return { success: true };

  } catch (error: any) {
    console.error(`--- [SERVER ACTION] Erro ao cancelar pedido ${orderId}:`, error);
    return { success: false, error: error.message || 'Falha ao cancelar o pedido.' };
  }
}
