// server/services/orderService.ts

import sql  from './db';
import { Order, OrderItem, MonthlyOrdersStats, YearlyRevenueStats, OrderStatus } from './interfaces';

/**
 * Voeg een nieuwe bestelling toe aan de database.
 * @param newOrderData De basisgegevens van de bestelling (excl. id, order_date, total_cost_price).
 * @param items De lijst met bestelde items (excl. id, order_id, unit_cost_price).
 * @returns De aangemaakte bestelling of undefined bij falen.
 */
// Aangepast: 'unit_cost_price' verwijderd uit de Omit type, want de kolom bestaat niet in de DB
export const addOrder = async (orderData: Omit<Order, 'id' | 'order_date' | 'total_cost_price'>, items: Omit<OrderItem, 'id' | 'order_id'>[]): Promise<Order | undefined> => {
    try {
        // --- Begin Debug logs (optioneel, kan uitcommentariëren of verwijderen als het werkt) ---
        console.log('--- Debugging addOrder function start ---');
        console.log('Received orderData:', orderData);
        console.log('Received items array:', items);
        if (items && items.length > 0) {
            items.forEach((item, idx) => {
                console.log(`Received item ${idx}:`, item);
            });
        }
        console.log('-----------------------------------');
        // --- Einde Debug logs ---

        // 1. Hoofdbestelling invoegen in de 'orders' tabel
        const [order] = await sql<Order[]>`
            INSERT INTO orders
                (customer_name, total_price, status, notes)
            VALUES
                (${orderData.customer_name}, ${orderData.total_price}, ${orderData.status}, ${orderData.notes})
            RETURNING *
        `;

        // 2. Bestelitems invoegen in de 'order_items' tabel
        if (order && items.length > 0) {
            for (const item of items) {
                // --- Begin Debug logs voor item invoeging (optioneel) ---
                console.log('--- Debugging Item for DB Insert ---');
                console.log('Order ID:', order.id);
                console.log('Item Product ID:', typeof item.product_id, item.product_id);
                console.log('Item Product Name:', typeof item.product_name, item.product_name);
                console.log('Item Quantity:', typeof item.quantity, item.quantity);
                console.log('Item Unit Price:', typeof item.unit_price, item.unit_price);
                console.log('---------------------------------');
                // --- Einde Debug logs ---

                await sql`
                    INSERT INTO order_items
                        (order_id, product_id, product_name, quantity, unit_price)
                    VALUES
                        (${order.id}, ${item.product_id}, ${item.product_name}, ${item.quantity}, ${item.unit_price})
                `;
            }
        }
        
        // 3. De aangemaakte hoofdbestelling teruggeven
        return order;

    } catch (error) {
        console.error('Error adding order:', error);
        throw error; // Belangrijk: gooi de fout door zodat deze in routes.ts wordt opgevangen
    }
};

/**
 * Haalt het aantal bestellingen van vandaag op, gesplitst op status.
 * @returns Een object met het aantal 'pending' en 'completed' bestellingen voor vandaag.
 */
export const getDailyOrderCounts = async (): Promise<{ total: number; pending: number; completed: number }> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Begin van vandaag
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Begin van morgen

    const orders = await sql`
        SELECT id, status
        FROM orders
        WHERE order_date >= ${today.toISOString()} AND order_date < ${tomorrow.toISOString()};
    ` as { id: number; status: string }[]; // <-- Expliciet type toevoegen

    const total = orders.length;
    const pending = orders.filter(order => order.status === 'pending').length;
    const completed = orders.filter(order => order.status === 'completed').length;

    return { total, pending, completed };
};


/**
 * Haalt bestellingen op per maand, inclusief omzet (winst is 0 als kostprijs weg is).
 * @returns Een array met statistieken per maand.
 */
export const getMonthlyOrderStats = async (): Promise<MonthlyOrdersStats[]> => {
    // We selecteren hier alleen de kolommen die we nodig hebben, dus 'total_cost_price' is weggelaten
    const orders = await sql`
        SELECT order_date, total_price
        FROM orders;
    ` as { order_date: string; total_price: string }[]; // <-- Expliciet type toevoegen (numeric komt als string)

    const statsMap = new Map<string, MonthlyOrdersStats>();
    const monthNames = [
        "Januari", "Februari", "Maart", "April", "Mei", "Juni",
        "Juli", "Augustus", "September", "Oktober", "November", "December"
    ];

    orders.forEach(order => {
        const orderDate = new Date(order.order_date);
        const monthIndex = orderDate.getMonth();
        const year = orderDate.getFullYear();
        const monthKey = `${monthNames[monthIndex]} ${year}`; // Bijv. "Januari 2025"

        if (!statsMap.has(monthKey)) {
            statsMap.set(monthKey, {
                month: monthNames[monthIndex],
                totalOrders: 0,
                totalRevenue: 0,
                totalProfit: 0 // Zet winst op 0 als je geen kostprijzen bijhoudt
            });
        }

        const currentStats = statsMap.get(monthKey)!;
        currentStats.totalOrders += 1;
        currentStats.totalRevenue += parseFloat(order.total_price);
    });

    // Sorteer per jaar en maand
    const sortedStats = Array.from(statsMap.entries()).sort(([keyA], [keyB]) => {
        const [monthNameA, yearA] = keyA.split(' ');
        const [monthNameB, yearB] = keyB.split(' ');
        const monthIndexA = monthNames.indexOf(monthNameA);
        const monthIndexB = monthNames.indexOf(monthNameB);

        // Dit is een betere sortering die ook rekening houdt met jaren
        const dateA = new Date(parseInt(yearA), monthIndexA);
        const dateB = new Date(parseInt(yearB), monthIndexB);
        return dateA.getTime() - dateB.getTime();

    }).map(([, value]) => value);


    return sortedStats;
};


/**
 * Haalt de omzet per jaar op (winst is 0 als kostprijs weg is).
 * @returns Een array met statistieken per jaar.
 */
export const getYearlyRevenueStats = async (): Promise<YearlyRevenueStats[]> => {
    const orders = await sql`
        SELECT order_date, total_price
        FROM orders;
    ` as { order_date: string; total_price: string }[]; // <-- Expliciet type toevoegen

    const statsMap = new Map<number, YearlyRevenueStats>();

    orders.forEach(order => {
        const orderDate = new Date(order.order_date);
        const year = orderDate.getFullYear();

        if (!statsMap.has(year)) {
            statsMap.set(year, {
                year: year,
                totalRevenue: 0,
                totalProfit: 0 // Zet winst op 0 als je geen kostprijzen bijhoudt
            });
        }

        const currentStats = statsMap.get(year)!;
        currentStats.totalRevenue += parseFloat(order.total_price);
    });

    // Sorteer per jaar
    const sortedStats = Array.from(statsMap.values()).sort((a, b) => a.year - b.year);

    return sortedStats;
};

/**
 * Haalt alle bestellingen op uit de database.
 * @returns Een array van Order objecten.
 */
export const getOrders = async (): Promise<Order[]> => {
    try {
        // Haalt alle orders op, sorteert ze op datum (meest recente eerst)
        // Let op: 'total_price' komt waarschijnlijk als string, converteer dit indien nodig bij gebruik.
        const orders = await sql<Order[]>`
            SELECT
                id,
                customer_name,
                order_date,
                total_price,
                status,
                notes
            FROM orders
            ORDER BY order_date DESC;
        `;
        return orders;
    } catch (error) {
        console.error('Error in getOrders:', error);
        throw error;
    }
};
export const getOrderDetails = async (orderId: number): Promise<(Order & { items: OrderItem[] }) | undefined> => {
    try {
        // Haal de hoofdbestelling op
        const [order] = await sql<Order[]>`
            SELECT
                id,
                customer_name,
                order_date,
                total_price,
                status,
                notes
            FROM orders
            WHERE id = ${orderId};
        `;

        if (!order) {
            return undefined; // Bestelling niet gevonden
        }

        // Haal de items van deze bestelling op
        const items = await sql<OrderItem[]>`
            SELECT
                id,
                product_id,
                product_name,
                quantity,
                unit_price
            FROM order_items
            WHERE order_id = ${orderId};
        `;

        // Voeg de items toe aan het bestellingsobject
        return { ...order, items };

    } catch (error) {
        console.error(`Error in getOrderDetails for orderId ${orderId}:`, error);
        throw error;
    }
};