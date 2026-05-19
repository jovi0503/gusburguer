
'use client';

import { useState, useEffect, Suspense } from 'react';
import type { Product } from '@/lib/types';
import { getProducts } from '@/lib/firestore';
import ProductCard from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import FloatingCartBar from '@/components/floating-cart-bar';
import BottomNavBar from '@/components/bottom-nav-bar';

function OfferProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

function OffersPageContent() {
  const [offerProducts, setOfferProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOfferProducts() {
      try {
        setLoading(true);
        const allProducts = await getProducts();
        // Filter for products that are both on sale and active
        const onSaleProducts = allProducts.filter(p => p.onSale && p.isActive !== false);
        setOfferProducts(onSaleProducts);
      } catch (error) {
        console.error("Erro ao buscar produtos em oferta:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOfferProducts();
  }, []);

  if (loading) {
    return <OfferProductsSkeleton />;
  }

  if (offerProducts.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {offerProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className="text-center py-20">
      <Tag className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-headline font-bold mb-2">Nenhuma oferta no momento</h2>
      <p className="text-muted-foreground">Volte em breve para conferir as novidades!</p>
    </div>
  );
}

export default function OffersPage() {
  return (
    <>
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 pt-24">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">Nossas Ofertas</h1>
            <p className="text-lg text-muted-foreground mt-2">Aproveite os melhores preços para gelar o seu rolê!</p>
        </div>
        
        <Suspense fallback={<OfferProductsSkeleton />}>
            <OffersPageContent />
        </Suspense>
      </main>
      <Footer />
      <FloatingCartBar />
      <BottomNavBar />
    </>
  );
}
