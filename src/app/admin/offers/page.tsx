
'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import { getProducts, updateProduct } from '@/lib/firestore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function AdminOffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const allProducts = await getProducts();
        setProducts(allProducts);
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os produtos.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [toast]);

  const handleOfferToggle = async (productId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, onSale: !currentStatus } : p
      )
    );

    try {
      await updateProduct(productId, { onSale: !currentStatus });
      toast({
        title: "Status da oferta atualizado!",
        description: `O produto agora está ${!currentStatus ? 'em oferta' : 'sem oferta'}.`,
      });
    } catch (error) {
      // Revert UI on error
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId ? { ...p, onSale: currentStatus } : p
        )
      );
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o status da oferta. Tente novamente.",
        variant: "destructive",
      });
      console.error("Erro ao atualizar oferta:", error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold font-headline mb-8">Gerenciar Ofertas</h1>
      <p className="text-muted-foreground mb-6">Ative ou desative produtos que aparecerão na página de ofertas.</p>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="text-right">Em Oferta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              products.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image src={product.imageUrl} alt={product.name} width={48} height={48} className="rounded-md object-cover" />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                       <Switch
                        id={`offer-${product.id}`}
                        checked={product.onSale}
                        onCheckedChange={() => handleOfferToggle(product.id, !!product.onSale)}
                        aria-label={`Ativar oferta para ${product.name}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
