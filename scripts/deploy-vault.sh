#!/bin/bash

# Unified vault deployment script for Base Sepolia and Scroll Sepolia
# Usage: ./scripts/deploy-vault.sh [network] [--no-verify]
# Example: ./scripts/deploy-vault.sh baseSepolia
# Example: ./scripts/deploy-vault.sh scrollSepolia --no-verify

# Function to display usage
show_usage() {
    echo "Usage: $0 [network] [options]"
    echo ""
    echo "Networks:"
    echo "  baseSepolia    Deploy to Base Sepolia testnet"
    echo "  scrollSepolia  Deploy to Scroll Sepolia testnet"
    echo ""
    echo "Options:"
    echo "  --no-verify    Skip contract verification"
    echo ""
    echo "Examples:"
    echo "  $0 baseSepolia"
    echo "  $0 scrollSepolia --no-verify"
    exit 1
}

# Check if network argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Network argument is required"
    show_usage
fi

# Parse command line arguments
NETWORK=""
VERIFY="true"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        baseSepolia|scrollSepolia)
            NETWORK="$1"
            shift
            ;;
        --no-verify)
            VERIFY="false"
            shift
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            echo "Unknown parameter: $1"
            show_usage
            ;;
    esac
done

# Validate network
if [ -z "$NETWORK" ]; then
    echo "Error: Valid network argument is required"
    show_usage
fi

# Set network-specific variables
case $NETWORK in
    baseSepolia)
        NETWORK_NAME="Base Sepolia"
        ;;
    scrollSepolia)
        NETWORK_NAME="Scroll Sepolia"
        ;;
    *)
        echo "Error: Invalid network '$NETWORK'"
        show_usage
        ;;
esac

echo "Preparing to deploy vault to $NETWORK_NAME..."

# Check for .env file
if [ ! -f .env ]; then
    echo "No .env file found. Creating a template..."
    cat > .env << EOF
# Private key of the deployer account
PRIVATE_KEY=

# API Key for contract verification (used for both Base Sepolia and Scroll Sepolia)
ETHERSCAN_API_KEY=

# USDC token addresses (optional, will use defaults if not set)
# USDC_TOKEN_ADDRESS_BASE_SEPOLIA=
# USDC_TOKEN_ADDRESS_SCROLL_SEPOLIA=

# Flag to control automatic verification (default: true)
# VERIFY_CONTRACTS=true
EOF
    echo ".env template created. Please fill in your private key and API keys."
    exit 1
fi

# Check if private key is set
if grep -q "PRIVATE_KEY=$" .env; then
    echo "PRIVATE_KEY is not set in .env file. Please edit it before continuing."
    exit 1
fi

# Check if API key is set (only if verification is enabled)
if [ "$VERIFY" == "true" ]; then
    if ! grep -q "ETHERSCAN_API_KEY=" .env || grep -q "ETHERSCAN_API_KEY=$" .env; then
        echo "ETHERSCAN_API_KEY is not set in .env file. Contract verification will likely fail."
        echo "Press Enter to continue anyway, or Ctrl+C to abort and update your .env file."
        read
    fi
fi

# Compile contracts
echo "Compiling contracts..."
npx hardhat compile

# Run deployment
echo "Running deployment script on $NETWORK_NAME..."
VERIFY_CONTRACTS=$VERIFY npx hardhat run scripts/deploy-vault.js --network $NETWORK

# Save returned addresses for interaction
echo ""
echo "==========================================================="
echo "Deployment completed! To interact with the vault:"
echo "1. Edit scripts/interact-with-vault.js to add your vault address"
echo "2. Run the following command:"
echo "   npx hardhat run scripts/interact-with-vault.js --network $NETWORK"
echo "===========================================================" 