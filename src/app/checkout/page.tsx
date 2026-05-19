
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { useUserStore } from '@/store/user';
import { addOrder } from '@/lib/firestore';
import type { Order, Address, OrderItemProduct, LocalUser } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, User as UserIcon, Phone, PlusCircle, Home, Building, CreditCard, DollarSign, PowerOff, AlertCircle, ArrowLeft, CheckCircle2, Truck, ShoppingBag as ShoppingBagIcon, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddAddressForm } from '@/components/add-address-form';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { calculateShippingAction } from '@/app/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useStoreStatus } from '@/components/store-status-logic';


const UNAVAILABLE_SHIPPING_COST = -1;
const PICKUP_ADDRESS_ID = 'pickup';

export default function CheckoutPage() {
    const { items, totalPrice, isHydrated, clearCart } = useCartStore();
    const { user, addresses, setUser, addAddress, updateAddress, orderIds, addOrderId } = useUserStore();
    const router = useRouter();
    const { toast } = useToast();
    
    const { effectiveStatus, loading: loadingStoreSettings } = useStoreStatus();

    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [deliveryOption, setDeliveryOption] = useState<'delivery' | 'pickup'>('delivery');
    const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | undefined>(undefined);
    const [changeFor, setChangeFor] = useState('');
    
    const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
    const [addressToEdit, setAddressToEdit] = useState<Omit<Address, 'nickname'> | null>(null);

    const [shippingCost, setShippingCost] = useState<number | null>(null);
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
    const [shippingError, setShippingError] = useState<string | null>(null);

    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [lastOrderId, setLastOrderId] = useState<string | null>(null);
    
    // Set default address selection
    useEffect(() => {
        if (addresses && addresses.length > 0 && !selectedAddressId) {
            setSelectedAddressId(addresses[0].id);
        }
    }, [addresses, selectedAddressId]);
    

    useEffect(() => {
        if (isHydrated && items.length === 0 && !isSuccessDialogOpen) {
            router.replace('/cart');
        }
    }, [items.length, router, isHydrated, isSuccessDialogOpen]);
    
    
    useEffect(() => {
        const calculateShipping = async () => {
            if (deliveryOption === 'pickup') {
                setShippingCost(0);
                setShippingError(null);
                return;
            }

            if (!selectedAddressId || !addresses) {
                setShippingCost(null);
                return;
            }

            const selectedAddress = addresses.find(a => a.id === selectedAddressId);
            if (!selectedAddress) {
                setShippingCost(null);
                return;
            }
            
            setIsCalculatingShipping(true);
            setShippingError(null);
            
            try {
                const cost = await calculateShippingAction(selectedAddress);
                
                if (cost === UNAVAILABLE_SHIPPING_COST) {
                     setShippingError('Desculpe, a entrega não está disponível para este endereço.');
                     setShippingCost(null);
                } else {
                    setShippingCost(cost);
                }
            } catch (error) {
                console.error("Erro ao calcular frete:", error);
                setShippingError('Não foi possível calcular o frete. Tente novamente.');
                setShippingCost(null);
            } finally {
                 setIsCalculatingShipping(false);
            }
        };

        calculateShipping();
    }, [selectedAddressId, addresses, deliveryOption]);


    const handleAddressSelection = (addressId: string) => {
        setSelectedAddressId(addressId);
    };

     const handleSaveAddress = (addressData: Omit<Address, 'id'>) => {
        if (addressToEdit) {
            // Update existing address
            const updatedAddress: Address = { ...addressToEdit, ...addressData, id: addressToEdit.id };
            updateAddress(updatedAddress);
            toast({
                title: 'Endereço Atualizado!',
                description: 'Seu endereço foi atualizado com sucesso.',
            });
        } else {
            // Add new address
            const newAddress: Address = { 
                ...addressData, 
                id: uuidv4(),
            };
            addAddress(newAddress);
            setSelectedAddressId(newAddress.id);
            toast({
                title: 'Endereço Salvo!',
                description: 'Seu novo endereço foi adicionado com sucesso.',
            });
        }
        setIsAddressDialogOpen(false);
        setAddressToEdit(null); // Reset edit state
    };
    
    const handleOpenEditDialog = (address: Address, e: React.MouseEvent) => {
        e.preventDefault(); // Prevent radio button selection
        const { nickname, ...rest } = address;
        setAddressToEdit(rest);
        setIsAddressDialogOpen(true);
    };

    const handleOpenAddDialog = () => {
        setAddressToEdit(null);
        setIsAddressDialogOpen(true);
    }
    
    const total = shippingCost !== null ? totalPrice + shippingCost : totalPrice;

    const getAddressIcon = (street: string) => {
      // Logic is simplified as we no longer have "Casa" or "Trabalho"
      return <Home className="h-5 w-5 mr-3" />;
    }

    const handlePlaceOrder = async () => {
        const isDelivery = deliveryOption === 'delivery';

        if (items.length === 0 || !user.name || !user.phone || (isDelivery && !selectedAddressId) || !paymentMethod || shippingCost === null) {
            toast({
                title: "Não foi possível fazer o pedido",
                description: "Verifique se todos os seus dados, opção de entrega e forma de pagamento foram preenchidos.",
                variant: "destructive",
            });
            return;
        }

        setIsPlacingOrder(true);
        try {
            const orderItems = items.map(item => {
                const productData: OrderItemProduct = {
                    id: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    imageUrl: item.product.imageUrl,
                    category: item.product.category,
                };
                return {
                    quantity: item.quantity,
                    product: productData,
                };
            });
            
            let shippingAddress: Address;

            if (isDelivery) {
                shippingAddress = addresses.find(a => a.id === selectedAddressId)!;
            } else {
                 shippingAddress = {
                    id: PICKUP_ADDRESS_ID,
                    street: '', number: '', neighborhood: '', city: '', state: ''
                };
            }

            const orderId = uuidv4();
            const finalTotal = totalPrice + shippingCost; 

            // Create a simple user data object for the order
            const guestUserData: LocalUser = {
                name: user.name,
                phone: user.phone,
            };

            const orderData: Omit<Order, 'statusHistory'> = {
                id: orderId,
                userId: `guest_${uuidv4()}`,
                items: orderItems,
                total: finalTotal,
                shippingCost: shippingCost,
                status: 'pending' as const,
                createdAt: Date.now(),
                shippingAddress: shippingAddress,
                paymentMethod: paymentMethod,
                user: guestUserData,
            };
            
            if (paymentMethod === 'cash' && changeFor) {
                orderData.changeFor = Number(changeFor);
            }

            await addOrder(orderData, orderId);

            // Notify the store via WhatsApp, but only if the phone number is valid
            const storePhoneNumber = '557199453692';
            const customerPhoneDigits = user.phone?.replace(/\D/g, '');
            
            if (customerPhoneDigits && customerPhoneDigits.length > 8) {
                const customerName = user.name || 'Novo Cliente';
                const orderSummary = items.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
                const notificationMessage = `*Novo Pedido Recebido!*\n\n*Cliente:* ${customerName}\n*Pedido ID:* ${orderId.substring(0, 8).toUpperCase()}\n*Itens:* ${orderSummary}\n*Total:* ${finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
                const whatsappUrl = `https://wa.me/${storePhoneNumber}?text=${encodeURIComponent(notificationMessage)}`;
                window.open(whatsappUrl, '_blank');
            } else {
                console.warn('Número de telefone do cliente inválido ou ausente. Notificação por WhatsApp para a loja não enviada.');
            }
            
            if (!orderIds.includes(orderId)) {
                addOrderId(orderId);
            }

            clearCart();
            setLastOrderId(orderId);
            setIsSuccessDialogOpen(true);

        } catch (error) {
            console.error("Erro ao finalizar pedido:", error);
            toast({
                title: "Erro ao finalizar o pedido",
                description: "Ocorreu um problema ao processar seu pedido. Tente novamente.",
                variant: "destructive",
            });
        } finally {
             setIsPlacingOrder(false);
        }
    }


    const isLoading = !isHydrated || loadingStoreSettings;
    const canPlaceOrder = 
        (deliveryOption === 'pickup' || (deliveryOption === 'delivery' && selectedAddressId)) &&
        paymentMethod && 
        user.name &&
        user.phone &&
        !isPlacingOrder && 
        items.length > 0 && 
        shippingCost !== null && 
        !isCalculatingShipping;

    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64 pt-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (effectiveStatus === 'closed' && !isSuccessDialogOpen) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20 pt-32">
                <PowerOff className="w-20 h-20 text-destructive mb-6" />
                <h1 className="text-3xl font-bold font-headline mb-3">Loja Fechada no Momento</h1>
                <p className="text-muted-foreground mb-8 max-w-md">
                    No momento, não estamos recebendo novos pedidos. Mas não se preocupe, seu carrinho está salvo!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                     <Button asChild size="lg" className="rounded-full">
                        <Link href="/">
                            Voltar para o Início
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-full">
                        <Link href="/orders">
                             Meus Pedidos
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const renderAddOrEditAddress = () => (
         <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
            <DialogTrigger asChild>
                <Button variant={addresses.length > 0 ? "outline" : "default"} onClick={handleOpenAddDialog}>
                    <span className="flex items-center">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Novo Endereço
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <AddAddressForm 
                    onSave={handleSaveAddress}
                    onCancel={() => setIsAddressDialogOpen(false)}
                    initialData={addressToEdit}
                />
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="pt-20">
            <Button asChild variant="outline" className="mb-4">
                <Link href="/cart">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para o Carrinho
                </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-headline font-bold mb-8">Finalizar Pedido</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                     {/* User Info */}
                    <Card>
                        <CardHeader><CardTitle className="font-headline">1. Seus Dados</CardTitle></CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="user-name">Nome</Label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="user-name"
                                        placeholder="Seu nome completo"
                                        value={user.name}
                                        onChange={(e) => setUser({ ...user, name: e.target.value })}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="user-phone">Telefone (WhatsApp)</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="user-phone"
                                        placeholder="(71) 99999-9999"
                                        value={user.phone}
                                        onChange={(e) => setUser({ ...user, phone: e.target.value })}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                     {/* Delivery Option */}
                     <Card>
                        <CardHeader><CardTitle className="font-headline">2. Opção de Entrega</CardTitle></CardHeader>
                        <CardContent>
                             <RadioGroup value={deliveryOption} onValueChange={(val: 'delivery' | 'pickup') => setDeliveryOption(val)} className="space-y-2">
                                <div className="flex items-center">
                                    <RadioGroupItem value="delivery" id="delivery" className="mr-3"/>
                                    <Label htmlFor="delivery" className="flex items-center border p-4 rounded-md w-full cursor-pointer hover:bg-muted/50">
                                        <Truck className="h-5 w-5 mr-3" />
                                        <span>Receber em Casa (Delivery)</span>
                                    </Label>
                                </div>
                                <div className="flex items-center">
                                    <RadioGroupItem value="pickup" id="pickup" className="mr-3"/>
                                    <Label htmlFor="pickup" className="flex items-center border p-4 rounded-md w-full cursor-pointer hover:bg-muted/50">
                                        <ShoppingBagIcon className="h-5 w-5 mr-3" />
                                        <span>Retirar no Local</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    {/* Address Selection */}
                    {deliveryOption === 'delivery' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">3. Endereço de Entrega</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {addresses.length > 0 ? (
                                    <RadioGroup value={selectedAddressId} onValueChange={handleAddressSelection} className="space-y-2">
                                        {addresses.map((address) => (
                                            <div key={address.id} className="flex items-center gap-2">
                                                <RadioGroupItem value={address.id} id={`addr_${address.id}`} className="mr-2"/>
                                                <Label htmlFor={`addr_${address.id}`} className="flex items-center border p-4 rounded-md w-full cursor-pointer hover:bg-muted/50">
                                                    {getAddressIcon(address.street)}
                                                    <div className="flex-grow">
                                                        <p className="font-bold">{address.street}, {address.number}</p>
                                                        <p className="text-sm text-muted-foreground">{address.neighborhood} - {address.city}, {address.state}</p>
                                                    </div>
                                                </Label>
                                                <Button variant="ghost" size="icon" onClick={(e) => handleOpenEditDialog(address, e)}>
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">Editar Endereço</span>
                                                </Button>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                ) : (
                                    <div className="text-center py-6 border-dashed border-2 rounded-md">
                                        <p className="text-muted-foreground mb-4">Nenhum endereço cadastrado para entrega.</p>
                                        {renderAddOrEditAddress()}
                                    </div>
                                )}
                            </CardContent>
                             {addresses.length > 0 && (
                                <CardFooter>
                                    {renderAddOrEditAddress()}
                                </CardFooter>
                             )}
                        </Card>
                    )}

                    {/* Payment Method */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">{deliveryOption === 'delivery' ? '4.' : '3.'} Método de Pagamento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <RadioGroup value={paymentMethod} onValueChange={(val: 'card' | 'cash') => setPaymentMethod(val)} className="space-y-2">
                                <div className="flex items-center">
                                    <RadioGroupItem value="card" id="card" className="mr-3" />
                                    <Label htmlFor="card" className="flex items-center border p-4 rounded-md w-full cursor-pointer hover:bg-muted/50">
                                        <CreditCard className="h-5 w-5 mr-3" />
                                        <span>Cartão de Crédito/Débito (na entrega/retirada)</span>
                                    </Label>
                                </div>
                                <div className="flex items-center">
                                    <RadioGroupItem value="cash" id="cash" className="mr-3" />
                                     <Label htmlFor="cash" className="flex items-center border p-4 rounded-md w-full cursor-pointer hover:bg-muted/50">
                                        <DollarSign className="h-5 w-5 mr-3" />
                                        <span>Dinheiro</span>
                                     </Label>
                                </div>
                            </RadioGroup>
                             {paymentMethod === 'cash' && (
                                <div className="pt-4 pl-2 space-y-2 animate-in fade-in">
                                    <Label htmlFor="change">Precisa de troco?</Label>
                                    <Input 
                                        id="change" 
                                        type="number" 
                                        placeholder="Para qual valor? Ex: 50" 
                                        value={changeFor}
                                        onChange={(e) => setChangeFor(e.target.value)}
                                        className="max-w-xs"
                                    />
                                    <p className="text-xs text-muted-foreground">Deixe em branco se não precisar de troco.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Order Summary */}
                <aside className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle className="font-headline">Resumo do Pedido</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {items.map(item => (
                                <div key={item.product.id} className="flex justify-between items-center text-sm">
                                    <p>{item.quantity}x <span className="font-medium">{item.product.name}</span></p>
                                    <p>{(item.product.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                             ))}
                             <Separator />
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span>{deliveryOption === 'pickup' ? 'Taxa de Retirada' : 'Taxa de entrega'}</span>
                                {isCalculatingShipping ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : shippingCost !== null ? (
                                    <span>{shippingCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                ) : (
                                    <span className="text-muted-foreground text-xs">Selecione uma opção</span>
                                )}
                            </div>
                            
                            {shippingError && (
                                <Alert variant="destructive" className="text-xs">
                                     <AlertCircle className="h-4 w-4" />
                                     <AlertDescription>
                                        {shippingError}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                            <Button size="lg" className="w-full" disabled={!canPlaceOrder} onClick={handlePlaceOrder}>
                                 {isPlacingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Finalizar Pedido
                            </Button>
                        </CardFooter>
                    </Card>
                </aside>
            </div>
             <AlertDialog open={isSuccessDialogOpen} onOpenChange={(open) => !open && router.push('/orders')}>
                <AlertDialogContent>
                    <AlertDialogHeader className="items-center text-center">
                         <CheckCircle2 className="h-16 w-16 text-green-500" />
                        <AlertDialogTitle className="text-2xl font-bold font-headline">Pedido Recebido!</AlertDialogTitle>
                        <AlertDialogDescription>
                            Seu pedido #{lastOrderId?.substring(0,8).toUpperCase()} foi recebido com sucesso. Você pode acompanhar o status do seu pedido a qualquer momento.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Link href={`/orders/${lastOrderId}`} passHref legacyBehavior>
                           <AlertDialogAction asChild className="w-full">
                                <a>Acompanhar Pedido</a>
                           </AlertDialogAction>
                        </Link>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
