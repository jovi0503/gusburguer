
'use client';

import Image from 'next/image';
import { PlusCircle, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { addItem, items } = useCartStore();
  const { toast } = useToast();

  const cartItem = items.find(item => item.product.id === product.id);
  const currentQuantityInCart = cartItem?.quantity || 0;
  const isOutOfStock = currentQuantityInCart >= product.stock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); 
    
    addItem(product);
  };

  return (
     <Card className={cn("group overflow-hidden transition-all duration-300 hover:shadow-lg bg-card flex flex-col", className)}>
        {/* Imagem do Produto */}
        <div className="relative w-full h-32 md:h-40">
            <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint={`${product.category}`}
            />
        </div>

        {/* Informações do Produto */}
        <div className="flex-1 flex flex-col p-3">
            <div className="flex-grow mb-2">
                <h3 className="font-bold font-headline leading-tight text-sm md:text-base line-clamp-2">{product.name}</h3>
                {/* <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden md:block">{product.description}</p> */}
            </div>
            
            <p className="text-base md:text-lg font-bold text-primary mb-2">
                {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            
            <Button 
                onClick={handleAddToCart}
                size="sm"
                className="w-full rounded-full font-bold mt-auto"
                disabled={isOutOfStock}
                aria-label={isOutOfStock ? 'Esgotado' : `Adicionar ${product.name} ao carrinho`}
            >
                {isOutOfStock ? 'Esgotado' : 'Adicionar'}
            </Button>
        </div>
    </Card>
  );
}
