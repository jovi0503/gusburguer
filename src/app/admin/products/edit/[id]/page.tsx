
'use client';

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/lib/storage';
import { getProductById, updateProduct, getCategories } from '@/lib/firestore';
import type { Product, Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

// Zod schema for form validation
const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  price: z.coerce.number().min(0.01, 'O preço deve ser maior que zero'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  stock: z.coerce.number().int().min(0, 'Estoque não pode ser negativo'),
  onSale: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id: productId } = params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: '',
      stock: 0,
      onSale: false,
      isActive: true,
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [fetchedProduct, fetchedCategories] = await Promise.all([
          getProductById(productId),
          getCategories()
        ]);
        
        setCategories(fetchedCategories);

        if (fetchedProduct) {
          setProduct(fetchedProduct);
          // Ensure isActive defaults to true if it's undefined
          form.reset({ ...fetchedProduct, isActive: fetchedProduct.isActive ?? true });
          setImagePreview(fetchedProduct.imageUrl);
        } else {
          toast({ title: "Erro", description: "Produto não encontrado.", variant: "destructive" });
          router.push('/admin/products');
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os dados para edição.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [productId, router, toast, form]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast({
          title: 'Tipo de arquivo inválido',
          description: 'Por favor, selecione um arquivo JPG ou PNG.',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };
  
  const clearImage = () => {
    setImageFile(null);
    // On edit, clearing the "new" image should revert the preview to the original image
    if (product) {
      setImagePreview(product.imageUrl);
    } else {
      setImagePreview(null);
    }
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      let imageUrl = product?.imageUrl;

      // 1. If there's a new image file, upload it
      if (imageFile) {
        const fileExtension = imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `products/${fileName}`;
        imageUrl = await uploadImage(imageFile, filePath);
      }
      
      if (!imageUrl) {
        toast({ title: 'Erro de Imagem', description: 'A imagem do produto é obrigatória.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // 2. Create product data object
      const productDataToUpdate = {
        ...data,
        imageUrl,
      };

      // 3. Update product in Firestore
      await updateProduct(productId, productDataToUpdate);

      toast({
        title: 'Produto Atualizado!',
        description: `${data.name} foi atualizado com sucesso.`,
      });

      router.push('/admin/products');

    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o produto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
        <div>
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-12 w-1/2 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8"><Skeleton className="h-80 w-full" /></div>
                <div className="lg:col-span-2"><Skeleton className="h-[500px] w-full" /></div>
            </div>
        </div>
    )
  }

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Produtos
      </Link>
      <h1 className="text-3xl font-bold font-headline mb-8">Editar Produto</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna da Esquerda: Imagem e Detalhes */}
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader><CardTitle>Imagem do Produto</CardTitle></CardHeader>
                        <CardContent>
                             <div className="space-y-2">
                                <label 
                                    className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                                >
                                    <Input 
                                        id="file-upload"
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/png, image/jpeg"
                                        onChange={handleFileChange}
                                        disabled={isSubmitting}
                                    />
                                    {imagePreview ? (
                                        <>
                                            <Image src={imagePreview} alt="Preview" fill className="object-cover rounded-lg" />
                                            {imageFile && ( // Only show the 'X' if a *new* file has been selected
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-6 w-6 z-10"
                                                    onClick={(e) => { e.preventDefault(); clearImage(); }}
                                                    disabled={isSubmitting}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                            <Upload className="w-10 h-10 mb-3" />
                                            <p className="mb-2 text-sm">
                                                <span className="font-semibold">Clique para enviar</span> ou arraste
                                            </p>
                                            <p className="text-xs">PNG, JPG (MAX. 2MB)</p>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Coluna da Direita: Campos do Formulário */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Detalhes do Produto</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome</FormLabel> <FormControl><Input {...field} placeholder="Ex: Cerveja Heineken" disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Descrição</FormLabel> <FormControl><Textarea {...field} placeholder="Descrição curta e atrativa do produto" disabled={isSubmitting}/></FormControl> <FormMessage /> </FormItem> )} />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="price" render={({ field }) => ( <FormItem> <FormLabel>Preço (R$)</FormLabel> <FormControl><Input type="number" step="0.01" {...field} disabled={isSubmitting}/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="stock" render={({ field }) => ( <FormItem> <FormLabel>Estoque</FormLabel> <FormControl><Input type="number" {...field} disabled={isSubmitting}/></FormControl> <FormMessage /> </FormItem> )} />
                            </div>
                             <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoria</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma categoria" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="isActive" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Produto Ativo</FormLabel>
                                        <FormDescription>Desative para ocultar o produto do catálogo de clientes.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting}/>
                                    </FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="onSale" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Produto em Oferta</FormLabel>
                                        <FormDescription>Ative se este produto deve aparecer na página de ofertas.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting}/>
                                    </FormControl>
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
