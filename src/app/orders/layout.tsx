'use client';

import Header from '@/components/header';
import Footer from '@/components/footer';
import FloatingCartBar from '@/components/floating-cart-bar';
import BottomNavBar from '@/components/bottom-nav-bar';

// Este layout agora é público, não precisa de verificação de login
export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
      <FloatingCartBar />
      <BottomNavBar />
    </>
  );
}
