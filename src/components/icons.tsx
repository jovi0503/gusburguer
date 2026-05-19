

import { UtensilsCrossed, Beef, Cookie, Coffee, LucideProps } from 'lucide-react';
import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export const BurgerIcon = (props: LucideProps) => <Beef {...props} />;
export const SidesIcon = (props: LucideProps) => <UtensilsCrossed {...props} />;
export const DessertIcon = (props: LucideProps) => <Cookie {...props} />;
export const DrinkIcon = (props: LucideProps) => <Coffee {...props} />;

export const GoogleIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.62-3.82 1.62-3.32 0-6.03-2.75-6.03-6.12s2.7-6.12 6.02-6.12c1.87 0 3.13.78 3.88 1.5l2.44-2.44C16.16 3.59 14.48 3 12.48 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c2.7 0 4.88-.93 6.48-2.52 1.64-1.64 2.13-3.87 2.13-5.78 0-.6-.05-1.18-.15-1.72H12.48z"/>
    </svg>
);

export const WhatsAppIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>WhatsApp</title>
      <path
        fill="currentColor"
        d="M19.004 22.5c-3.14 0-7.333-1.64-10.293-4.6-2.95-2.96-4.59-7.15-4.59-10.283C4.12 3.373 7.87 0 12.06 0c1.99 0 3.91.78 5.34 2.21 1.43 1.43 2.21 3.35 2.21 5.34 0 4.19-3.37 7.94-7.66 7.94-1.03 0-2.02-.2-2.9-.55l-4.17 1.15 1.18-4.06c-.4-.9-.63-1.9-.63-2.93 0-4.14 3.55-7.53 7.92-7.53 2.1 0 4.06.87 5.47 2.28s2.28 3.37 2.28 5.47c0 4.39-3.17 8.35-7.72 8.35m-7.01-6.14c.54.91 1.25 1.76 2.06 2.58 2.37 2.37 5.25 3.36 8.53 2.33l.23-.05c3.52-1.01 5.72-4.59 4.7-8.1-1.01-3.52-4.59-5.72-8.1-4.7-3.52 1.01-5.72 4.59-4.7 8.1l.05.23c.33 1.1.86 2.13 1.54 3.03l-1.01 3.5 3.5-1.01z"
      />
    </svg>
);

export const Logo = ({ className }: { className?: string }) => (
    <div className={cn("relative h-full w-full flex items-center justify-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.svg" alt="Gus Burguer Logo" className="h-full w-full object-contain" />
    </div>
);
