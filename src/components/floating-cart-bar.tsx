
'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cart';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';

export default function FloatingCartBar() {
    const { totalItems, totalPrice, isHydrated } = useCartStore();
    
    // isHydrated garante que o componente só renderize no lado do cliente,
    // e depois que o estado do zustand for recuperado do localStorage.
    if (!isHydrated || totalItems === 0) {
        return null;
    }

    return (
        <div 
            className={cn(
                "md:hidden fixed bottom-16 left-0 right-0 z-40", // Mostra apenas em mobile, posicionado acima da nav
                "bg-background border-t shadow-lg",
                "animate-in slide-in-from-bottom-5 duration-300 ease-out"
            )}
        >
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <ShoppingBag className="h-6 w-6 text-primary" />
                    <div>
                        <p className="font-bold text-lg">{totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        <p className="text-xs text-muted-foreground">{totalItems} {totalItems > 1 ? 'itens' : 'item'}</p>
                    </div>
                </div>
                <Button asChild size="default" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full">
                    <Link href="/cart">
                        Ver Sacola
                    </Link>
                </Button>
            </div>
        </div>
    );
}
