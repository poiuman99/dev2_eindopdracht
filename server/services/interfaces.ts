export interface MenuItem {
    id: number;
    name: string;
    price: number;
    description?: string | null; // Optioneel
    imageUrl?: string | null;   // Optioneel
    options?: any;             // Kan JSONB zijn, dus 'any' voor flexibiliteit, of specifieker type indien bekend
    categoryName?: string;     // Voor weergave in lijsten
    categoryId?: number;       // Voor formulieren en koppeling in DB
}

export interface Category {
    id: number;
    name: string;
}
// Voeg hier eventueel andere interfaces toe, zoals voor Order of OrderItem