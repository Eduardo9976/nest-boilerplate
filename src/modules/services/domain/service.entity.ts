
export interface Service {
    id: string;
    name: string;
    description?: string;
    durationInMinutes: number;
    price: number;
    isActive: boolean;
    categoryId: string;
    imageUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}
