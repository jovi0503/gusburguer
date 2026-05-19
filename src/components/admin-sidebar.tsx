
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Tag, List, ChevronDown, LogOut, UploadCloud } from 'lucide-react';
import { Logo } from './icons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from './ui/button';
import { getCategories } from '@/lib/firestore';
import { Category } from '@/lib/types';

const mainNavLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Categorias', icon: List },
  { href: '/admin/offers', label: 'Ofertas', icon: Tag },
  { href: '/admin/analytics', label: 'Análises', icon: BarChart2 },
  { href: '/admin/export', label: 'Exportar Dados', icon: UploadCloud },
];

const ordersLinks = [
    { href: '/admin/orders', label: 'Ativos' },
    { href: '/admin/orders/finished', label: 'Finalizados' },
    { href: '/admin/orders/cancelled', label: 'Cancelados' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');

  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const { logout } = useAuthStore();

  useEffect(() => {
    if (pathname.startsWith('/admin/orders')) {
      setIsOrdersOpen(true);
    }
    if (pathname.startsWith('/admin/products')) {
      setIsProductsOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    async function fetchCategories() {
        try {
            const fetchedCategories = await getCategories();
            setProductCategories(fetchedCategories);
        } catch (error) {
            console.error("Failed to fetch categories for sidebar:", error);
        }
    }
    fetchCategories();
  }, []);

  const productsLinks = [
    { href: '/admin/products', label: 'Todos' },
    ...productCategories.map(cat => ({
        href: `/admin/products?category=${encodeURIComponent(cat.name)}`,
        label: cat.name
    }))
  ];


  return (
    <aside className="w-64 bg-background border-r flex flex-col no-print hidden md:flex">
      <div className="h-16 flex items-center justify-center border-b">
         <Link href="/admin" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-headline font-bold">Gus Burguer</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        {/* Dashboard Link */}
        <Link
            href="/admin"
            className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/admin'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
        >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
        </Link>
        
        {/* Orders Collapsible Menu */}
        <Collapsible open={isOrdersOpen} onOpenChange={setIsOrdersOpen}>
             <div className={cn(
                'flex items-center justify-between rounded-md text-sm font-medium transition-colors w-full',
                pathname.startsWith('/admin/orders')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}>
                 <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2 flex-grow">
                    <ShoppingCart className="h-5 w-5" />
                    Pedidos
                </Link>
                <CollapsibleTrigger asChild>
                     <Button variant="ghost" size="icon" className={cn(
                        "mr-2 h-8 w-8",
                        pathname.startsWith('/admin/orders') ? 'hover:bg-primary/80' : 'hover:bg-muted'
                     )}>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOrdersOpen && "rotate-180")} />
                        <span className="sr-only">Toggle Pedidos</span>
                     </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="py-1 pl-6 space-y-1">
                 {ordersLinks.map(link => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                             className={cn(
                                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                ? 'bg-muted text-foreground font-semibold'
                                : 'text-muted-foreground hover:bg-muted/50'
                            )}
                        >
                            {link.label}
                        </Link>
                    )
                 })}
            </CollapsibleContent>
        </Collapsible>

        {/* Products Collapsible Menu */}
         <Collapsible open={isProductsOpen} onOpenChange={setIsProductsOpen}>
             <div className={cn(
                'flex items-center justify-between rounded-md text-sm font-medium transition-colors w-full',
                pathname.startsWith('/admin/products')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}>
                 <Link href="/admin/products" className="flex items-center gap-3 px-3 py-2 flex-grow">
                    <Package className="h-5 w-5" />
                    Produtos
                </Link>
                <CollapsibleTrigger asChild>
                     <Button variant="ghost" size="icon" className={cn(
                        "mr-2 h-8 w-8",
                        pathname.startsWith('/admin/products') ? 'hover:bg-primary/80' : 'hover:bg-muted'
                     )}>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isProductsOpen && "rotate-180")} />
                        <span className="sr-only">Toggle Produtos</span>
                     </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="py-1 pl-6 space-y-1">
                 {productsLinks.map(link => {
                    const currentCategory = categoryFilter ? decodeURIComponent(categoryFilter) : null;
                    const isActive = (pathname === link.href && !categoryFilter && link.label === 'Todos') || (link.label !== 'Todos' && link.label === currentCategory);
                    
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                             className={cn(
                                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                ? 'bg-muted text-foreground font-semibold'
                                : 'text-muted-foreground hover:bg-muted/50'
                            )}
                        >
                            {link.label}
                        </Link>
                    )
                 })}
            </CollapsibleContent>
        </Collapsible>

        {/* Other Links */}
        {mainNavLinks.filter(link => link.href !== '/admin').map(link => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
        <div className="px-4 py-4 border-t">
            <Button
                onClick={() => logout()}
                variant="ghost"
                className="flex w-full items-center gap-3 justify-start px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <LogOut className="h-5 w-5" />
                Sair
            </Button>
      </div>
    </aside>
  );
}
