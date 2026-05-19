

'use client'

import type { Product, Category, StoreSettings } from '@/lib/types';
import ProductCard from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense, useEffect, useState, useRef } from 'react';
import { Logo } from '@/components/icons';
import { MapPin, PowerOff, CircleDot, Loader2, Clock } from 'lucide-react';
import { getProducts, getCategories, getStoreSettings } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { collection, onSnapshot, doc, getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { ADMIN_USER_UIDS } from '@/lib/admins';
import Header from '@/components/header';
import FloatingCartBar from '@/components/floating-cart-bar';
import BottomNavBar from '@/components/bottom-nav-bar';
import Footer from '@/components/footer';
import { useStoreStatus } from '@/components/store-status-logic';

// --- SKELETON COMPONENTS ---

function CategoryNavSkeleton() {
    return (
        <div className="sticky top-16 bg-background z-10 py-3 border-b">
            <div className="container mx-auto px-4 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full" />
                ))}
            </div>
        </div>
    )
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
        {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-9 w-full" />
            </div>
        ))}
    </div>
  );
}

// --- HEADER & INFO ---

function StoreInfo({ loading }: { loading: boolean }) {
  const { effectiveStatus, scheduleMessage, loading: statusLoading } = useStoreStatus();
  
  const isLoading = loading || statusLoading;

  return (
    <section className="flex flex-col items-center justify-center bg-background min-h-[300px] py-4 px-4 text-center">
      <div className="flex flex-col items-center">
          <div className="relative h-28 w-28 md:h-32 md:w-32 mb-2 mx-auto">
              <Logo className="h-full w-full" />
          </div>
          <h1 className="text-3xl md:text-4xl font-headline font-bold uppercase text-white drop-shadow-lg">GUS BURGUER</h1>
          <div className="flex items-center justify-center text-sm text-gray-200 mt-1">
              <MapPin className="h-4 w-4 mr-1.5"/>
              Salvador - BA
          </div>
          {isLoading ? (
             <Skeleton className="h-5 w-28 mx-auto mt-2 bg-white/20" />
          ) : (
            <div className="mt-2 text-sm">
                <div className={cn(
                    "font-bold flex items-center justify-center gap-1.5",
                    effectiveStatus === 'open' ? 'text-green-400' : 'text-red-400'
                )}>
                  {effectiveStatus === 'open' ? <CircleDot className="h-4 w-4"/> : <PowerOff className="h-4 w-4"/>}
                  {effectiveStatus === 'open' ? 'Loja Aberta' : 'Loja Fechada'}
                </div>
                 {scheduleMessage && (
                    <div className="flex items-center justify-center gap-1 text-amber-300/80 mt-1 text-xs">
                        <Clock className="h-3 w-3"/>
                        <span>{scheduleMessage}</span>
                    </div>
                )}
            </div>
          )}
      </div>
    </section>
  )
}

// --- MAIN PAGE CONTENT ---

function HomePageContent() {
  const app = getFirebaseApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});


  // --- DATA FETCHING ---
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);
        
        // Filter products to only show active ones
        const activeProducts = productsData.filter(p => p.isActive !== false);
        setProducts(activeProducts);

        // Filter categories to only include those that have active products
        const productCategories = new Set(activeProducts.map(p => p.category));
        const filteredCategories = categoriesData.filter(c => productCategories.has(c.name));
        setCategories(filteredCategories);

        if (filteredCategories.length > 0) {
            setActiveCategory(filteredCategories[0].id);
        }

      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [app]);

  // --- SCROLL SPY LOGIC ---
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const offset = 150; // Ajuste para o header e a barra de categorias

      const currentCategory = categories.find(category => {
          const section = sectionRefs.current[category.id];
          if (!section) return false;
          const sectionTop = section.offsetTop - offset;
          const sectionHeight = section.offsetHeight;
          return scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight;
      });

      if (currentCategory && currentCategory.id !== activeCategory) {
          setActiveCategory(currentCategory.id);
          const buttonRef = categoryButtonRefs.current[currentCategory.id];
          if(buttonRef) {
              buttonRef.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategory]);


  const handleCategoryClick = (categoryId: string) => {
    const section = sectionRefs.current[categoryId];
    if (section) {
        const offset = 140; // Altura do header + barra de categorias
        const sectionTop = section.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: sectionTop, behavior: 'smooth' });
    }
  };
  
  const groupedProducts = categories.map(category => ({
    ...category,
    products: products.filter(product => product.category === category.name)
  })).filter(group => group.products.length > 0);
  
  // Layout do cliente
  return (
    <>
      <Header />
      <main className="flex-grow">
        <StoreInfo loading={loading}/>
        
        {loading ? (
            <CategoryNavSkeleton />
        ) : categories.length > 0 ? (
            <div className="sticky top-16 bg-background/80 backdrop-blur-sm z-10 py-3 border-b">
                 <div ref={categoryNavRef} className="container mx-auto px-4 no-scrollbar overflow-x-auto">
                    <nav className="flex items-center gap-2">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                ref={el => categoryButtonRefs.current[category.id] = el}
                                onClick={() => handleCategoryClick(category.id)}
                                className={cn(
                                    "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                                    activeCategory === category.id
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {category.name}
                            </button>
                        ))}
                    </nav>
                 </div>
            </div>
        ) : null}

        <div className="container mx-auto px-4">
            <div className="space-y-12 mt-6 pb-8">
                {loading ? (
                    <CatalogSkeleton />
                ) : groupedProducts.length > 0 ? (
                     groupedProducts.map(group => (
                        <section 
                            key={group.id} 
                            id={group.id}
                            ref={el => sectionRefs.current[group.id] = el}
                            className="scroll-mt-32"
                        >
                            <h2 className="text-2xl font-bold font-headline mb-4">{group.name}</h2>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                {group.products.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </section>
                    ))
                ) : (
                     <div className="text-center py-16">
                        <p className="text-muted-foreground">Nenhum produto encontrado no catálogo.</p>
                    </div>
                )}
            </div>
        </div>
      </main>
      <Footer />
      <FloatingCartBar />
      <BottomNavBar />
    </>
  );
}


export default function Home() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}
