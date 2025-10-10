#!/bin/bash

# Enhanced Deploy to Base Sepolia script
echo "🚀 Preparing to deploy vault to Base Sepolia..."

# Parse command line arguments
VERIFY="true"
TOKEN_TYPE="USDC"
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --no-verify) VERIFY="false"; shift ;;
    --token) TOKEN_TYPE="$2"; shift 2 ;;
    --help) 
      echo "Usage: $0 [--no-verify] [--token USDC|USDT]"
      echo "  --no-verify: Skip contract verification"
      echo "  --token: Token type to deploy (USDC, USDT)"
      exit 0 ;;
    *) echo "Unknown parameter: $1. Use --help for usage information."; exit 1 ;;
  esac
done

echo "📋 Configuration:"
echo "  Token: $TOKEN_TYPE"
echo "  Verification: $VERIFY"

# Check for .env file
if [ ! -f .env ]; then
  echo "📝 No .env file found. Creating a template..."
  cat > .env << EOF
# Private key of the deployer account
PRIVATE_KEY=

# API Key for BaseScan (for contract verification)
ETHERSCAN_API_KEY=

# Token type to deploy (USDC, USDT)
# TOKEN_TYPE=USDC

# Flag to control automatic verification (default: true)
# VERIFY_CONTRACTS=true

# Delay between contract verifications in seconds (default: 15)
# VERIFICATION_DELAY=15
EOF
  echo "✅ .env template created. Please fill in your private key and other details."
  exit 1
fi

# Check if private key is set
if grep -q "PRIVATE_KEY=$" .env; then
  echo "❌ PRIVATE_KEY is not set in .env file. Please edit it before continuing."
  exit 1
fi

# Check if API key is set (only if verification is enabled)
if [ "$VERIFY" == "true" ] && (! grep -q "ETHERSCAN_API_KEY=" .env || grep -q "ETHERSCAN_API_KEY=$" .env); then
  echo "⚠️ ETHERSCAN_API_KEY is not set in .env file. Contract verification will likely fail."
  echo "Press Enter to continue anyway, or Ctrl+C to abort and update your .env file."
  read
fi

# Validate token type
if [[ "$TOKEN_TYPE" != "USDC" && "$TOKEN_TYPE" != "USDT" ]]; then
  echo "❌ Invalid token type: $TOKEN_TYPE. Must be USDC or USDT."
  exit 1
fi

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile

# Run deployment with enhanced script
echo "🚀 Running enhanced deployment script on Base Sepolia..."
echo "📊 Token: $TOKEN_TYPE"
echo "🔍 Verification: $VERIFY"

VERIFY_CONTRACTS=$VERIFY TOKEN_TYPE=$TOKEN_TYPE npx hardhat run scripts/deploy-vault-enhanced.js --network baseSepolia

# Deployment completed message
echo ""
echo "🎉 ==========================================================="
echo "✅ Deployment completed successfully!"
echo "📋 Summary:"
echo "   Network: Base Sepolia"
echo "   Token: $TOKEN_TYPE"
echo "   Verification: $VERIFY"
echo ""
echo "🔗 To interact with the vault:"
echo "1. Edit scripts/interact-with-vault.js to add your vault address"
echo "2. Run the following command:"
echo "   npx hardhat run scripts/interact-with-vault.js --network baseSepolia"
echo ""
echo "📊 To deploy other tokens:"
echo "   ./scripts/deploy-to-base-sepolia.sh --token USDT"
echo "   ./scripts/deploy-to-base-sepolia.sh --token USDC"
echo "===========================================================" 