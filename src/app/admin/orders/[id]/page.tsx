
'use client';

import { useEffect, useState } from 'react';
import { getOrderById, updateOrderStatus, getProducts, updateOrderItems } from '@/lib/firestore';
import type { Order, Product, OrderItemProduct } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Truck, Package, CheckCircle, XCircle, Hourglass, Utensils, Printer, Check, Ban, ShoppingBag, PackageCheck, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAlarm } from '@/context/alarm-context';
import { createRoot } from 'react-dom/client';
import { PrintableReceipt } from '@/components/printable-receipt';
import { WhatsAppIcon } from '@/components/icons';
import ReactDOMServer from 'react-dom/server';
import { EditOrderDialog } from '@/components/edit-order-dialog';

const statusMap: Record<Order['status'], { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' | 'warning', icon: React.FC<any>, pickupLabel?: string, whatsappMessage?: string }> = {
  pending: { label: 'Aguardando', variant: 'warning', icon: Hourglass, whatsappMessage: 'foi recebido e está aguardando confirmação.' },
  processing: { label: 'Em Preparo', variant: 'secondary', icon: Utensils, whatsappMessage: 'foi confirmado e já está em preparo!' },
  delivering: { label: 'Em Trânsito', variant: 'default', icon: Truck, pickupLabel: 'Pronto p/ Retirada', whatsappMessage: 'saiu para entrega!' },
  delivered: { label: 'Entregue', variant: 'outline', icon: CheckCircle, pickupLabel: 'Retirado', whatsappMessage: 'foi entregue! Agradecemos a preferência.' },
  cancelled: { label: 'Cancelado', variant: 'destructive', icon: XCircle, whatsappMessage: 'foi cancelado. Para mais detalhes, entre em contato conosco.' },
};

const PICKUP_ADDRESS_ID = 'pickup';

export const handlePrint = (order: Order) => {
    const receiptHtml = ReactDOMServer.renderToString(
        <PrintableReceipt order={order} />
    );
    const printWindow = window.open('', '_blank', 'width=302,height=500'); // 80mm width in pixels approx.

    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Comanda</title>
                    <style>
                        @page { size: 72.1mm auto; margin: 0; }
                        body { margin: 4mm; font-family: monospace; width: 72.1mm; background: #fff; color: #000; }
                        * { box-sizing: border-box; word-break: break-word; }
                    </style>
                </head>
                <body>
                    ${receiptHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 600); // Timeout para garantir que o conteúdo seja renderizado
    }
};


export default function OrderDetailsPage({ params }: { params: { id:string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { stopRinging } = useAlarm();

  useEffect(() => {
    async function fetchOrderAndProducts() {
      try {
        const [fetchedOrder, fetchedProducts] = await Promise.all([
            getOrderById(params.id),
            getProducts()
        ]);
        
        if (fetchedOrder?.status === 'pending') {
            stopRinging();
        }
        setOrder(fetchedOrder);
        setAllProducts(fetchedProducts);

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast({ title: "Erro", description: "Não foi possível carregar os detalhes do pedido ou produtos.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchOrderAndProducts();
  }, [params.id, toast, stopRinging]);
  
  const generateWhatsAppLink = (order: Order, status: Order['status']) => {
    if (!order.user || !order.user.phone) {
      toast({ title: "Aviso", description: "Cliente não possui um número de telefone válido para notificação.", variant: "destructive" });
      return;
    }
    
    const customerName = order.user.name || 'Cliente';
    const customerPhone = order.user.phone.replace(/\D/g, '');
    
    if (!customerPhone || customerPhone.length < 9) {
        toast({ title: "Aviso", description: "Número de telefone do cliente é inválido.", variant: "destructive" });
        return;
    }
    
    const isPickup = order.shippingAddress.id === PICKUP_ADDRESS_ID;
    let messageBody = statusMap[status]?.whatsappMessage || 'seu pedido teve uma nova atualização.';

    if (isPickup && status === 'delivering') {
        messageBody = 'já está pronto para retirada!';
    } else if (isPickup && status === 'delivered') {
        messageBody = 'foi retirado com sucesso! Agradecemos a preferência.';
    }

    const message = `Olá, ${customerName}! Seu pedido #${order.id.substring(0,8).toUpperCase()} ${messageBody}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${customerPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
};


  const handleStatusChange = async (newStatus: Order['status']) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      const updatedOrder = { ...order, status: newStatus };
      setOrder(updatedOrder);
      
      if (newStatus === 'processing' || newStatus === 'cancelled') {
          stopRinging();
      }

      toast({
        title: "Status atualizado!",
        description: `O pedido foi atualizado.`,
      });

      // Não notificar se for cancelado
      if (newStatus !== 'cancelled') {
        generateWhatsAppLink(updatedOrder, newStatus);
      }

    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o status do pedido.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };
  
    const sendOrderUpdateNotification = (updatedOrder: Order) => {
        if (!updatedOrder.user || !updatedOrder.user.phone) {
            toast({ title: "Aviso", description: "Cliente não possui um número de telefone para notificação.", variant: "destructive" });
            return;
        }

        const customerName = updatedOrder.user.name || 'Cliente';
        const customerPhone = updatedOrder.user.phone.replace(/\D/g, '');

        const itemsSummary = updatedOrder.items.map(item => `${item.quantity}x ${item.product.name}`).join('\n');
        const newTotalString = updatedOrder.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const message = `Olá, ${customerName}! Seu pedido #${updatedOrder.id.substring(0, 8).toUpperCase()} foi atualizado. Confira os novos detalhes:\n\n*Itens:*\n${itemsSummary}\n\n*Novo Total:* ${newTotalString}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/55${customerPhone}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    };

  const handleSaveOrderEdit = async (updatedItems: { product: OrderItemProduct; quantity: number }[]) => {
    if (!order) return;
    
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const newTotal = newSubtotal + order.shippingCost;

    setIsUpdating(true);
    try {
        await updateOrderItems(order.id, updatedItems, newTotal);
        
        const updatedOrderData = { ...order, items: updatedItems, total: newTotal };
        setOrder(updatedOrderData);
        
        toast({
            title: 'Pedido Atualizado!',
            description: 'Os itens do pedido foram modificados com sucesso.'
        });
        
        setIsEditDialogOpen(false);
        sendOrderUpdateNotification(updatedOrderData); // Envia a notificação
        
    } catch(e) {
        console.error("Erro ao salvar itens do pedido:", e);
        toast({ title: 'Erro', description: 'Não foi possível salvar as alterações do pedido.', variant: 'destructive'});
    } finally {
        setIsUpdating(false);
    }
  };
  
  if (loading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card><CardContent className="p-6"><Skeleton className="h-40" /></CardContent></Card>
                    <Card><CardContent className="p-6"><Skeleton className="h-24" /></CardContent></Card>
                </div>
                <div className="space-y-6">
                    <Card><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
                </div>
            </div>
        </div>
    );
  }

  if (!order) {
    return (
      <div className="no-print">
        <Link href="/admin/orders" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Pedidos
        </Link>
        <h1 className="text-3xl font-bold font-headline mb-4">Pedido não encontrado</h1>
        <p>O pedido que você está procurando não existe ou foi removido.</p>
      </div>
    );
  }
  
  const isPickup = order.shippingAddress.id === PICKUP_ADDRESS_ID;
  const statusInfo = statusMap[order.status];
  let StatusIcon = statusInfo?.icon || Package;
  let statusLabel = statusInfo?.label || order.status;

  if (isPickup && statusInfo?.pickupLabel) {
    statusLabel = statusInfo.pickupLabel;
  }
  if (isPickup && order.status === 'delivering') StatusIcon = ShoppingBag;
  if (isPickup && order.status === 'delivered') StatusIcon = PackageCheck;


  const deliveryFee = order.shippingCost ?? 0;
  const subtotal = order.total - deliveryFee;
  const changeAmount = order.paymentMethod === 'cash' && order.changeFor ? order.changeFor - order.total : 0;
  
  const canEditOrder = order.status !== 'delivered' && order.status !== 'cancelled';

  return (
    <>
      <div className="no-print">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Pedidos
          </Link>
          <Button onClick={() => handlePrint(order)} variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Comanda
          </Button>
           {canEditOrder && (
              <Button onClick={() => setIsEditDialogOpen(true)} variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Pedido
              </Button>
          )}
        </div>
        
        <div className="bg-background rounded-lg p-6 border">
          <div className="flex flex-wrap justify-between items-start mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline">Pedido #{order.id.substring(0, 8).toUpperCase()}</h1>
                <p className="text-muted-foreground">
                    {format(new Date(order.createdAt), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
            </div>
            <div className="flex items-center gap-4">
                 <Badge variant={statusInfo?.variant || 'secondary'} className="text-base px-4 py-2">
                      <StatusIcon className="mr-2 h-5 w-5"/>
                      {statusLabel}
                  </Badge>
            </div>
          </div>
          
           {order.status === 'pending' && (
            <div className="flex gap-2 mb-6">
                <Button size="lg" onClick={() => handleStatusChange('processing')} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">
                    <Check className="mr-2 h-5 w-5" />
                    Aceitar Pedido
                </Button>
                <Button size="lg" variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={isUpdating}>
                    <Ban className="mr-2 h-5 w-5" />
                    Cancelar Pedido
                </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>Itens do Pedido</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map(item => (
                      <div key={item.product.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.quantity}x {item.product.name}</p>
                        </div>
                        <p className="font-semibold">{(item.quantity * item.product.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    ))}
                    <Separator />
                     <div className="flex justify-between items-center text-sm">
                        <p>Subtotal</p>
                        <p>{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <p>{isPickup ? 'Taxa:' : 'Taxa de Entrega'}</p>
                        <p>{deliveryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <p>Total</p>
                      <p>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Informações do Cliente</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-medium">{order.user?.name || 'Nome não disponível'}</p>
                  <p className="text-muted-foreground">{order.user?.phone || 'Telefone não disponível'}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{isPickup ? 'Retirada no Local' : 'Endereço de Entrega'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isPickup ? (
                            <div className="flex items-center gap-2">
                               <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                               <p className="font-medium">Cliente retirará o pedido</p>
                            </div>
                        ) : (
                            <div className="space-y-1 text-sm">
                                <p className="font-medium">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
                                {order.shippingAddress.complement && <p>{order.shippingAddress.complement}</p>}
                                <p>{order.shippingAddress.neighborhood}, {order.shippingAddress.city} - {order.shippingAddress.state}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
               <Card>
                <CardHeader><CardTitle>Mudar Status (Manual)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Select
                    value={order.status}
                    onValueChange={(value: Order['status']) => handleStatusChange(value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusMap).map(([statusKey, statusInfo]) => (
                        <SelectItem key={statusKey} value={statusKey}>
                          {isPickup && statusInfo.pickupLabel ? statusInfo.pickupLabel : statusInfo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => generateWhatsAppLink(order, order.status)}>
                     <WhatsAppIcon className="h-4 w-4" />
                     Reenviar Notificação
                  </Button>
                </CardContent>
              </Card>
               <Card>
                    <CardHeader><CardTitle>Pagamento</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                         <p className="font-medium">{order.paymentMethod === 'card' ? 'Cartão de Crédito/Débito' : 'Dinheiro'}</p>
                         {order.paymentMethod === 'cash' && order.changeFor && (
                            <>
                                <p className="text-sm text-muted-foreground">Troco para: {order.changeFor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                {changeAmount > 0 && (
                                    <p className="text-sm font-semibold">
                                        Troco a devolver: <span className="text-green-500">{changeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </p>
                                )}
                            </>
                         )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </div>
      
      {canEditOrder && (
          <EditOrderDialog
              isOpen={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              order={order}
              allProducts={allProducts}
              onSave={handleSaveOrderEdit}
              isSaving={isUpdating}
          />
      )}
    </>
  );
}
