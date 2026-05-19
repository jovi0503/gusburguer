
import Link from 'next/link';
import { Logo } from './icons';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground mt-auto hidden md:block">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Logo className="h-8 w-8" />
            <span className="text-xl font-headline font-bold text-foreground">Gus Burguer</span>
          </div>
          <nav className="flex gap-6 mb-4 md:mb-0">
            <Link href="/" className="text-sm hover:text-primary">Início</Link>
            <Link href="/offers" className="text-sm hover:text-primary">Ofertas</Link>
            <Link href="/orders" className="text-sm hover:text-primary">Meus Pedidos</Link>
          </nav>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-primary"><Facebook className="h-5 w-5" /></Link>
            <Link href="#" className="hover:text-primary"><Instagram className="h-5 w-5" /></Link>
            <Link href="#" className="hover:text-primary"><Twitter className="h-5 w-5" /></Link>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Gus Burguer. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
