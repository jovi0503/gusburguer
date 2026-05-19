
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Home, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function SuccessPageContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    if (!orderId) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20">
                <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
                <h1 className="text-2xl font-bold font-headline">Carregando detalhes...</h1>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
            <Card className="w-full max-w-md text-center">
                <CardHeader className="items-center">
                    <CheckCircle2 className="h-20 w-20 text-green-500 mb-4" />
                    <CardTitle className="text-3xl font-headline text-primary">Pedido Recebido!</CardTitle>
                    <CardDescription className="max-w-xs mx-auto">
                        Seu pedido <strong>#{orderId.substring(0, 8).toUpperCase()}</strong> foi recebido e já está sendo preparado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Você pode acompanhar o status em tempo real na tela de "Meus Pedidos".
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button asChild className="w-full" size="lg">
                        <Link href={`/orders`}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Acompanhar Pedido
                        </Link>
                    </Button>
                     <Button asChild variant="outline" className="w-full">
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Voltar para o Início
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
            <SuccessPageContent />
        </Suspense>
    );
}

    