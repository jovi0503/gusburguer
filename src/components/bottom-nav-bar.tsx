
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Tag, ShoppingBag, User } from 'lucide-react';
import { useUserStore } from '@/store/user';
import { Badge } from './ui/badge';
import { useEffect, useState } from 'react';
import { getOrdersByIds } from '@/lib/firestore';
import type { Order } from '@/lib/types';

const navLinks = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/offers', label: 'Promoções', icon: Tag },
  { href: '/orders', label: 'Pedidos', icon: ShoppingBag },
  // O link de Perfil foi removido, pois não há mais conta de usuário.
];

const ACTIVE_STATUSES: Order['status'][] = ['pending', 'processing', 'delivering'];

export default function BottomNavBar() {
  const pathname = usePathname();
  const { orderIds } = useUserStore();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    async function fetchAndCountActiveOrders() {
      if (orderIds.length === 0) {
        setActiveOrdersCount(0);
        return;
      }
      try {
        const userOrders = await getOrdersByIds(orderIds);
        const activeCount = userOrders.filter(order => ACTIVE_STATUSES.includes(order.status)).length;
        setActiveOrdersCount(activeCount);
      } catch (error) {
        console.error("Erro ao buscar contagem de pedidos ativos:", error);
        setActiveOrdersCount(0);
      }
    }

    fetchAndCountActiveOrders();
    // Adiciona um intervalo para verificar periodicamente, útil se a guia ficar aberta.
    const interval = setInterval(fetchAndCountActiveOrders, 60000); // A cada 1 minuto

    return () => clearInterval(interval);
  }, [orderIds]);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-50">
      <nav className="flex justify-around items-center h-full">
        {navLinks.map(link => {
          const isActive = (link.href === '/' && pathname === '/') || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors w-full h-full',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <link.icon className="h-6 w-6" />
              <span>{link.label}</span>
              {link.href === '/orders' && activeOrdersCount > 0 && (
                <Badge variant="destructive" className="absolute top-2 right-6 h-4 w-4 p-0 flex items-center justify-center text-[10px]">{activeOrdersCount}</Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
