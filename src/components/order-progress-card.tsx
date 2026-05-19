
'use client';

import type { Order, OrderStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { MapPin, Clock, ChevronRight, Utensils, Truck, Hourglass, CheckCircle2, ShoppingBag, PackageCheck } from "lucide-react";
import { addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderProgressCardProps {
    order: Order;
}

const statusConfig: Record<OrderStatus, { text: string; Icon: React.ElementType; progress: number, pickupText?: string, pickupIcon?: React.ElementType }> = {
    pending: { text: 'Aguardando Confirmação', Icon: Hourglass, progress: 25 },
    processing: { text: 'Em Preparo', Icon: Utensils, progress: 50 },
    delivering: { text: 'Saiu para Entrega', Icon: Truck, progress: 75, pickupText: 'Pronto para Retirada', pickupIcon: ShoppingBag },
    delivered: { text: 'Entregue', Icon: CheckCircle2, progress: 100, pickupText: 'Retirado', pickupIcon: PackageCheck },
    cancelled: { text: 'Cancelado', Icon: Hourglass, progress: 0 },
};

const DELIVERY_ESTIMATE_MINUTES = 35;
const PICKUP_ADDRESS_ID = 'pickup';

export function OrderProgressCard({ order }: OrderProgressCardProps) {
    const isPickup = order.shippingAddress?.id === PICKUP_ADDRESS_ID;
    const currentStatusInfo = statusConfig[order.status] || statusConfig.pending;
    
    const progressValue = currentStatusInfo.progress;
    const statusText = (isPickup && currentStatusInfo.pickupText) ? currentStatusInfo.pickupText : currentStatusInfo.text;
    const Icon = (isPickup && currentStatusInfo.pickupIcon) ? currentStatusInfo.pickupIcon : currentStatusInfo.Icon;
    
    const confirmationEntry = order.statusHistory?.find(h => h.status === 'processing');
    const startTime = confirmationEntry ? new Date(confirmationEntry.timestamp) : new Date(order.createdAt);
    
    const estimatedDeliveryTime = addMinutes(startTime, DELIVERY_ESTIMATE_MINUTES);

    return (
        <Link href={`/orders/${order.id}`}>
            <Card className="p-5 transition-all duration-200 hover:bg-muted/50 hover:shadow-md">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">Pedido #{order.id.substring(0, 8).toUpperCase()}</h3>
                    <div className="flex items-center text-sm text-muted-foreground hover:text-primary">
                        Ver detalhes
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                </div>

                <div className="space-y-6 mt-4">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">{isPickup ? 'Tipo de Pedido' : 'Entregar no endereço'}</p>
                        <div className="flex items-start gap-2">
                           {isPickup ? (
                                <>
                                    <ShoppingBag className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                                    <p className="text-sm leading-tight font-medium">Retirada no Local</p>
                                </>
                           ) : (
                                <>
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                                    <p className="text-sm leading-tight">
                                        {order.shippingAddress.street}, {order.shippingAddress.number} - {order.shippingAddress.neighborhood}
                                        <br/>
                                        {order.shippingAddress.city}, {order.shippingAddress.state}
                                    </p>
                                </>
                           )}
                        </div>
                    </div>

                    <div className="pt-2">
                         <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <Icon className="h-4 w-4" />
                                <span>{statusText}</span>
                            </div>
                        </div>
                        <Progress value={progressValue} />
                         <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3" />
                            <span>Previsto para {format(estimatedDeliveryTime, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
