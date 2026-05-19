"use client";

import Link from 'next/link';
import { Menu, ShoppingCart, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { Separator } from './ui/separator';
import { Logo } from './icons';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const navLinks = [
  { href: '/', label: 'Início' },
  { href: '/offers', label: 'Ofertas' },
  { href: '/orders', label: 'Meus Pedidos' },
];

function MobileMenu() {
    // Como não há mais login de cliente, o menu móvel é simplificado.
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10 hover:text-white">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Abrir menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <div className="flex flex-col gap-6 p-6 h-full">
                    <Link href="/" className="flex items-center gap-2 mb-4">
                        <Logo className="h-8 w-8" />
                        <span className="text-xl font-headline font-bold">Gus Burguer</span>
                    </Link>
                    
                    <nav className="flex-1 flex flex-col gap-6">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="flex items-center text-lg font-medium text-foreground transition-colors hover:text-primary">
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <Separator />
                    
                    {/* Link para o painel de admin, útil para desenvolvimento */}
                    <div className="mt-auto">
                        <Link href="/admin" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                            <LogIn className="mr-3 h-5 w-5" />
                            Painel do Admin
                        </Link>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}


export default function Header() {
  const totalItems = useCartStore((state) => state.totalItems);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Começa a transição do cabeçalho após o usuário rolar um pouco
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <header className={cn(
        "fixed top-0 left-0 right-0 z-20 transition-colors duration-300",
        isScrolled ? "bg-background/80 backdrop-blur-sm border-b" : "bg-transparent border-transparent"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-6">
             <Link href="/" className="flex items-center gap-2">
                <span className={cn(
                    "text-xl font-headline font-bold hidden md:inline transition-colors",
                    isScrolled ? "text-foreground" : "text-white"
                )}>Gus Burguer</span>
            </Link>
             <nav className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={cn(
                        "flex items-center text-sm font-medium transition-colors",
                        isScrolled ? "text-muted-foreground hover:text-primary" : "text-gray-200 hover:text-white"
                    )}>
                    {link.label}
                    </Link>))}
            </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
            <Button asChild variant="ghost" size="icon" className={cn(
                "relative transition-colors",
                isScrolled ? "text-foreground hover:bg-accent" : "text-white hover:bg-white/10"
            )}>
                <Link href="/cart">
                    <ShoppingCart className="h-5 w-5" />
                    {totalItems > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {totalItems}
                        </span>
                    )}
                    <span className="sr-only">Carrinho</span>
                </Link>
            </Button>
          
            <MobileMenu />
        </div>
      </div>
    </header>
  );
}
