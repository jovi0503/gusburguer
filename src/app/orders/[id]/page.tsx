
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Order, OrderStatus } from '@/lib/types';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, MapPin, CheckCircle2, Phone, Truck, Utensils, Hourglass, XCircle, ShoppingCart, MessageSquare, ShoppingBag, PackageCheck, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFirebaseApp } from '@/lib/firebase';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { cancelOrderAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';


const statusConfig: Record<OrderStatus, { text: string; description: string; Icon: React.ElementType, color: string, pickupText?: string, pickupDescription?: string, pickupIcon?: React.ElementType }> = {
    pending: {
        text: 'Aguardando Confirmação',
        description: 'Seu pedido foi realizado e está aguardando a confirmação do estabelecimento.',
        Icon: Hourglass,
        color: 'text-yellow-500'
    },
    processing: {
        text: 'Em Preparo',
        description: 'Seu pedido foi confirmado e está sendo preparado.',
        Icon: Utensils,
        color: 'text-blue-500'
    },
    delivering: {
        text: 'Saiu para Entrega',
        description: 'Seu pedido está a caminho!',
        Icon: Truck,
        color: 'text-primary',
        pickupText: 'Pronto para Retirada',
        pickupDescription: 'Seu pedido está pronto para ser retirado no local.',
        pickupIcon: ShoppingBag,
    },
    delivered: {
        text: 'Entregue',
        description: 'Seu pedido foi entregue com sucesso!',
        Icon: CheckCircle2,
        color: 'text-green-500',
        pickupText: 'Retirado',
        pickupDescription: 'Seu pedido foi retirado com sucesso!',
        pickupIcon: PackageCheck,
    },
    cancelled: {
        text: 'Cancelado',
        description: 'Seu pedido foi cancelado.',
        Icon: XCircle,
        color: 'text-destructive'
    },
};

const PICKUP_ADDRESS_ID = 'pickup';


function OrderTimeline({ order }: { order: Order }) {
    const isPickup = order.shippingAddress.id === PICKUP_ADDRESS_ID;

    if (order.status === 'cancelled') {
        const cancelTime = (order.statusHistory || []).find(h => h.status === 'cancelled')?.timestamp;
        const formattedTime = cancelTime ? ` às ${format(new Date(cancelTime), 'HH:mm', { locale: ptBR })}` : '';
        return (
            <Alert variant="destructive" className="flex items-start gap-4">
                <XCircle className="h-6 w-6" />
                <div className="flex-1">
                    <AlertTitle className="font-bold">Pedido Cancelado</AlertTitle>
                    <AlertDescription>
                        Seu pedido foi cancelado{formattedTime}. Entre em contato para mais detalhes.
                    </AlertDescription>
                </div>
            </Alert>
        );
    }
    
    const orderStatuses: OrderStatus[] = ['pending', 'processing', 'delivering', 'delivered'];
    
    const getStatusTime = (status: OrderStatus) => {
        if (!order.statusHistory) return null;
        const historyEntry = order.statusHistory.find(h => h.status === status);
        return historyEntry ? format(new Date(historyEntry.timestamp), 'HH:mm', { locale: ptBR }) : null;
    };
    
    const latestStatusEntry = (order.statusHistory || [])
      .filter(h => orderStatuses.includes(h.status))
      .sort((a, b) => b.timestamp - a.timestamp)[0];
      
    if (!latestStatusEntry) {
         return (
            <Alert>
                <Hourglass className="h-4 w-4" />
                <AlertTitle>Processando...</AlertTitle>
                <AlertDescription>Carregando status do seu pedido.</AlertDescription>
            </Alert>
        );
    }

    const currentStatusInfo = statusConfig[latestStatusEntry.status];
    const Icon = (isPickup && currentStatusInfo.pickupIcon) ? currentStatusInfo.pickupIcon : currentStatusInfo.Icon;
    const title = (isPickup && currentStatusInfo.pickupText) ? currentStatusInfo.pickupText : currentStatusInfo.text;
    const description = (isPickup && currentStatusInfo.pickupDescription) ? currentStatusInfo.pickupDescription : currentStatusInfo.description;


    return (
         <div className="space-y-8">
            <Alert className={`bg-primary/10 border-primary/20 text-primary`}>
                <div className="flex items-start gap-4">
                    <Icon className="h-6 w-6" />
                    <div className="flex-1">
                        <AlertTitle className="font-bold">{title}</AlertTitle>
                        <AlertDescription className="text-primary/80">
                            {description}
                        </AlertDescription>
                    </div>
                </div>
            </Alert>
            
            <div>
                <h3 className="text-lg font-semibold mb-4">Linha do tempo</h3>
                <div className="relative pl-6">
                    {orderStatuses.map((status) => {
                        const time = getStatusTime(status);
                        if (!time) return null; // Não mostra status que ainda não ocorreram

                        const statusInfo = statusConfig[status];
                        const statusText = (isPickup && statusInfo.pickupText) ? statusInfo.pickupText : statusInfo.text;
                        const activeStatuses = orderStatuses.filter(s => getStatusTime(s));
                        const isLastActive = status === activeStatuses[activeStatuses.length - 1];

                        return (
                            <div key={status} className="relative pb-8">
                                <div className={`absolute left-0 top-1 -translate-x-1/2 w-3 h-3 bg-background border-2 rounded-full border-green-500`}></div>
                                {!isLastActive && (
                                     <div className={`absolute left-0 top-1 h-full w-0.5 bg-green-500/30`}></div>
                                )}
                                <div className="pl-4">
                                    <p className="text-sm text-muted-foreground">{time}</p>
                                    <p className="font-semibold">{statusText}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function OrderDetailsSheet({ order }: { order: Order }) {
    const deliveryFee = order.shippingCost ?? 0;
    const subtotal = order.total - deliveryFee;

    return (
         <Sheet>
            <SheetTrigger asChild>
                <Button variant="link" className="px-0">Ver detalhes</Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Detalhes do Pedido #{order.id.substring(0, 8).toUpperCase()}</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-6">
                     <div>
                        <h4 className="font-semibold mb-3">Itens</h4>
                        <div className="space-y-4">
                             {order.items.map(item => (
                              <div key={item.product.id} className="flex items-center gap-4">
                                <Image src={item.product.imageUrl} alt={item.product.name} width={48} height={48} className="rounded-md object-cover"/>
                                <div>
                                    <p className="font-medium text-sm">{item.quantity}x {item.product.name}</p>
                                    <p className="text-xs text-muted-foreground">{(item.product.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                               </div>
                            ))}
                        </div>
                    </div>
                     <Separator />
                    <div>
                        <h4 className="font-semibold mb-2">Pagamento</h4>
                         <div className="text-sm space-y-1">
                            <div className="flex justify-between"><span>Subtotal:</span> <span>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                            <div className="flex justify-between"><span>Entrega:</span> <span>{deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                            <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>Total:</span> <span>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        </div>
                    </div>
                     <Separator />
                      <div>
                        <h4 className="font-semibold mb-2">Método de Pagamento</h4>
                        <p className="text-sm text-muted-foreground">{order.paymentMethod === 'card' ? 'Cartão de Crédito/Débito' : 'Dinheiro'}</p>
                         {order.paymentMethod === 'cash' && order.changeFor && (
                            <p className="text-xs text-muted-foreground">Troco para: {order.changeFor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                         )}
                     </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}


export default function OrderTrackingPage({ params }: { params: { id: string } }) {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
    const app = getFirebaseApp();
    const { toast } = useToast();

    useEffect(() => {
        if (!app) {
            setLoading(false);
            setError("A configuração do Firebase não foi carregada.");
            return;
        }
        const db = getFirestore(app);

        const orderDocRef = doc(db, 'orders', params.id);
        const unsubscribe = onSnapshot(orderDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const fetchedOrder = { id: docSnap.id, ...docSnap.data() } as Order;
                if (!fetchedOrder.statusHistory) {
                    fetchedOrder.statusHistory = [{ status: fetchedOrder.status, timestamp: fetchedOrder.createdAt }];
                }
                setOrder(fetchedOrder);
            } else {
                setError("Pedido não encontrado.");
                setOrder(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Erro no listener do pedido:", err);
            setError("Ocorreu um erro ao carregar os detalhes do pedido.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [params.id, app]);

    const handleCancelOrder = async () => {
        if (!order) return;
        setIsCancelling(true);
        try {
            const result = await cancelOrderAction(order.id);
            if (result.success) {
                toast({
                    title: "Pedido Cancelado",
                    description: "Seu pedido foi cancelado com sucesso."
                });
            } else {
                 throw new Error(result.error || "Falha ao cancelar o pedido.");
            }
        } catch (error: any) {
            console.error("Erro ao cancelar pedido:", error);
            toast({
                title: "Erro",
                description: "Não foi possível cancelar o pedido. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsCancelling(false);
            setIsCancelAlertOpen(false);
        }
    }
    
    const generateWhatsAppLink = () => {
        if (!order?.user) return "#";
        const phoneNumber = "557199453692"; // Seu número em formato internacional
        const message = `Olá! Meu nome é ${order.user.name}, estou entrando em contato referente ao pedido #${order.id.substring(0,8).toUpperCase()}. Pode me ajudar?`;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    };


    if (loading) {
        return (
            <div className="space-y-8 pt-20">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="text-center py-20 pt-32">
                 <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-headline font-bold mb-2">Erro ao carregar pedido</h1>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button asChild>
                    <Link href="/orders">Voltar para Meus Pedidos</Link>
                </Button>
            </div>
        )
    }

    if (!order) {
         return (
            <div className="text-center py-20 pt-32">
                <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-headline font-bold mb-2">Pedido não encontrado</h1>
                <Button asChild>
                    <Link href="/">Voltar para o início</Link>
                </Button>
            </div>
        )
    }

    const isPickup = order.shippingAddress?.id === PICKUP_ADDRESS_ID;
    const canCancelDelivery = !isPickup && (order.status === 'pending' || order.status === 'processing');
    const canCancelPickup = isPickup && (order.status === 'pending' || order.status === 'processing' || order.status === 'delivering');
    const showCancelButton = canCancelDelivery || canCancelPickup;


    return (
        <div className="space-y-6 pt-20">
            <Button asChild variant="ghost" className="-ml-4">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Voltar para o Início
                </Link>
            </Button>

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold font-headline">Pedido #{order.id.substring(0, 8).toUpperCase()}</h1>
                <OrderDetailsSheet order={order} />
            </div>
            
            <div className="border rounded-lg p-4 space-y-1">
                <h2 className="font-semibold text-sm">{isPickup ? 'Retirada no Local' : 'Entregar no endereço'}</h2>
                 {isPickup ? (
                     <div className="flex gap-2 items-center text-muted-foreground">
                        <ShoppingBag className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium">O pedido será retirado no estabelecimento.</p>
                     </div>
                 ) : (
                    <div className="flex gap-2 text-muted-foreground">
                        <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">
                            {order.shippingAddress.street}, {order.shippingAddress.number} <br/>
                            {order.shippingAddress.neighborhood} <br/>
                            {order.shippingAddress.city}, {order.shippingAddress.state}
                        </p>
                    </div>
                 )}
            </div>

            <OrderTimeline order={order} />

            <Separator />
            
             <div className="text-center space-y-4">
                {showCancelButton && (
                    <Button variant="destructive" onClick={() => setIsCancelAlertOpen(true)} disabled={isCancelling}>
                        <Ban className="mr-2 h-4 w-4" />
                        Cancelar Pedido
                    </Button>
                )}

                 <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Precisa de ajuda? Fale conosco</h3>
                    <Button variant="outline" asChild>
                        <a href={generateWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Enviar mensagem no WhatsApp
                        </a>
                    </Button>
                 </div>
            </div>

             <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Você está prestes a cancelar este pedido.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelOrder} disabled={isCancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Sim, cancelar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
