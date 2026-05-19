
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { updateOrderStatus } from '@/lib/firestore';
import type { Order } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye, Loader2, Printer, ShoppingCart, Check, Ban, Truck, ShoppingBag, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, getFirestore, where, getDocs } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';
import { useAlarm } from '@/context/alarm-context';
import { PrintableReceipt } from '@/components/printable-receipt';
import { WhatsAppIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import ReactDOMServer from 'react-dom/server';

const ACTIVE_STATUSES: Order['status'][] = ['pending', 'processing', 'delivering'];
const PICKUP_ADDRESS_ID = 'pickup';

const statusMessages: Partial<Record<Order['status'], string>> = {
    processing: "foi confirmado e já está em preparo!",
    delivering: "saiu para entrega!",
    delivered: "foi entregue! Agradecemos a preferência.",
    cancelled: "foi cancelado. Para mais detalhes, entre em contato conosco."
};

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const { stopRinging } = useAlarm();
  const app = getFirebaseApp();

  // Função dedicada para buscar os pedidos ativamente
  const fetchActiveOrders = useCallback(async () => {
    if (!app) return;
    setIsChecking(true);
    const db = getFirestore(app);
    const q = query(collection(db, "orders"), where("status", "in", ACTIVE_STATUSES));
    
    try {
      const snapshot = await getDocs(q);
      const activeOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      const sortedOrders = activeOrders.sort((a, b) => b.createdAt - a.createdAt);
      
      setOrders(sortedOrders);
      setLastChecked(new Date()); 
    } catch (error) {
      console.error("Erro na busca ativa:", error);
    } finally {
        setIsChecking(false);
    }
  }, [app]);
  
  useEffect(() => {
    if (!app) {
      setLoading(false);
      return;
    }
    const db = getFirestore(app);

    const ordersQuery = query(
      collection(db, "orders"),
      where("status", "in", ACTIVE_STATUSES)
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const activeOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      const sortedOrders = activeOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(sortedOrders);
      setLastChecked(new Date()); 
      setLoading(false);
    }, (error) => {
      console.error("Erro no listener em tempo real:", error);
      toast({ title: "Erro de Conexão", description: "Ocorreu um erro na conexão em tempo real.", variant: "destructive" });
      setLoading(false);
    });

    // A busca ativa inicial é feita ao carregar a página
    fetchActiveOrders();

    return () => {
      unsubscribe();
    };
  }, [app, toast, fetchActiveOrders]);


  const generateWhatsAppLink = (order: Order, status: Order['status']) => {
    const customerName = order.user?.name || 'Cliente';
    const customerPhone = order.user?.phone?.replace(/\D/g, '');

    if (!customerPhone || customerPhone.length < 9) {
        toast({ title: "Aviso", description: "Cliente não possui um número de telefone válido para notificação.", variant: "destructive" });
        return;
    }
    
    const isPickup = order.shippingAddress.id === PICKUP_ADDRESS_ID;
    let messageBody = statusMessages[status] || 'seu pedido teve uma nova atualização.';

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

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    setUpdatingStatus(order.id);
    try {
      await updateOrderStatus(order.id, newStatus);
      
      if (newStatus === 'processing' || newStatus === 'cancelled') {
          stopRinging();
      }
      toast({
        title: "Status atualizado!",
        description: `O pedido foi atualizado.`,
      });
      if (newStatus !== 'cancelled') {
        generateWhatsAppLink(order, newStatus);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const renderActionButtons = (order: Order) => {
    const isUpdating = updatingStatus === order.id;
    const isPickup = order.shippingAddress.id === PICKUP_ADDRESS_ID;

    switch (order.status) {
        case 'pending':
            return (
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleStatusChange(order, 'processing')} disabled={isUpdating} className="bg-green-600 hover:bg-green-700 flex-1">
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Aceitar</span>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleStatusChange(order, 'cancelled')} disabled={isUpdating} className="flex-1">
                         {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        <span className="ml-2 hidden sm:inline">Cancelar</span>
                    </Button>
                </div>
            );
        case 'processing':
            return (
                <Button size="sm" onClick={() => handleStatusChange(order, 'delivering')} disabled={isUpdating} className="w-full">
                     {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : (isPickup ? <ShoppingBag className="h-4 w-4" /> : <Truck className="h-4 w-4" />)}
                    <span className="ml-2">{isPickup ? 'Pronto p/ Retirada' : 'Saiu p/ Entrega'}</span>
                </Button>
            );
        case 'delivering':
             return (
                <Button size="sm" onClick={() => handleStatusChange(order, 'delivered')} disabled={isUpdating} className="w-full bg-blue-600 hover:bg-blue-700">
                     {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span className="ml-2">{isPickup ? 'Marcar como Retirado' : 'Marcar como Entregue'}</span>
                </Button>
            );
        default:
            return null;
    }
};

  return (
    <div className="no-print">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold font-headline">Pedidos Ativos</h1>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-6 p-2 bg-muted rounded-md">
            <div className="flex items-center gap-2">
                 <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
                <span>
                    {lastChecked ? `Última verificação: ${format(lastChecked, 'HH:mm:ss')}` : 'Verificando pedidos...'}
                </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActiveOrders}
              disabled={isChecking}
            >
                <RefreshCw className={cn("mr-2 h-4 w-4", isChecking && "animate-spin")} />
                Atualizar
            </Button>
      </div>


      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-[240px]">Ações</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 rounded-md ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map(order => (
                <TableRow key={order.id} className={order.status === 'pending' ? 'bg-yellow-500/10 animate-pulse' : ''}>
                  <TableCell>
                    <div className="font-medium">{order.user?.name || 'Cliente'}</div>
                    <div className="text-xs text-muted-foreground">ID: {order.id.substring(0, 8).toUpperCase()}</div>
                  </TableCell>
                  <TableCell>{format(new Date(order.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell>
                    {renderActionButtons(order)}
                  </TableCell>
                  <TableCell className="text-right">
                     <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver Detalhes</span>
                        </Link>
                        </Button>
                         <Button onClick={() => handlePrint(order)} variant="ghost" size="icon">
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">Imprimir Comanda</span>
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        <div className="flex flex-col items-center gap-2">
                           <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                           <span className="text-muted-foreground">Nenhum pedido ativo no momento.</span>
                        </div>
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    