#!/bin/bash
# Test token launch script for PUMP-MCP

echo "🚀 Testing Token Launch on Pump.fun"
echo ""

# Check if account has balance
node -e "
const { Connection, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const keysPath = path.join(process.cwd(), 'keys/solana/id.json');
const keypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(keysPath, 'utf8')))
);

const rpcUrl = process.env.HELIUS_RPC_URL;
if (!rpcUrl) {
  console.error('❌ HELIUS_RPC_URL environment variable is not set');
  console.error('💡 Please set it in your .env file or export it:');
  console.error('   export HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"');
  process.exit(1);
}
const connection = new Connection(rpcUrl);

connection.getBalance(keypair.publicKey).then(balance => {
  const solBalance = balance / 1e9;
  console.log('📊 Account:', keypair.publicKey.toString());
  console.log('💰 Balance:', solBalance.toFixed(4), 'SOL');
  console.log('');
  
  if (solBalance < 0.05) {
    console.log('⚠️  Insufficient balance! Please send at least 0.05 SOL to:');
    console.log('   ' + keypair.publicKey.toString());
    console.log('');
    console.log('💡 You need:');
    console.log('   - 0.01 SOL for initial buy');
    console.log('   - ~0.003 SOL for transaction fees');
    console.log('   - Some buffer for safety');
    process.exit(1);
  } else {
    console.log('✅ Sufficient balance! Ready to launch token.');
    console.log('');
    console.log('🎯 To launch a test token, run:');
    console.log('   node build/create-token.js "TestToken" "TEST" "My test token on Pump.fun" 0.01');
    process.exit(0);
  }
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
"
