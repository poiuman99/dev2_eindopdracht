// server/services/orderService.ts

import sql from "./db"; // Gebruik je eigen db import hier
import { Order, OrderItem, MonthlyOrdersStats, YearlyRevenueStats, OrderStatus } from "./interfaces";

/**
 * Voeg een nieuwe bestelling toe aan de database.
 * @param newOrderData De basisgegevens van de bestelling (excl. id, order_date, total_cost_price).
 * @param items De lijst met bestelde items (excl. id, order_id, unit_cost_price).
 * @returns De aangemaakte bestelling of null bij falen.
 */
export const addOrder = async (newOrderData: Omit<Order, 'id' | 'order_date' | 'total_cost_price'>, items: Omit<OrderItem, 'id' | 'order_id' | 'unit_cost_price'>[]): Promise<Order | null> => {
    // Verwijder total_cost_price uit de insert
    const { total_price, status, customer_name, notes } = newOrderData;

    const [order] = await sql`
        INSERT INTO orders (total_price, status, customer_name, notes)
        VALUES (${total_price}, ${status}, ${customer_name}, ${notes})
        RETURNING id, order_date, total_price, status, customer_name, notes; -- Update RETURNING
    `;

    if (!order) {
        console.error("Error adding order: No order data returned.");
        return null;
    }

    // Voeg order_id toe aan elk item en insert ze
    const itemsToInsert = items.map(item => ({
        ...item,
        order_id: order.id,
        // unit_cost_price: 0 // Stel in op 0 als de kolom is verwijderd
    }));

    // Verwijder unit_cost_price uit de insert
    const insertedItems = await sql`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price)
        VALUES ${sql(itemsToInsert, 'order_id', 'product_id', 'product_name', 'quantity', 'unit_price')}
        RETURNING id, order_id, product_id, product_name, quantity, unit_price; -- Update RETURNING
    `;

    // Pas het geretourneerde type aan naar Order, rekening houdend met de eventuele verwijdering van total_cost_price
    // Maak een tijdelijk object dat overeenkomt met de Order interface
    const finalOrder: Order = {
        id: order.id,
        order_date: order.order_date,
        total_price: parseFloat(order.total_price),
        status: order.status as OrderStatus,
        customer_name: order.customer_name,
        notes: order.notes,
        // total_cost_price is hier 0 of afwezig als de kolom is gedropt
        // Als de kolom echt weg is, dan deze regel weglaten, anders op 0 zetten
        // total_cost_price: 0,
        items: insertedItems.map(item => ({
            id: item.id,
            order_id: item.order_id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price),
            // unit_cost_price: 0 // Ook hier op 0 of weglaten
        }))
    };
    return finalOrder;
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

    orders.forEach(order => { // <-- Deze lijn
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

    orders.forEach(order => { // <-- Deze lijn
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