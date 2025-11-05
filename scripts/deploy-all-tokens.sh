#!/bin/bash

# Enhanced script to deploy all tokens (USDC, USDT for Base Sepolia; USDC, WETH, BTC for Base Mainnet) to Base networks
echo "🚀 Multi-Token Deployment Script for Base Networks"
echo "=================================================="

# Parse command line arguments
NETWORK=""
VERIFY="true"
TOKENS="USDC,USDT,WETH"
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --network) NETWORK="$2"; shift 2 ;;
    --no-verify) VERIFY="false"; shift ;;
    --tokens) TOKENS="$2"; shift 2 ;;
    --help) 
      echo "Usage: $0 --network <base|baseSepolia> [--no-verify] [--tokens USDC,USDT,WETH]"
      echo "  --network: Target network (base or baseSepolia)"
      echo "  --no-verify: Skip contract verification"
      echo "  --tokens: Comma-separated list of tokens to deploy"
      echo ""
      echo "Examples:"
      echo "  $0 --network baseSepolia --tokens USDC,USDT,WETH"
      echo "  $0 --network base --tokens USDC,WETH,cbBTC"
      exit 0 ;;
    *) echo "Unknown parameter: $1. Use --help for usage information."; exit 1 ;;
  esac
done

# Validate network
if [[ "$NETWORK" != "base" && "$NETWORK" != "baseSepolia" ]]; then
  echo "❌ Invalid network: $NETWORK. Must be 'base' or 'baseSepolia'."
  echo "Use --help for usage information."
  exit 1
fi

# Parse tokens
IFS=',' read -ra TOKEN_ARRAY <<< "$TOKENS"
echo "📋 Configuration:"
echo "  Network: $NETWORK"
echo "  Tokens: ${TOKEN_ARRAY[*]}"
echo "  Verification: $VERIFY"
echo ""

# Check for .env file
if [ ! -f .env ]; then
  echo "📝 No .env file found. Creating a template..."
  cat > .env << EOF
# Private key of the deployer account
PRIVATE_KEY=

# API Key for BaseScan (for contract verification)
ETHERSCAN_API_KEY=

# Token type to deploy (USDC, WETH, BTC)
# TOKEN_TYPE=USDC

# Flag to control automatic verification (default: true)
# VERIFY_CONTRACTS=true
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

# Compile contracts once
echo "🔨 Compiling contracts..."
npx hardhat compile

# Deployment results tracking
declare -A DEPLOYMENT_RESULTS
declare -A VAULT_ADDRESSES
declare -A STRATEGY_ADDRESSES
declare -A ACCESS_MANAGER_ADDRESSES

# Deploy each token
for TOKEN in "${TOKEN_ARRAY[@]}"; do
  echo ""
  echo "🚀 ================================================"
  echo "📊 Deploying $TOKEN to $NETWORK..."
  echo "================================================"
  
  # Check if token is supported on the network
  if [ "$NETWORK" == "baseSepolia" ] && [[ "$TOKEN" == "cbBTC" ]]; then
    echo "⚠️ $TOKEN is not available on Base Sepolia testnet. Only USDC, USDT, and WETH are supported. Skipping..."
    DEPLOYMENT_RESULTS[$TOKEN]="SKIPPED"
    continue
  fi
  
  # Run deployment
  if VERIFY_CONTRACTS=$VERIFY TOKEN_TYPE=$TOKEN npx hardhat run scripts/deploy-vault.js --network $NETWORK; then
    echo "✅ $TOKEN deployment completed successfully!"
    DEPLOYMENT_RESULTS[$TOKEN]="SUCCESS"
    
    # Note: In a real implementation, you would capture the addresses from the deployment output
    # For now, we'll mark them as deployed
    VAULT_ADDRESSES[$TOKEN]="DEPLOYED"
    STRATEGY_ADDRESSES[$TOKEN]="DEPLOYED"
    ACCESS_MANAGER_ADDRESSES[$TOKEN]="DEPLOYED"
  else
    echo "❌ $TOKEN deployment failed!"
    DEPLOYMENT_RESULTS[$TOKEN]="FAILED"
  fi
  
  # Wait between deployments to avoid rate limiting
  if [ "$TOKEN" != "${TOKEN_ARRAY[-1]}" ]; then
    echo "⏳ Waiting 30 seconds before next deployment..."
    sleep 30
  fi
done

# Print deployment summary
echo ""
echo "🎉 ==========================================================="
echo "📊 DEPLOYMENT SUMMARY"
echo "==========================================================="
echo "Network: $NETWORK"
echo "Verification: $VERIFY"
echo ""

for TOKEN in "${TOKEN_ARRAY[@]}"; do
  STATUS=${DEPLOYMENT_RESULTS[$TOKEN]}
  case $STATUS in
    "SUCCESS")
      echo "✅ $TOKEN: SUCCESS"
      ;;
    "FAILED")
      echo "❌ $TOKEN: FAILED"
      ;;
    "SKIPPED")
      echo "⏭️ $TOKEN: SKIPPED (not supported)"
      ;;
    *)
      echo "❓ $TOKEN: UNKNOWN"
      ;;
  esac
done

echo ""
echo "🔗 Next Steps:"
echo "1. Check the deployment logs above for contract addresses"
echo "2. Verify contracts on the block explorer if needed"
echo "3. Update your interaction scripts with the new addresses"
echo ""
echo "📊 To deploy individual tokens:"
if [ "$NETWORK" == "baseSepolia" ]; then
  echo "   ./scripts/deploy-to-base-sepolia.sh --token USDC"
  echo "   ./scripts/deploy-to-base-sepolia.sh --token USDT"
  echo "   ./scripts/deploy-to-base-sepolia.sh --token WETH"
else
  echo "   ./scripts/deploy-to-base.sh --token USDC"
  echo "   ./scripts/deploy-to-base.sh --token WETH"
  echo "   ./scripts/deploy-to-base.sh --token cbBTC"
fi
echo "==========================================================="
