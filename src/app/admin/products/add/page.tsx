
'use client';

import { useState, useEffect, useRef, type ChangeEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { addProduct, getCategories } from '@/lib/firestore';
import type { Category } from '@/lib/types';

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

function AddProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preselectedCategory = searchParams.get('category');

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: preselectedCategory || '',
      stock: 0,
      onSale: false,
      isActive: true,
    },
  });

   useEffect(() => {
    async function fetchCategories() {
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        toast({ title: "Erro", description: "Não foi possível carregar as categorias.", variant: "destructive" });
      }
    }
    fetchCategories();
  }, [toast]);
  
  // Set default category if it comes from URL param
  useEffect(() => {
    if (preselectedCategory) {
      form.setValue('category', preselectedCategory);
    }
  }, [preselectedCategory, form]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation for file type
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
    setImagePreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    if (!imageFile) {
      toast({
        title: 'Imagem faltando',
        description: 'Por favor, selecione uma imagem para o produto.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Generate a unique filename
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `products/${fileName}`;

      // 2. Upload image using the new signed URL method
      const imageUrl = await uploadImage(imageFile, filePath);

      // 3. Create product data object
      const productData = {
        ...data,
        imageUrl,
      };

      // 4. Save product to Firestore
      await addProduct(productData);

      toast({
        title: 'Produto Adicionado!',
        description: `${data.name} foi adicionado com sucesso ao catálogo.`,
      });

      router.push('/admin/products');

    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível adicionar o produto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Produtos
      </Link>
      <h1 className="text-3xl font-bold font-headline mb-8">Adicionar Novo Produto</h1>
      
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
                    Salvar Produto
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}

export default function AddProductPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <AddProductForm />
        </Suspense>
    )
}
