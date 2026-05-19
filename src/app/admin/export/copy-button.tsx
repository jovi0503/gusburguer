
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CopyButtonProps {
    textToCopy: string;
}

export function CopyButton({ textToCopy }: CopyButtonProps) {
    const [hasCopied, setHasCopied] = useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setHasCopied(true);
            toast({ title: "Copiado!", description: "Os dados foram copiados para a área de transferência." });
            setTimeout(() => {
                setHasCopied(false);
            }, 2000); // Reset icon after 2 seconds
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            toast({ title: "Erro", description: "Não foi possível copiar os dados.", variant: 'destructive' });
        });
    };

    return (
        <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleCopy}
        >
            {hasCopied ? (
                <Check className="h-4 w-4 text-green-500" />
            ) : (
                <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copiar</span>
        </Button>
    );
}
