// server/services/interfaces.ts

// Bestaande interfaces
export interface Category {
    id: number;
    name: string;
}

export interface MenuItem {
    id: number;
    name: string;
    description: string | null;
    price: number;
    categoryId: number;
    categoryName?: string; // Optioneel, toegevoegd bij JOIN
    imageUrl: string | null;
    options: any | null; // JSONB kolom in Supabase
    // cost_price: number; // <-- VERWIJDER DEZE REGEL
}

// NIEUWE INTERFACES VOOR BESTELLINGEN

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number | null; // Nullable als product verwijderd wordt
    product_name: string;
    quantity: number;
    unit_price: number;
    // unit_cost_price: number; // <-- VERWIJDER DEZE REGEL indien je de kolom dropt
}

export interface Order {
    id: number;
    order_date: string; // ISO string, of Date object als je deze parset
    total_price: number;
    // total_cost_price: number; // <-- VERWIJDER DEZE REGEL indien je de kolom dropt
    status: OrderStatus;
    customer_name: string | null;
    notes: string | null;
    items?: OrderItem[]; // Optioneel: de items die bij deze bestelling horen
}

// Voor de statistieken
export interface MonthlyOrdersStats {
    month: string; // Bijv. "Januari", "Februari"
    totalOrders: number;
    totalRevenue: number; // Verkoopprijs
    totalProfit: number; // <-- Houd deze eventueel op 0 als je geen kostprijzen hebt
}

export interface YearlyRevenueStats {
    year: number;
    totalRevenue: number;
    totalProfit: number; // <-- Houd deze eventueel op 0 als je geen kostprijzen hebt
}