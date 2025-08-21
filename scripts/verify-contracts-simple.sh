#!/bin/bash

# Simple script to verify contracts on Scroll Sepolia
# This uses direct verify commands instead of a complex JS script

# Check for .env file
if [ ! -f .env ]; then
  echo "No .env file found. Please create a .env file with your SCROLLSCAN_API_KEY."
  exit 1
fi

# Contract addresses
ACCESS_MANAGER="0x54Cd6C56Ab1676b16d92a7C7F103C2F277c0dDF3"
STRATEGY="0x4628E4E8e28C00f4Ba85FFAE39A6A0d78569E975"
VAULT_PROXY="0xF9B2CFB1a624ea39933290eF943A1140f78E2017"

# Constructor arguments
ADMIN_ADDRESS="0x5fDF2F46959bD37ba72C06aB523CAC3F88291756"
USDC_ADDRESS="0x2C9678042D52B97D27f2bD2947F7111d93F3dD0D"
AAVE_POOL_ADDRESS="0x48914C788295b5db23aF2b5F0B3BE775C4eA9440"

echo "=== Simple Contract Verification for Scroll Sepolia ==="

# 1. Verify AccessManager
echo -e "\n1. Verifying AccessManager..."
npx hardhat verify --network scrollSepolia "$ACCESS_MANAGER" "$ADMIN_ADDRESS"

# 2. Verify Strategy
echo -e "\n2. Verifying AaveV3InvestStrategy..."
npx hardhat verify --network scrollSepolia "$STRATEGY" "$USDC_ADDRESS" "$AAVE_POOL_ADDRESS"

# 3. Get implementation address
echo -e "\n3. To get the implementation address and verify the vault implementation..."
echo "Run this command to access the Hardhat console:"
echo "npx hardhat console --network scrollSepolia"
echo
echo "Then in the console, execute:"
echo "const implSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';"
echo "const result = await ethers.provider.getStorage('$VAULT_PROXY', implSlot);"
echo "const implAddress = '0x' + result.toString().slice(-40);"
echo "console.log('Implementation address:', implAddress);"
echo
echo "Finally, verify the implementation using:"
echo "npx hardhat verify --network scrollSepolia <IMPLEMENTATION_ADDRESS>"
echo
echo "=== Simple verification script completed ===" 