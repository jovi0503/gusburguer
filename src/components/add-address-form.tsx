
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Address } from '@/lib/types';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

const addressSchema = z.object({
  street: z.string().min(1, 'Rua é obrigatória'),
  number: z.string().min(1, 'Número é obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado deve ter 2 letras').max(2, 'Estado deve ter 2 letras'),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddAddressFormProps {
    onSave: (addressData: Omit<Address, 'id'>) => void;
    onCancel: () => void;
    initialData?: Omit<Address, 'id'> | null;
}

export function AddAddressForm({ onSave, onCancel, initialData }: AddAddressFormProps) {
    const [isClient, setIsClient] = useState(false);

    const form = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: initialData || {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: 'Salvador',
            state: 'BA',
        }
    });

    useEffect(() => {
        // This ensures the form is only rendered on the client, avoiding hydration errors from browser autofill.
        setIsClient(true);
        form.reset(initialData || {
            street: '', number: '', complement: '',
            neighborhood: '', city: 'Salvador', state: 'BA',
        });
    }, [initialData, form]);
    
    const { isSubmitting } = form.formState;

    const onSubmit = (data: AddressFormData) => {
        // Padroniza o nome do bairro para a lógica de frete
        const normalizedData = {
            ...data,
            neighborhood: data.neighborhood
                .trim() // Remove espaços no início e no fim
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
        };
        onSave(normalizedData);
    };
    
    const renderSkeleton = () => (
         <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                     <Skeleton className="h-4 w-1/4" />
                     <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                     <Skeleton className="h-4 w-1/2" />
                     <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </div>
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">{initialData ? 'Editar Endereço' : 'Adicionar Novo Endereço'}</DialogTitle>
        <DialogDescription>
          Preencha os dados abaixo para agilizar a entrega dos seus pedidos.
        </DialogDescription>
      </DialogHeader>

       <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                {isClient ? (
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="street" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Rua / Avenida</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="number" render={({ field }) => ( <FormItem> <FormLabel>Número</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>

                        <FormField control={form.control} name="complement" render={({ field }) => ( <FormItem> <FormLabel>Complemento (opcional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField control={form.control} name="neighborhood" render={({ field }) => ( <FormItem> <FormLabel>Bairro</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="city" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Cidade</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            <FormField control={form.control} name="state" render={({ field }) => ( <FormItem> <FormLabel>Estado</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        </div>
                    </div>
                 ) : renderSkeleton()}

                 <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting || !isClient}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Endereço
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    </>
  );
}
