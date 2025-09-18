const { ethers } = require('ethers');

// Generate a new wallet for backend service
const wallet = ethers.Wallet.createRandom();

console.log('=== SERVICE WALLET GENERATED ===');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('');
console.log('Add this to your .env file:');
console.log(`THIRDWEB_PRIVATE_KEY=${wallet.privateKey}`);
console.log('');
console.log('⚠️  IMPORTANT: Keep this private key secure!');
console.log('⚠️  Never commit it to version control');
console.log('⚠️  Fund this wallet with some MATIC for gas fees');
console.log('================================');