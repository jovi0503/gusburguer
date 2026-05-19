
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getOrders } from '@/lib/firestore';
import type { Order } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye, CheckCheck, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PrintableReceipt } from '@/components/printable-receipt';
import ReactDOMServer from 'react-dom/server';

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

export default function AdminFinishedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const fetchedOrders = await getOrders();
        // Filtra para mostrar apenas pedidos entregues
        const deliveredOrders = fetchedOrders.filter(order => order.status === 'delivered');
        setOrders(deliveredOrders);
      } catch (error) {
        console.error("Erro ao buscar pedidos finalizados:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);
  
  return (
    <div>
      <h1 className="text-3xl font-bold font-headline mb-8">Pedidos Finalizados</h1>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID do Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 rounded-md ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id.substring(0, 8).toUpperCase()}</TableCell>
                  <TableCell>{format(new Date(order.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell>{order.user?.name || 'Cliente não identificado'}</TableCell>
                  <TableCell>{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Entregue</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <div className="flex gap-2 justify-end">
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
                           <CheckCheck className="h-8 w-8 text-muted-foreground" />
                           <span className="text-muted-foreground">Nenhum pedido finalizado encontrado.</span>
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

    