
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * This page is no longer in use as the main page acts as the catalog.
 * This component simply redirects any users who land here back to the homepage.
 */
export default function CatalogRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
      <h1 className="text-2xl font-bold font-headline">Redirecionando...</h1>
    </div>
  );
}
