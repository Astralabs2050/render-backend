export enum FashionCategory {
    DRESSES = 'Dresses',
    TOPS = 'Tops',
    BOTTOMS = 'Bottoms',
}

export const CATEGORY_DESCRIPTIONS = {
    [FashionCategory.DRESSES]: 'Dresses, gowns, and dress-like garments',
    [FashionCategory.TOPS]: 'Shirts, blouses, t-shirts, tanks, and upper body wear',
    [FashionCategory.BOTTOMS]: 'Pants, jeans, shorts, skirts, and lower body wear',
};

// Mapping for garment types to categories
export const GARMENT_TYPE_TO_CATEGORY: Record<string, FashionCategory> = {
    // Dresses
    'dress': FashionCategory.DRESSES,
    'gown': FashionCategory.DRESSES,
    'maxi': FashionCategory.DRESSES,
    'midi': FashionCategory.DRESSES,
    'mini': FashionCategory.DRESSES,
    'cocktail': FashionCategory.DRESSES,
    'evening': FashionCategory.DRESSES,
    'sundress': FashionCategory.DRESSES,

    // Tops
    'shirt': FashionCategory.TOPS,
    'blouse': FashionCategory.TOPS,
    'top': FashionCategory.TOPS,
    'tank': FashionCategory.TOPS,
    'camisole': FashionCategory.TOPS,
    'tunic': FashionCategory.TOPS,
    'sweater': FashionCategory.TOPS,
    'cardigan': FashionCategory.TOPS,
    'hoodie': FashionCategory.TOPS,
    'sweatshirt': FashionCategory.TOPS,
    'turtleneck': FashionCategory.TOPS,
    'crop': FashionCategory.TOPS,
    'jacket': FashionCategory.TOPS,
    'coat': FashionCategory.TOPS,
    'blazer': FashionCategory.TOPS,
    'vest': FashionCategory.TOPS,
    'windbreaker': FashionCategory.TOPS,
    'parka': FashionCategory.TOPS,
    'trench': FashionCategory.TOPS,
    'bomber': FashionCategory.TOPS,
    'denim jacket': FashionCategory.TOPS,
    'suit': FashionCategory.TOPS,
    'tuxedo': FashionCategory.TOPS,
    'formal': FashionCategory.TOPS,
    'business suit': FashionCategory.TOPS,

    // Bottoms
    'pants': FashionCategory.BOTTOMS,
    'trousers': FashionCategory.BOTTOMS,
    'jeans': FashionCategory.BOTTOMS,
    'shorts': FashionCategory.BOTTOMS,
    'skirt': FashionCategory.BOTTOMS,
    'leggings': FashionCategory.BOTTOMS,
    'capris': FashionCategory.BOTTOMS,
    'chinos': FashionCategory.BOTTOMS,
    'slacks': FashionCategory.BOTTOMS,
};

export class CategoryService {
    /**
     * Detect category from text prompt or description
     */
    static detectCategory(text: string): FashionCategory {
        const lowerText = text.toLowerCase();

        // Check for exact matches first
        for (const [garmentType, category] of Object.entries(GARMENT_TYPE_TO_CATEGORY)) {
            if (lowerText.includes(garmentType)) {
                return category;
            }
        }

        // Fallback to tops as default
        return FashionCategory.TOPS;
    }

    /**
     * Get all available categories
     */
    static getAllCategories(): FashionCategory[] {
        return Object.values(FashionCategory);
    }

    /**
     * Get category description
     */
    static getCategoryDescription(category: FashionCategory): string {
        return CATEGORY_DESCRIPTIONS[category] || 'Fashion item';
    }

    /**
     * Validate if a category is valid
     */
    static isValidCategory(category: string): boolean {
        return Object.values(FashionCategory).includes(category as FashionCategory);
    }

    /**
     * Normalize category string to enum value
     */
    static normalizeCategory(category: string): FashionCategory {
        // Try exact match first
        if (this.isValidCategory(category)) {
            return category as FashionCategory;
        }

        // Try to detect from the category string
        return this.detectCategory(category);
    }
}