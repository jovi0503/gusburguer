
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getProducts, deleteProduct, updateProduct } from '@/lib/firestore';
import type { Product } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Loader2, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const fetchedProducts = await getProducts();
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleActiveToggle = async (productId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setProducts(prevProducts =>
      prevProducts.map(p =>
        p.id === productId ? { ...p, isActive: !currentStatus } : p
      )
    );

    try {
      await updateProduct(productId, { isActive: !currentStatus });
      toast({
        title: "Status do produto atualizado!",
        description: `O produto está agora ${!currentStatus ? 'ativo' : 'inativo'} no catálogo.`,
      });
    } catch (error) {
      // Revert UI on error
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId ? { ...p, isActive: currentStatus } : p
        )
      );
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o status do produto. Tente novamente.",
        variant: "destructive",
      });
      console.error("Erro ao atualizar status do produto:", error);
    }
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
        await deleteProduct(productToDelete.id);
        setProducts(products.filter(p => p.id !== productToDelete.id));
        toast({
            title: "Produto Excluído!",
            description: `${productToDelete.name} foi removido com sucesso.`,
        });
    } catch(error) {
        toast({
            title: "Erro ao excluir",
            description: "Não foi possível remover o produto. Tente novamente.",
            variant: "destructive",
        });
        console.error("Erro ao excluir produto:", error);
    } finally {
        setIsDeleting(false);
        setProductToDelete(null);
    }
  }

  const filteredProducts = categoryFilter
    ? products.filter(p => p.category === categoryFilter)
    : products;

  const addProductHref = categoryFilter
    ? `/admin/products/add?category=${encodeURIComponent(categoryFilter)}`
    : '/admin/products/add';


  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">{categoryFilter || 'Todos os Produtos'}</h1>
        <Button asChild>
          <Link href={addProductHref}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Produto
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image src={product.imageUrl} alt={product.name} width={48} height={48} className="rounded-md object-cover" />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                   <TableCell>
                      <div className="flex items-center space-x-2">
                         <Switch
                          id={`active-${product.id}`}
                          checked={product.isActive ?? true}
                          onCheckedChange={() => handleActiveToggle(product.id, product.isActive ?? true)}
                          aria-label={`Ativar produto ${product.name}`}
                        />
                         <Label htmlFor={`active-${product.id}`} className={product.isActive ?? true ? 'text-green-500' : 'text-destructive'}>
                           {product.isActive ?? true ? 'Ativo' : 'Inativo'}
                        </Label>
                      </div>
                    </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem asChild>
                           <Link href={`/admin/products/edit/${product.id}`}><Pencil className="mr-2 h-4 w-4" />Editar</Link>
                         </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                           <Trash2 className="mr-2 h-4 w-4" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 text-muted-foreground" />
                          <span className="text-muted-foreground">Nenhum produto encontrado.</span>
                       </div>
                    </TableCell>
                  </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
       <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o produto <strong>{productToDelete?.name}</strong> do catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function AdminProductsPage() {
    return (
        <Suspense fallback={<Loader2 className="animate-spin" />}>
            <ProductsContent />
        </Suspense>
    )
}
