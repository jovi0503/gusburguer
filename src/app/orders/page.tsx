
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Order } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingBag, ChevronRight, Loader2 } from 'lucide-react';
import { OrderProgressCard } from '@/components/order-progress-card';
import { Separator } from '@/components/ui/separator';
import { useUserStore } from '@/store/user';
import { getOrdersByIds } from '@/lib/firestore'; // Importa a nova função

const statusMap: Record<Order['status'], { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' | 'warning' }> = {
  pending: { label: 'Aguardando', variant: 'warning' },
  processing: { label: 'Em Preparo', variant: 'secondary' },
  delivering: { label: 'Em Trânsito', variant: 'default' },
  delivered: { label: 'Entregue', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

const ACTIVE_STATUSES: Order['status'][] = ['pending', 'processing', 'delivering'];


export default function OrdersPage() {
    const { orderIds } = useUserStore();
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [pastOrders, setPastOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrders() {
            if (orderIds.length === 0) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            try {
                // Remove duplicados antes de buscar
                const uniqueOrderIds = [...new Set(orderIds)];
                const userOrders = await getOrdersByIds(uniqueOrderIds);
                
                const active = userOrders.filter(order => ACTIVE_STATUSES.includes(order.status));
                const past = userOrders.filter(order => !ACTIVE_STATUSES.includes(order.status));
                
                setActiveOrders(active);
                setPastOrders(past);
            } catch (error) {
                console.error("Erro ao buscar pedidos:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [orderIds]);

    if (loading) {
         return (
            <div className="space-y-6 pt-20">
                <Skeleton className="h-10 w-48 mb-4" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-8 w-56 mt-8" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }
    
    if (orderIds.length === 0) {
        return (
             <div className="text-center py-20 pt-32">
                <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-headline font-bold mb-2">Nenhum pedido encontrado</h1>
                <p className="text-muted-foreground mb-6">Parece que você ainda não fez nenhum pedido conosco.</p>
                <Button asChild className="rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                    <Link href="/">Começar a comprar</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="pt-20">
            <h1 className="text-3xl md:text-4xl font-headline font-bold mb-8">Meus Pedidos</h1>
            
            <div className="space-y-8">
                {activeOrders.length === 0 && pastOrders.length === 0 && !loading &&(
                     <div className="text-center py-10">
                        <p className="text-muted-foreground">Nenhum pedido encontrado para os IDs salvos.</p>
                     </div>
                )}

                {/* Pedidos Ativos */}
                {activeOrders.length > 0 && (
                     <section className="space-y-4">
                        <h2 className="text-xl font-semibold font-headline">Pedidos Ativos</h2>
                        {activeOrders.map(order => (
                            <OrderProgressCard key={`active-${order.id}`} order={order} />
                        ))}
                    </section>
                )}

                {/* Histórico de Pedidos */}
                {pastOrders.length > 0 && (
                    <section className="space-y-4">
                        {activeOrders.length > 0 && <Separator />}
                        <h2 className="text-xl font-semibold font-headline pt-4">Histórico de Pedidos</h2>
                         {pastOrders.map(order => (
                             <Link href={`/orders/${order.id}`} key={`past-${order.id}`} className="block">
                                <Card className="hover:bg-muted/50 transition-colors p-4">
                                     <div className="flex justify-between items-center w-full text-left gap-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-base">Pedido #{order.id.substring(0, 8).toUpperCase()}</span>
                                            <span className="text-sm text-muted-foreground">{format(new Date(order.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                             <div className="flex flex-col items-end">
                                                <span className="font-bold">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                <Badge variant={statusMap[order.status]?.variant || 'secondary'} className="mt-1">
                                                    {statusMap[order.status]?.label || 'Desconhecido'}
                                                </Badge>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </section>
                )}
            </div>
        </div>
    );
}

    