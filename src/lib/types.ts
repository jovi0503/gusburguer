

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  onSale?: boolean;
  isActive?: boolean;
};

// Um tipo simplificado de Produto para ser usado dentro de um Pedido (Order)
// Isso evita armazenar dados desnecessários ou não serializáveis no Firestore.
export type OrderItemProduct = Omit<Product, 'description' | 'stock' | 'onSale' | 'isActive'>;


export type Category = {
  id: string;
  name: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type OrderStatus = 'pending' | 'processing' | 'delivering' | 'delivered' | 'cancelled';

export type StatusHistoryEntry = {
  status: OrderStatus;
  timestamp: number;
};

// Type for the local user store (guest checkout)
export type LocalUser = {
    name: string;
    phone: string;
}

export type Order = {
  id:string;
  userId: string;
  items: { product: OrderItemProduct; quantity: number }[];
  status: OrderStatus;
  createdAt: number;
  statusHistory: StatusHistoryEntry[];
  total: number;
  shippingCost: number;
  shippingAddress: Address;
  paymentMethod: 'card' | 'cash';
  changeFor?: number;
  user?: LocalUser;
};

export type Address = {
    id: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
};

// Types for Google Maps API
export type GeocodeResult = {
    lat: number;
    lng: number;
}

export type DistanceResult = {
    distance: {
        text: string; // e.g., "5.4 km"
        value: number; // e.g., 5429 (in meters)
    };
    duration: {
        text: string; // e.g., "15 mins"
        value: number; // e.g., 900 (in seconds)
    };
    status: string;
}

export type StoreSettings = {
    isManuallyOpen: boolean | null; // null = automatic, true = forced open, false = forced closed
};
