

import { getFirebaseApp } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc, limit, orderBy, arrayUnion, arrayRemove, getFirestore } from 'firebase/firestore';
import type { Order, Product, UserProfile, Category, StoreSettings, StatusHistoryEntry, OrderStatus, LocalUser, OrderItemProduct } from './types';
import { useUserStore } from '@/store/user';

// ATENÇÃO: Este arquivo é para código que pode rodar no cliente.
// Funções que usam 'firebase-admin' devem ficar em Server Components.


// --- PRODUCT FUNCTIONS ---

export async function getProducts(): Promise<Product[]> {
    const app = getFirebaseApp();
    if (!app) return [];
    const db = getFirestore(app);
    const q = query(collection(db, 'products'), orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    const products: Product[] = [];
    snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() } as Product);
    });
    return products;
}


export async function getProductById(id: string): Promise<Product | null> {
    const app = getFirebaseApp();
    if (!app) return null;
    const db = getFirestore(app);
    const productDoc = doc(db, 'products', id);
    const docSnap = await getDoc(productDoc);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Product;
    }
    return null;
}

export async function addProduct(productData: Omit<Product, 'id'>) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const docRef = await addDoc(collection(db, 'products'), productData);
    return docRef.id;
}

export async function updateProduct(id: string, productData: Partial<Product>) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const productDoc = doc(db, 'products', id);
    await updateDoc(productDoc, productData);
}

export async function deleteProduct(id: string) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const productDoc = doc(db, 'products', id);
    await deleteDoc(productDoc);
}


// --- CATEGORY FUNCTIONS ---

export async function getCategories(): Promise<Category[]> {
    const app = getFirebaseApp();
    if (!app) return [];
    const db = getFirestore(app);
    const q = query(collection(db, 'categories'), orderBy("name", "asc"));
    const snapshot = await getDocs(q);
    const categories: Category[] = [];
    snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() } as Category);
    });
    return categories;
}

export async function addCategory(categoryData: Omit<Category, 'id'>) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const docRef = await addDoc(collection(db, 'categories'), categoryData);
    return docRef.id;
}

export async function updateCategory(id: string, categoryData: Partial<Category>) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const categoryDoc = doc(db, 'categories', id);
    await updateDoc(categoryDoc, categoryData);
}

export async function deleteCategory(id: string) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const categoryDoc = doc(db, 'categories', id);
    await deleteDoc(categoryDoc);
}


// --- ORDER FUNCTIONS ---

// Modified to accept an ID for consistency and update user profile
export async function addOrder(orderData: Omit<Order, 'statusHistory'>, id: string) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    
    // Create the initial status history entry
    const initialStatusHistory: StatusHistoryEntry[] = [
        { status: 'pending', timestamp: orderData.createdAt }
    ];

    const finalOrderData: Order = {
        ...orderData,
        statusHistory: initialStatusHistory
    };
    
    // 1. Save the order
    const orderDocRef = doc(db, 'orders', id);
    await setDoc(orderDocRef, finalOrderData);

    // 2. Add the order ID to the local user store
    useUserStore.getState().addOrderId(id);

    return id;
}


export async function getOrders(): Promise<Order[]> {
    const app = getFirebaseApp();
    if (!app) return [];
    const db = getFirestore(app);
    const q = query(collection(db, 'orders'));
    const snapshot = await getDocs(q);
    const orders: Order[] = [];
    snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    // Sort manually after fetching
    return orders.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getOrderById(orderId: string): Promise<Order | null> {
    const app = getFirebaseApp();
    if (!app) return null;
    const db = getFirestore(app);
    const orderDocRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(orderDocRef);
    if (docSnap.exists()) {
        const orderData = docSnap.data() as Order;
        // Backward compatibility: if statusHistory doesn't exist, create it from existing status.
        if (!orderData.statusHistory) {
            orderData.statusHistory = [{ status: orderData.status, timestamp: orderData.createdAt }];
        }
        return { id: docSnap.id, ...orderData };
    }
    return null;
}

/**
 * Fetches multiple orders by their IDs.
 * This is used for guest users to retrieve their order history.
 */
export async function getOrdersByIds(orderIds: string[]): Promise<Order[]> {
    if (orderIds.length === 0) return [];
    
    // Use Promise.all to fetch all orders concurrently.
    const orderPromises = orderIds.map(id => getOrderById(id));
    const results = await Promise.all(orderPromises);
    
    // Filter out any null results (if an order wasn't found) and sort by creation date.
    const orders = results.filter((order): order is Order => order !== null);
    return orders.sort((a, b) => b.createdAt - a.createdAt);
}


export async function getOrdersByUserId(userId: string): Promise<Order[]> {
    const app = getFirebaseApp();
    if (!app) return [];
    const db = getFirestore(app);
    const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const orders: Order[] = [];
    snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    return orders;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const orderDoc = doc(db, 'orders', orderId);

    const newStatusEntry: StatusHistoryEntry = {
        status: status,
        timestamp: Date.now()
    };

    // 1. Update the document
    await updateDoc(orderDoc, { 
        status: status,
        statusHistory: arrayUnion(newStatusEntry)
    });
}

export async function updateOrderItems(orderId: string, items: { product: OrderItemProduct; quantity: number }[], total: number) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const orderDoc = doc(db, 'orders', orderId);
    await updateDoc(orderDoc, { items, total });
}



// --- USER FUNCTIONS (for Admin) ---

export async function getUsers(): Promise<UserProfile[]> {
    const app = getFirebaseApp();
    if (!app) return [];
    const db = getFirestore(app);
    const snapshot = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];
    snapshot.forEach(doc => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
    });
    return users;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const app = getFirebaseApp();
    if (!app) return null;
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', userId);
    // Use setDoc com merge para criar/atualizar
    await setDoc(userDocRef, data, { merge: true });
}


// --- STORE SETTINGS FUNCTIONS ---

const SETTINGS_COLLECTION = 'store_settings';
const STORE_STATUS_DOC_ID = 'status';

export async function getStoreSettings(): Promise<StoreSettings> {
    const app = getFirebaseApp();
    // Default para modo automático se não houver configuração
    if (!app) return { isManuallyOpen: null }; 
    const db = getFirestore(app);
    const docRef = doc(db, SETTINGS_COLLECTION, STORE_STATUS_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as StoreSettings;
    }
    // Default to automatic mode if not set
    return { isManuallyOpen: null };
}


export async function updateStoreManualStatus(isManuallyOpen: boolean | null) {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized");
    const db = getFirestore(app);
    const docRef = doc(db, SETTINGS_COLLECTION, STORE_STATUS_DOC_ID);
    await setDoc(docRef, { isManuallyOpen }, { merge: true });
}
