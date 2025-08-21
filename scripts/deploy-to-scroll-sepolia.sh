#!/bin/bash

# Deploy to Scroll Sepolia script
echo "Preparing to deploy vault to Scroll Sepolia..."

# Parse command line arguments
VERIFY="true"
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --no-verify) VERIFY="false"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Check for .env file
if [ ! -f .env ]; then
  echo "No .env file found. Creating a template..."
  cat > .env << EOF
# Private key of the deployer account
PRIVATE_KEY=

# API Key for ScrollScan (for contract verification)
ETHERSCAN_API_KEY=

# USDC token address on Scroll Sepolia (optional, will use default if not set)
# USDC_TOKEN_ADDRESS=

# Flag to control automatic verification (default: true)
# VERIFY_CONTRACTS=true
EOF
  echo ".env template created. Please fill in your private key and other details."
  exit 1
fi

# Check if private key is set
if grep -q "PRIVATE_KEY=$" .env; then
  echo "PRIVATE_KEY is not set in .env file. Please edit it before continuing."
  exit 1
fi

# Check if API key is set (only if verification is enabled)
if [ "$VERIFY" == "true" ] && (! grep -q "ETHERSCAN_API_KEY=" .env || grep -q "ETHERSCAN_API_KEY=$" .env); then
  echo "ETHERSCAN_API_KEY is not set in .env file. Contract verification will likely fail."
  echo "Press Enter to continue anyway, or Ctrl+C to abort and update your .env file."
  read
fi

# Compile contracts
echo "Compiling contracts..."
npx hardhat compile

# Run deployment
echo "Running deployment script on Scroll Sepolia..."
VERIFY_CONTRACTS=$VERIFY npx hardhat run scripts/deploy-vault.js --network scrollSepolia

# Save returned addresses for interaction
echo ""
echo "==========================================================="
echo "Deployment completed! To interact with the vault:"
echo "1. Edit scripts/interact-with-vault.js to add your vault address"
echo "2. Run the following command:"
echo "   npx hardhat run scripts/interact-with-vault.js --network scrollSepolia"
echo "===========================================================" 