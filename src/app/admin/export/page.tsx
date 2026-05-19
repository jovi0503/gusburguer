
import { getProducts } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Copy } from 'lucide-react';
import { CopyButton } from './copy-button';

// Esta é uma página do servidor (Server Component)
// Ela busca os dados diretamente no servidor quando a página é acessada.
export default async function ExportProductsPage() {
    
    // Busca todos os produtos do Firestore usando a função existente
    const products = await getProducts();
    
    // Transforma a lista de produtos em um texto JSON formatado
    const jsonString = JSON.stringify(products, null, 2);

    return (
        <div>
            <h1 className="text-3xl font-bold font-headline mb-8">Exportar Dados dos Produtos</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Dados dos Produtos (JSON)
                    </CardTitle>
                    <CardDescription>
                        Abaixo estão todos os dados da sua coleção de produtos. Copie e cole este texto para onde precisar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <CopyButton textToCopy={jsonString} />
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-[60vh]">
                            {jsonString}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
