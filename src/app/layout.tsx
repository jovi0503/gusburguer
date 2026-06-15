

'use client';

import type { Metadata } from 'next';
import { Poppins, PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '600', '700'],
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pt-sans',
  weight: ['400', '700'],
});

function FirebaseConfigError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="max-w-md">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-headline font-bold text-destructive">Erro de Configuração do Firebase</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          As chaves de configuração do Firebase não foram encontradas. O aplicativo não pode funcionar sem elas.
        </p>
        <div className="bg-muted p-4 rounded-lg text-left text-sm">
          <p className="font-semibold mb-2">Ação Necessária:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Encontre o arquivo chamado <code className="font-mono bg-card p-1 rounded">.env</code> na raiz do seu projeto.</li>
            <li>Abra o arquivo e preencha as variáveis de ambiente com as credenciais do seu projeto Firebase.</li>
            <li>
              <span className="font-bold">MUITO IMPORTANTE:</span> Após salvar o arquivo <code className="font-mono bg-card p-1 rounded">.env</code>, você <span className="underline">precisa</span> reiniciar o servidor de desenvolvimento para que as alterações tenham efeito.
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Consulte o arquivo <code className="font-mono bg-card p-1 rounded">README.md</code> para instruções detalhadas.</p>
        </div>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [isClient, setIsClient] = useState(false);
  

  useEffect(() => {
    setIsClient(true);
    // Verifica se a chave de API existe. Isso determina se o Firebase está configurado.
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      setIsFirebaseConfigured(true);
    }
  }, []);

  if (!isClient) {
    // Renderiza um loader ou nada durante o Server-Side Rendering para evitar flash
    return (
       <html lang="en" className={`${poppins.variable} ${ptSans.variable} dark`}>
          <body></body>
       </html>
    )
  }

  if (!isFirebaseConfigured) {
    return (
       <html lang="en" className={`${poppins.variable} ${ptSans.variable} dark`}>
         <body><FirebaseConfigError /></body>
      </html>
    );
  }

  return (
    <html lang="en" className={`${poppins.variable} ${ptSans.variable} dark`}>
      <head>
        <title>Gus Burguer</title>
        <meta name="description" content="Hambúrgueres artesanais na sua porta" />
        <link rel="icon" type="image/svg+xml" href="/images/logo.svg" />
        <link rel="icon" type="image/png" href="/images/logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased bg-background text-foreground pb-32 md:pb-0">
        <div className="flex flex-col min-h-screen">
            {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
