
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ShoppingBag, Loader2, XCircle, Plus, Minus, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  const { items, totalPrice, totalItems, updateQuantity, removeItem, clearCart, addItem } = useCartStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex justify-center items-center py-20 pt-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando carrinho...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 pt-32">
        <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-headline font-bold mb-2">Seu carrinho está vazio</h1>
        <p className="text-muted-foreground mb-6">Adicione alguns produtos para começar a beber!</p>
        <Button asChild className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90">
          <Link href="/">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-20">
      <h1 className="text-4xl font-headline font-bold mb-8 md:text-3xl">Meu Carrinho</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <Card key={item.product.id} className="flex items-center p-4">
              <div className="relative h-24 w-24">
                <Image
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  fill
                  sizes="100px"
                  className="rounded-md object-cover"
                  data-ai-hint="beverage drink"
                />
              </div>
              <div className="ml-4 flex-grow">
                <p className="font-semibold">{item.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1 border rounded-lg">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                     <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => addItem(item.product)} disabled={item.quantity >= item.product.stock}>
                        <Plus className="h-4 w-4" />
                    </Button>
                 </div>
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id)} className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-9 w-9">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))}
            <div className="mt-4 flex justify-between items-center gap-4">
                <Button variant="outline" asChild={true} size="lg">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        adicionar mais itens
                    </Link>
                </Button>
                <Button variant="outline" onClick={clearCart} size="lg">
                    <XCircle className="mr-2 h-4 w-4" />
                    Limpar Carrinho
                </Button>
            </div>
        </div>
        
        <aside className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="font-headline">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal ({totalItems} itens)</span>
                <span>{totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <Separator />
               <div className="flex justify-between font-medium text-muted-foreground text-sm">
                <span>Frete e taxas</span>
                <span>a calcular</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90" asChild>
                <Link href="/checkout">ir para pagamento</Link>
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </div>
  );
}
