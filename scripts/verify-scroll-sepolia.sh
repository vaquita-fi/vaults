#!/bin/bash

echo "Starting contract verification on Scroll Sepolia..."

# Check for .env file
if [ ! -f .env ]; then
  echo "No .env file found. Please create a .env file with your PRIVATE_KEY and SCROLLSCAN_API_KEY."
  exit 1
fi

# Check if API key is set
if ! grep -q "SCROLLSCAN_API_KEY=" .env || grep -q "SCROLLSCAN_API_KEY=$" .env; then
  echo "SCROLLSCAN_API_KEY is not set in .env file. Please add it before continuing."
  echo "You can obtain an API key by registering at https://scrollscan.com/apis"
  exit 1
fi

# Run verification script
echo "Running verification script..."
npx hardhat run scripts/verify-scroll-sepolia.js --network scrollSepolia

echo ""
echo "============================================================="
echo "Verification process completed!"
echo "Check the logs above for the status of each contract verification."
echo "If any verification failed, you can try verifying manually using:"
echo "npx hardhat verify --network scrollSepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>"
echo "============================================================="
