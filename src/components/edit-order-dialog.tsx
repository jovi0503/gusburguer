
'use client';

import { useState, useEffect } from 'react';
import type { Order, Product, OrderItemProduct } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Trash2, PlusCircle, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface EditOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: Order;
  allProducts: Product[];
  onSave: (updatedItems: { product: OrderItemProduct; quantity: number }[]) => void;
  isSaving: boolean;
}

export function EditOrderDialog({ isOpen, onOpenChange, order, allProducts, onSave, isSaving }: EditOrderDialogProps) {
  const [editedItems, setEditedItems] = useState<{ product: OrderItemProduct; quantity: number }[]>([]);
  const [productToAdd, setProductToAdd] = useState<string>('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  useEffect(() => {
    if (order) {
      setEditedItems(order.items);
    }
  }, [order]);

  const handleAddItem = () => {
    if (!productToAdd) return;

    const product = allProducts.find(p => p.id === productToAdd);
    if (!product) return;
    
    // Simplified product data for the order
    const orderProduct: OrderItemProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category
    };

    setEditedItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { product: orderProduct, quantity: 1 }];
    });
    setProductToAdd(''); // Reset combobox
  };

  const handleRemoveItem = (productId: string) => {
    setEditedItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }
    setEditedItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };
  
  const newSubtotal = editedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const newTotal = newSubtotal + (order?.shippingCost ?? 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Pedido #{order?.id.substring(0, 8).toUpperCase()}</DialogTitle>
          <DialogDescription>
            Adicione, remova ou altere a quantidade dos itens do pedido. O valor total será recalculado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Seção para adicionar novos produtos */}
           <div className="flex gap-2 items-center">
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className="w-full justify-between flex-grow"
                >
                  {productToAdd
                    ? allProducts.find((p) => p.id === productToAdd)?.name
                    : "Selecione um produto para adicionar..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Pesquisar produto..." />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      {allProducts.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => {
                            setProductToAdd(p.id);
                            setIsComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              productToAdd === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button onClick={handleAddItem} size="icon" disabled={!productToAdd}>
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>

          {/* Lista de itens editáveis */}
          <ScrollArea className="h-[300px] border rounded-md p-4">
            {editedItems.length > 0 ? (
              <div className="space-y-4">
                {editedItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4">
                    <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="rounded-md" />
                    <div className="flex-grow">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">{item.product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value, 10))}
                          className="w-16 h-9 text-center"
                          min="0"
                      />
                       <Button variant="outline" size="icon" onClick={() => handleRemoveItem(item.product.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">Nenhum item no pedido.</p>
            )}
          </ScrollArea>
          
           {/* Resumo dos valores */}
           <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span> <span>{newSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Frete</span> <span>{(order?.shippingCost ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Novo Total</span> <span>{newTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
           </div>

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
          <Button onClick={() => onSave(editedItems)} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
