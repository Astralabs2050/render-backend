-- Check User Script
-- Check if the user exists and their current role

-- Check if user exists
SELECT 
    id,
    email,
    "fullName",
    "userType",
    "profileCompleted",
    "brandName",
    "brandOrigin",
    "createdAt",
    "updatedAt"
FROM users 
WHERE email = 'kases14120@discrip.com';

-- Check all users with creator role
SELECT 
    id,
    email,
    "fullName",
    "userType",
    "profileCompleted",
    "brandName",
    "createdAt"
FROM users 
WHERE "userType" = 'creator'
ORDER BY "createdAt" DESC;

-- Check if user has any NFT designs
SELECT 
    COUNT(*) as total_designs,
    COUNT(CASE WHEN status = 'listed' THEN 1 END) as listed_designs,
    COUNT(CASE WHEN status = 'minted' THEN 1 END) as minted_designs,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_designs
FROM nfts 
WHERE "creatorId" IN (
    SELECT id FROM users WHERE email = 'kases14120@discrip.com'
);
