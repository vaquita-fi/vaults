#!/bin/bash

# Script to verify all contracts on Base Sepolia or Scroll Sepolia
# Usage: ./verify-all-contracts.sh <network> <vault_address> <strategy_address> <access_manager_address> <deployer_address>
# Example: ./verify-all-contracts.sh baseSepolia 0x1234...abcd 0x5678...efgh 0x9012...ijkl 0xdeployer...address

# Default IMPLEMENTATION_SLOT for OpenZeppelin UUPS Proxy
IMPLEMENTATION_SLOT="0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

# Check if network is provided
if [ -z "$1" ]; then
  echo "Network not specified. Please specify 'baseSepolia' or 'scrollSepolia'."
  echo "Usage: ./verify-all-contracts.sh <network> <vault_address> <strategy_address> <access_manager_address> <deployer_address>"
  exit 1
fi

NETWORK="$1"

# Validate network
if [ "$NETWORK" != "baseSepolia" ] && [ "$NETWORK" != "scrollSepolia" ]; then
  echo "Invalid network. Please specify 'baseSepolia' or 'scrollSepolia'."
  exit 1
fi

# Check if contract addresses are provided
if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] || [ -z "$5" ]; then
  echo "Missing contract addresses or deployer address."
  echo "Usage: ./verify-all-contracts.sh <network> <vault_address> <strategy_address> <access_manager_address> <deployer_address>"
  exit 1
fi

VAULT_PROXY="$2"
STRATEGY="$3"
ACCESS_MANAGER="$4"
ADMIN_ADDRESS="$5"

# Set network-specific variables
if [ "$NETWORK" == "baseSepolia" ]; then
  EXPLORER="BaseScan"
  TOKEN_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e" # USDC on Base Sepolia
  AAVE_POOL_ADDRESS="0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b" # Aave V3 Pool on Base Sepolia
  API_KEY_NAME="BASESCAN_API_KEY"
else
  EXPLORER="ScrollScan"
  TOKEN_ADDRESS="0x2C9678042D52B97D27f2bD2947F7111d93F3dD0D" # USDC on Scroll Sepolia
  AAVE_POOL_ADDRESS="0x48914C788295b5db23aF2b5F0B3BE775C4eA9440" # Aave V3 Pool on Scroll Sepolia
  API_KEY_NAME="SCROLLSCAN_API_KEY"
fi

# Check for .env file
if [ ! -f .env ]; then
  echo "No .env file found. Creating a template..."
  cat > .env << EOF
# Private key of the deployer account
PRIVATE_KEY=

# API Keys for contract verification
BASESCAN_API_KEY=
SCROLLSCAN_API_KEY=
EOF
  echo ".env template created. Please fill in your API keys before continuing."
  exit 1
fi

# Check API key
if ! grep -q "${API_KEY_NAME}=" .env || grep -q "${API_KEY_NAME}=$" .env; then
  echo "${API_KEY_NAME} is not set in .env file. Contract verification will likely fail."
  echo "Press Enter to continue anyway, or Ctrl+C to abort and update your .env file."
  read
fi

echo "=== Contract Verification on ${EXPLORER} ==="
echo "Network: ${NETWORK}"
echo "Vault Proxy: ${VAULT_PROXY}"
echo "Strategy: ${STRATEGY}"
echo "AccessManager: ${ACCESS_MANAGER}"
echo "Token: ${TOKEN_ADDRESS}"
echo "Aave Pool: ${AAVE_POOL_ADDRESS}"
echo "Admin: ${ADMIN_ADDRESS}"

# 1. Verify AccessManager
echo -e "\n1. Verifying AccessManager..."
npx hardhat verify --network $NETWORK "$ACCESS_MANAGER" "$ADMIN_ADDRESS"

# 2. Verify Strategy
echo -e "\n2. Verifying AaveV3InvestStrategy..."
npx hardhat verify --network $NETWORK "$STRATEGY" "$TOKEN_ADDRESS" "$AAVE_POOL_ADDRESS"

# 3. Get and verify the implementation
echo -e "\n3. Getting implementation address..."

# Create a temporary script to get the implementation address
TMP_SCRIPT="temp_get_impl.js"
cat > $TMP_SCRIPT << EOF
const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "${VAULT_PROXY}";
  const IMPLEMENTATION_SLOT = "${IMPLEMENTATION_SLOT}";
  
  const provider = ethers.provider;
  
  try {
    const storageValue = await provider.getStorage(PROXY_ADDRESS, IMPLEMENTATION_SLOT);
    const implementationAddress = "0x" + storageValue.toString().slice(-40);
    console.log(implementationAddress);
  } catch (error) {
    console.error("Error getting implementation address:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
EOF

# Run the script to get the implementation address
echo "Running script to get implementation address..."
IMPLEMENTATION_ADDRESS=$(npx hardhat run $TMP_SCRIPT --network $NETWORK)
rm $TMP_SCRIPT

# Check if we got a valid address
if [[ $IMPLEMENTATION_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  echo "Implementation address found: $IMPLEMENTATION_ADDRESS"
  
  # Verify the implementation contract
  echo -e "\n4. Verifying vault implementation at $IMPLEMENTATION_ADDRESS..."
  npx hardhat verify --network $NETWORK "$IMPLEMENTATION_ADDRESS"
  
  # 5. Verify Proxy - This requires manual steps due to complex constructor arguments
  echo -e "\n5. Preparing to verify AccessManagedProxy at $VAULT_PROXY..."
  echo "Generating constructor arguments for the proxy..."
  
  # Set environment variables for the encode-proxy-constructor script
  export IMPLEMENTATION_ADDRESS=$IMPLEMENTATION_ADDRESS
  export ACCESS_MANAGER_ADDRESS=$ACCESS_MANAGER
  export VAULT_ADDRESS=$VAULT_PROXY
  
  # Run the encode-proxy-constructor script
  echo "Running script to generate proxy constructor arguments..."
  npx hardhat run scripts/encode-proxy-constructor.js --network $NETWORK
  
  # Guide for manual verification
  echo -e "\nTo complete proxy verification:"
  echo "1. Go to the block explorer: ${NETWORK}.scrollscan.com or basescan.org"
  echo "2. Search for your proxy contract: $VAULT_PROXY"
  echo "3. In the 'Contract' tab, click 'Verify & Publish'"
  echo "4. Select verification method: 'Solidity (Standard JSON Input)'"
  echo "5. Upload contract source code or use flattened contracts"
  echo "6. Set contract name to 'AccessManagedProxy'"
  echo "7. Paste the ABI-encoded constructor arguments from above"
  echo "8. Complete verification process"

else
  echo "Failed to get implementation address. Output: $IMPLEMENTATION_ADDRESS"
  echo "Please verify the implementation manually using:"
  echo "npx hardhat console --network $NETWORK"
  echo "const implSlot = '${IMPLEMENTATION_SLOT}';"
  echo "const result = await ethers.provider.getStorage('${VAULT_PROXY}', implSlot);"
  echo "const implAddress = '0x' + result.toString().slice(-40);"
  echo "console.log('Implementation address:', implAddress);"
  echo "Then verify with: npx hardhat verify --network $NETWORK <IMPLEMENTATION_ADDRESS>"
fi

echo -e "\n=== Verification process completed! ==="
echo "Check the logs above for the status of each contract verification."
echo "If the proxy verification requires manual steps, follow the instructions provided." 