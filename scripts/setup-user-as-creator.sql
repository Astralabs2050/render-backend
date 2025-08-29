-- Setup User as Creator Script
-- This script updates the existing user to be a creator and adds dummy NFT designs

-- Step 1: Update user to be a creator with brand details
UPDATE users SET 
    "userType" = 'creator',
    "profileCompleted" = true,
    "brandName" = 'Kases Fashion Brand',
    "brandOrigin" = 'Digital Fashion',
    "brandStory" = 'A creative fashion brand focused on innovative designs',
    "updatedAt" = NOW()
WHERE email = 'kases14120@discrip.com';

-- Step 2: Get the user ID for reference
DO $$
DECLARE
    user_id UUID;
    existing_count INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM users WHERE email = 'kases14120@discrip.com';
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not found with email: kases14120@discrip.com';
    END IF;
    
    RAISE NOTICE 'Found user with ID: %', user_id;
    
    -- Check if user already has NFT designs
    SELECT COUNT(*) INTO existing_count FROM nfts WHERE "creatorId" = user_id;
    
    IF existing_count > 0 THEN
        RAISE NOTICE 'User already has % NFT designs. Skipping creation.', existing_count;
    ELSE
        -- Create dummy NFT designs for this user
        INSERT INTO nfts (
            id, name, description, category, price, quantity, status, 
            "imageUrl", "creatorId", metadata, attributes, 
            "createdAt", "updatedAt"
        ) VALUES 
        (
            gen_random_uuid(),
            'Summer Collection Dress',
            'Beautiful summer dress design with floral patterns',
            'Dress',
            150.00,
            1,
            'listed',
            'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=400&fit=crop',
            user_id,
            '{"colors": ["blue", "white"], "materials": ["cotton", "polyester"], "style": "casual", "season": "summer"}',
            '[{"trait_type": "Style", "value": "Casual"}, {"trait_type": "Season", "value": "Summer"}, {"trait_type": "Material", "value": "Cotton Blend"}]',
            NOW(),
            NOW()
        ),
        (
            gen_random_uuid(),
            'Winter Coat Design',
            'Elegant winter coat with modern styling',
            'Coat',
            200.00,
            1,
            'minted',
            'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=400&fit=crop',
            user_id,
            '{"colors": ["black", "navy"], "materials": ["wool", "cashmere"], "style": "formal", "season": "winter"}',
            '[{"trait_type": "Style", "value": "Formal"}, {"trait_type": "Season", "value": "Winter"}, {"trait_type": "Material", "value": "Wool Blend"}]',
            NOW(),
            NOW()
        ),
        (
            gen_random_uuid(),
            'Casual T-Shirt',
            'Comfortable casual wear for everyday use',
            'T-Shirt',
            50.00,
            1,
            'draft',
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
            user_id,
            '{"colors": ["white", "gray"], "materials": ["cotton"], "style": "casual", "season": "all-season"}',
            '[{"trait_type": "Style", "value": "Casual"}, {"trait_type": "Season", "value": "All Season"}, {"trait_type": "Material", "value": "100% Cotton"}]',
            NOW(),
            NOW()
        ),
        (
            gen_random_uuid(),
            'Evening Gown',
            'Stunning evening gown for special occasions',
            'Gown',
            350.00,
            1,
            'listed',
            'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop',
            user_id,
            '{"colors": ["red", "black"], "materials": ["silk", "satin"], "style": "formal", "season": "all-season"}',
            '[{"trait_type": "Style", "value": "Formal"}, {"trait_type": "Occasion", "value": "Evening"}, {"trait_type": "Material", "value": "Silk Blend"}]',
            NOW(),
            NOW()
        ),
        (
            gen_random_uuid(),
            'Denim Jacket',
            'Classic denim jacket with modern twist',
            'Jacket',
            120.00,
            1,
            'minted',
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
            user_id,
            '{"colors": ["blue", "indigo"], "materials": ["denim"], "style": "casual", "season": "spring"}',
            '[{"trait_type": "Style", "value": "Casual"}, {"trait_type": "Season", "value": "Spring"}, {"trait_type": "Material", "value": "100% Denim"}]',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created 5 dummy NFT designs for user: %', user_id;
    END IF;
END $$;

-- Step 3: Verify the setup
SELECT 
    'User Updated' as status,
    id,
    email,
    "fullName",
    "userType",
    "profileCompleted",
    "brandName",
    "brandOrigin"
FROM users 
WHERE email = 'kases14120@discrip.com';

-- Step 4: Show the NFT designs
SELECT 
    'NFT Designs' as status,
    name,
    category,
    price,
    status,
    "imageUrl"
FROM nfts 
WHERE "creatorId" IN (
    SELECT id FROM users WHERE email = 'kases14120@discrip.com'
)
ORDER BY "updatedAt" DESC;

-- Step 5: Count total designs
SELECT 
    'Summary' as status,
    COUNT(*) as total_designs,
    COUNT(CASE WHEN status = 'listed' THEN 1 END) as listed_designs,
    COUNT(CASE WHEN status = 'minted' THEN 1 END) as minted_designs,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_designs
FROM nfts 
WHERE "creatorId" IN (
    SELECT id FROM users WHERE email = 'kases14120@discrip.com'
);
