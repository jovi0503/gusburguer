
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as LineChartIcon, PieChart as PieIcon, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { getFirebaseApp } from '@/lib/firebase';
import { collection, onSnapshot, getFirestore, where, query } from 'firebase/firestore';
import type { Order, Product } from '@/lib/types';
import { format, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const app = getFirebaseApp();

    useEffect(() => {
        if (!app) return;
        const db = getFirestore(app);

        // Consulta para buscar apenas pedidos com status 'delivered'
        const ordersQuery = query(collection(db, 'orders'), where('status', '==', 'delivered'));

        const ordersUnsub = onSnapshot(ordersQuery, (snapshot) => {
            const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setOrders(fetchedOrders);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar pedidos:", error);
            setLoading(false);
        });

        const productsUnsub = onSnapshot(collection(db, 'products'), (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(fetchedProducts);
        });

        return () => {
            ordersUnsub();
            productsUnsub();
        };
    }, [app]);

    const monthlySales = useMemo(() => {
        const salesByMonth: { [key: number]: number } = {};
        orders.forEach(order => {
            const month = getMonth(new Date(order.createdAt));
            salesByMonth[month] = (salesByMonth[month] || 0) + order.total;
        });
        const monthNames = Array.from({ length: 12 }, (_, i) => format(new Date(0, i), 'MMM', { locale: ptBR }));
        return monthNames.map((name, index) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            total: salesByMonth[index] || 0,
        }));
    }, [orders]);

    const salesByCategory = useMemo(() => {
        const categorySales: { [key: string]: number } = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const category = item.product.category || 'Outros';
                categorySales[category] = (categorySales[category] || 0) + (item.product.price * item.quantity);
            });
        });
        return Object.entries(categorySales).map(([name, value]) => ({ name, value }));
    }, [orders]);

    const topSellingProducts = useMemo(() => {
        const productQuantities: { [key: string]: { name: string, quantity: number } } = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const id = item.product.id;
                if (!productQuantities[id]) {
                    productQuantities[id] = { name: item.product.name, quantity: 0 };
                }
                productQuantities[id].quantity += item.quantity;
            });
        });
        return Object.values(productQuantities).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    }, [orders]);

    const chartConfig = {
        total: { label: 'Vendas (R$)', color: 'hsl(var(--primary))' },
    };
    
    const categoryChartConfig = useMemo(() => {
        const config: any = {};
        salesByCategory.forEach((cat, index) => {
            config[cat.name] = {
                label: cat.name,
                color: `hsl(var(--chart-${(index % 5) + 1}))`,
            };
        });
        return config;
    }, [salesByCategory]);

    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-bold font-headline mb-8"><Skeleton className="h-9 w-48"/></h1>
                <div className="grid gap-8">
                    <Card><CardHeader><Skeleton className="h-7 w-1/3"/></CardHeader><CardContent><Skeleton className="h-80 w-full"/></CardContent></Card>
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card><CardHeader><Skeleton className="h-7 w-1/2"/></CardHeader><CardContent><Skeleton className="h-80 w-full"/></CardContent></Card>
                        <Card><CardHeader><Skeleton className="h-7 w-1/2"/></CardHeader><CardContent><Skeleton className="h-80 w-full"/></CardContent></Card>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <h1 className="text-3xl font-bold font-headline mb-8">Análises</h1>
            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><LineChartIcon className="h-6 w-6"/> Vendas Mensais</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                         <ChartContainer config={chartConfig} className="h-full w-full">
                            <ResponsiveContainer>
                                <LineChart data={monthlySales} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis tickFormatter={(value) => `R$${value}`} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><PieIcon className="h-6 w-6"/>Vendas por Categoria</CardTitle>
                        </CardHeader>
                        <CardContent className="h-80">
                             <ChartContainer config={categoryChartConfig} className="h-full w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={salesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} labelLine={false} label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                             {salesByCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={categoryChartConfig[entry.name]?.color} />
                                            ))}
                                        </Pie>
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Package className="h-6 w-6"/>Produtos Mais Vendidos</CardTitle>
                        </CardHeader>
                        <CardContent className="h-80">
                            <ChartContainer config={{ quantity: { label: 'Quantidade' } }} className="h-full w-full">
                                <ResponsiveContainer>
                                    <BarChart data={topSellingProducts} layout="vertical" margin={{ left: 50, right: 20 }}>
                                        <CartesianGrid horizontal={false} />
                                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={150} />
                                        <XAxis dataKey="quantity" type="number" />
                                        <Tooltip content={<ChartTooltipContent />} cursor={false} />
                                        <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
