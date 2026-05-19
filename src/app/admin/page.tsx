
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, Package, Store, CircleDashed, Power, PowerOff, Calendar as CalendarIcon } from 'lucide-react';
import { getFirebaseApp } from '@/lib/firebase';
import { collection, onSnapshot, doc, getFirestore, getDocs, where, query } from 'firebase/firestore';
import type { Order, StoreSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useStoreStatus } from '@/components/store-status-logic';
import { cn } from '@/lib/utils';
import { getStoreSettings, updateStoreManualStatus } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
}

const presetFilters = [
    { label: 'Hoje', range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
    { label: 'Ontem', range: { from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) } },
    { label: 'Últimos 7 dias', range: { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) } },
    { label: 'Últimos 30 dias', range: { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) } },
];


export default function AdminDashboard() {
  const [allDeliveredOrders, setAllDeliveredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalOrders: 0, totalCustomers: 0, totalProducts: 0 });
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
  });
  const [activePreset, setActivePreset] = useState<string>('Últimos 7 dias');
  
  const { toast } = useToast();
  const app = getFirebaseApp();
  
  const { automaticStatus, scheduleMessage, effectiveStatus } = useStoreStatus();

  // Fetch initial data
  useEffect(() => {
    if (!app) {
        setLoading(false);
        return;
    }
    const db = getFirestore(app);

    const fetchData = async () => {
        setLoading(true);
        try {
            const deliveredOrdersQuery = query(collection(db, 'orders'), where('status', '==', 'delivered'));

            const [ordersSnapshot, productsSnapshot, usersSnapshot, settings] = await Promise.all([
                getDocs(deliveredOrdersQuery),
                getDocs(collection(db, 'products')),
                getDocs(collection(db, 'users')),
                getStoreSettings(),
            ]);

            setStoreSettings(settings);

            const deliveredOrders = ordersSnapshot.docs.map(doc => ({...doc.data(), id: doc.id } as Order));
            setAllDeliveredOrders(deliveredOrders);
            
            setStats(prev => ({
                ...prev,
                totalProducts: productsSnapshot.size,
                totalCustomers: usersSnapshot.size,
            }));

        } catch (error: any) {
            console.error("Erro ao buscar dados do dashboard:", error);
            const isOfflineOrEmpty = error?.code === 'unavailable' || error?.code === 'not-found';
            if (!isOfflineOrEmpty) {
                toast({
                    title: "Erro ao carregar dados",
                    description: "Não foi possível buscar as estatísticas.",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };
    
    fetchData();

    // Listener for store settings
    const settingsDocRef = doc(db, 'store_settings', 'status');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
        if (doc.exists()) {
            setStoreSettings(doc.data() as StoreSettings);
        } else {
            setStoreSettings({ isManuallyOpen: null });
        }
    });

    return () => unsubscribeSettings();
  }, [app, toast]);

  // Recalculate revenue and order count when filter or orders change
  const filteredStats = useMemo(() => {
    const fromDate = dateRange?.from ? startOfDay(dateRange.from) : null;
    const toDate = dateRange?.to ? endOfDay(dateRange.to) : fromDate;

    if (!fromDate || !toDate) {
      const totalRevenue = allDeliveredOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = allDeliveredOrders.length;
      return { totalRevenue, totalOrders };
    }

    const filteredOrders = allDeliveredOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= fromDate && orderDate <= toDate;
    });

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;

    return { totalRevenue, totalOrders };
  }, [dateRange, allDeliveredOrders]);


  const handleManualToggle = async (manualState: boolean) => {
    setStoreSettings({ isManuallyOpen: manualState });
    try {
      await updateStoreManualStatus(manualState);
      toast({
        title: "Controle Manual Ativado",
        description: `A loja agora está FORÇADA ${manualState ? 'ABERTA' : 'FECHADA'}.`,
      });
    } catch (error) {
      setStoreSettings({ isManuallyOpen: storeSettings?.isManuallyOpen ?? null });
      toast({ title: "Erro", description: "Não foi possível alterar o status da loja.", variant: "destructive" });
    }
  };

  const handleSetAutomatic = async () => {
    setStoreSettings({ isManuallyOpen: null });
    try {
      await updateStoreManualStatus(null);
      toast({
        title: "Modo Automático Ativado",
        description: "A loja agora seguirá o horário de funcionamento.",
      });
    } catch (error) {
      setStoreSettings({ isManuallyOpen: storeSettings?.isManuallyOpen ?? null });
      toast({ title: "Erro", description: "Não foi possível reativar o modo automático.", variant: "destructive" });
    }
  };

  const handlePresetFilterClick = (label: string, range: DateRange) => {
    setActivePreset(label);
    setDateRange(range);
  };
  
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    // Se o novo intervalo não corresponder a nenhum preset, desmarque o preset ativo.
    const matchingPreset = presetFilters.find(p => 
      p.range.from?.getTime() === range?.from?.getTime() && 
      p.range.to?.getTime() === range?.to?.getTime()
    );
    setActivePreset(matchingPreset ? matchingPreset.label : 'custom');
  };

  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode, isLoading: boolean) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
        <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
            <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                            </>
                        ) : (
                            format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                        )
                        ) : (
                        <span>Selecione um período</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={handleDateRangeChange}
                        numberOfMonths={2}
                        locale={ptBR}
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8">
            {presetFilters.map(({ label, range }) => (
                <Button
                    key={label}
                    variant={activePreset === label ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetFilterClick(label, range)}
                >
                    {label}
                </Button>
            ))}
        </div>


        <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {renderStatCard(
                    'Receita (Período)',
                    filteredStats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    <DollarSign className="h-4 w-4 text-muted-foreground" />,
                    loading
                )}
                {renderStatCard(
                    'Pedidos (Período)',
                    filteredStats.totalOrders,
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />,
                    loading
                )}
                {renderStatCard(
                    'Total de Clientes',
                    stats.totalCustomers,
                    <Users className="h-4 w-4 text-muted-foreground" />,
                    loading
                )}
                {renderStatCard(
                    'Total de Produtos',
                    stats.totalProducts,
                    <Package className="h-4 w-4 text-muted-foreground" />,
                    loading
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Store className="h-5 w-5"/>
                            Controle da Loja
                        </CardTitle>
                         <CardDescription>
                            Anule o horário automático para abrir ou fechar a loja manualmente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loading ? (
                            <Skeleton className="h-24 w-full" />
                        ) : storeSettings !== null ? (
                             <>
                                <div className="border rounded-lg p-4 space-y-2">
                                     <p className="text-sm font-medium">Status Atual da Loja (Efetivo)</p>
                                     <div className="flex items-center gap-2">
                                         <span className={cn(
                                            "w-3 h-3 rounded-full",
                                            effectiveStatus === 'open' ? 'bg-green-500 animate-pulse' : 'bg-destructive'
                                         )}></span>
                                         <p className="text-lg font-bold">
                                             {effectiveStatus === 'open' ? 'Aberta' : 'Fechada'}
                                         </p>
                                     </div>
                                      <p className="text-xs text-muted-foreground">
                                        {storeSettings.isManuallyOpen !== null
                                        ? `Status manual está ativo. A loja está forçada ${storeSettings.isManuallyOpen ? 'ABERTA' : 'FECHADA'}.`
                                        : `Modo automático. Pelo horário, a loja está ${automaticStatus === 'open' ? 'ABERTA' : 'FECHADA'}. ${scheduleMessage}`
                                        }
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm font-medium">Controles Manuais</p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                         <Button onClick={() => handleManualToggle(true)} disabled={storeSettings.isManuallyOpen === true} variant="outline" className="w-full">
                                            <Power className="mr-2 h-4 w-4 text-green-500"/> Forçar Abrir
                                         </Button>
                                         <Button onClick={() => handleManualToggle(false)} disabled={storeSettings.isManuallyOpen === false} variant="outline" className="w-full">
                                             <PowerOff className="mr-2 h-4 w-4 text-destructive"/> Forçar Fechar
                                         </Button>
                                    </div>
                                    <Button onClick={handleSetAutomatic} disabled={storeSettings.isManuallyOpen === null} className="w-full">
                                        <CircleDashed className="mr-2 h-4 w-4"/> Reativar Modo Automático
                                    </Button>
                                </div>
                             </>
                        ) : (
                            <p className="text-muted-foreground">Não foi possível carregar o status da loja.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
