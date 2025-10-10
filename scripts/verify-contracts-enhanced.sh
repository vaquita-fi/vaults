#!/bin/bash

# Enhanced contract verification script with better logging and error handling
echo "🔍 Enhanced Contract Verification Script"
echo "========================================"

# Default IMPLEMENTATION_SLOT for OpenZeppelin UUPS Proxy
IMPLEMENTATION_SLOT="0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"

# Enhanced logging function
log_step() {
  local step="$1"
  local message="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$step] $message"
}

# Enhanced verification function
verify_contract() {
  local contract_name="$1"
  local address="$2"
  local constructor_args="$3"
  local contract_path="$4"
  
  log_step "VERIFY" "Starting verification for $contract_name at $address"
  
  if [ -n "$contract_path" ]; then
    log_step "VERIFY" "Using contract path: $contract_path"
    if npx hardhat verify --network $NETWORK "$address" $constructor_args --contract "$contract_path"; then
      log_step "VERIFY" "✅ $contract_name verified successfully"
      return 0
    else
      log_step "VERIFY" "❌ Failed to verify $contract_name"
      return 1
    fi
  else
    if npx hardhat verify --network $NETWORK "$address" $constructor_args; then
      log_step "VERIFY" "✅ $contract_name verified successfully"
      return 0
    else
      log_step "VERIFY" "❌ Failed to verify $contract_name"
      return 1
    fi
  fi
}

# Check if network is provided
if [ -z "$1" ]; then
  echo "❌ Network not specified. Please specify 'base' or 'baseSepolia'."
  echo "Usage: $0 <network> <vault_address> <strategy_address> <access_manager_address> <deployer_address> [token_type]"
  exit 1
fi

NETWORK="$1"

# Validate network
if [ "$NETWORK" != "base" ] && [ "$NETWORK" != "baseSepolia" ]; then
  echo "❌ Invalid network. Please specify 'base' or 'baseSepolia'."
  exit 1
fi

# Check if contract addresses are provided
if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] || [ -z "$5" ]; then
  echo "❌ Missing contract addresses or deployer address."
  echo "Usage: $0 <network> <vault_address> <strategy_address> <access_manager_address> <deployer_address> [token_type]"
  exit 1
fi

VAULT_PROXY="$2"
STRATEGY="$3"
ACCESS_MANAGER="$4"
ADMIN_ADDRESS="$5"
TOKEN_TYPE="${6:-USDC}"

# Set network-specific variables
if [ "$NETWORK" == "base" ]; then
  EXPLORER="BaseScan"
  case $TOKEN_TYPE in
    "USDC")
      TOKEN_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      AAVE_POOL_ADDRESS="0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
      ;;
    "WETH")
      TOKEN_ADDRESS="0x4200000000000000000000000000000000000006"
      AAVE_POOL_ADDRESS="0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
      ;;
    "cbBTC")
      TOKEN_ADDRESS="0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22"
      AAVE_POOL_ADDRESS="0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
      ;;
    *)
      echo "❌ Unsupported token type: $TOKEN_TYPE"
      exit 1
      ;;
  esac
  API_KEY_NAME="ETHERSCAN_API_KEY"
else
  EXPLORER="BaseScan"
  case $TOKEN_TYPE in
    "USDC")
      TOKEN_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      AAVE_POOL_ADDRESS="0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b"
      ;;
    "USDT")
      TOKEN_ADDRESS="0x01a6810727db185bbf7f30ec158c3ac8b8112627"
      AAVE_POOL_ADDRESS="0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b"
      ;;
    *)
      echo "❌ Unsupported token type: $TOKEN_TYPE. Only USDC and USDT are supported on Base Sepolia."
      exit 1
      ;;
  esac
  API_KEY_NAME="ETHERSCAN_API_KEY"
fi

# Check for .env file
if [ ! -f .env ]; then
  log_step "ERROR" "No .env file found. Creating a template..."
  cat > .env << EOF
# Private key of the deployer account
PRIVATE_KEY=

# API Keys for contract verification
ETHERSCAN_API_KEY=
EOF
  echo "✅ .env template created. Please fill in your API keys before continuing."
  exit 1
fi

# Check API key
if ! grep -q "${API_KEY_NAME}=" .env || grep -q "${API_KEY_NAME}=$" .env; then
  log_step "WARNING" "${API_KEY_NAME} is not set in .env file. Contract verification will likely fail."
  echo "Press Enter to continue anyway, or Ctrl+C to abort and update your .env file."
  read
fi

log_step "INFO" "=== Enhanced Contract Verification on $EXPLORER ==="
log_step "INFO" "Network: $NETWORK"
log_step "INFO" "Token: $TOKEN_TYPE ($TOKEN_ADDRESS)"
log_step "INFO" "Vault Proxy: $VAULT_PROXY"
log_step "INFO" "Strategy: $STRATEGY"
log_step "INFO" "AccessManager: $ACCESS_MANAGER"
log_step "INFO" "Aave Pool: $AAVE_POOL_ADDRESS"
log_step "INFO" "Admin: $ADMIN_ADDRESS"

# Track verification results
declare -A VERIFICATION_RESULTS

# 1. Verify AccessManager
log_step "VERIFY" "=== Step 1: Verifying AccessManager ==="
if verify_contract "AccessManager" "$ACCESS_MANAGER" "$ADMIN_ADDRESS" "contracts/access/AccessManager.sol:AccessManager"; then
  VERIFICATION_RESULTS["access_manager"]="SUCCESS"
else
  VERIFICATION_RESULTS["access_manager"]="FAILED"
fi

# Wait between verifications to avoid rate limiting
log_step "VERIFY" "Waiting 15 seconds before next verification..."
sleep 15

# 2. Verify Strategy
log_step "VERIFY" "=== Step 2: Verifying AaveV3InvestStrategy ==="
if verify_contract "AaveV3InvestStrategy" "$STRATEGY" "$TOKEN_ADDRESS $AAVE_POOL_ADDRESS"; then
  VERIFICATION_RESULTS["strategy"]="SUCCESS"
else
  VERIFICATION_RESULTS["strategy"]="FAILED"
fi

# 3. Get and verify the implementation
log_step "VERIFY" "=== Step 3: Getting implementation address ==="

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
log_step "VERIFY" "Running script to get implementation address..."
IMPLEMENTATION_ADDRESS=$(npx hardhat run $TMP_SCRIPT --network $NETWORK)
rm $TMP_SCRIPT

# Check if we got a valid address
if [[ $IMPLEMENTATION_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  log_step "VERIFY" "Implementation address found: $IMPLEMENTATION_ADDRESS"
  
  # Wait between verifications to avoid rate limiting
  log_step "VERIFY" "Waiting 15 seconds before implementation verification..."
  sleep 15
  
  # Verify the implementation contract
  log_step "VERIFY" "=== Step 4: Verifying vault implementation ==="
  if verify_contract "Vault Implementation" "$IMPLEMENTATION_ADDRESS"; then
    VERIFICATION_RESULTS["implementation"]="SUCCESS"
  else
    VERIFICATION_RESULTS["implementation"]="FAILED"
  fi
  
  # Wait before proxy verification
  log_step "VERIFY" "Waiting 15 seconds before proxy verification..."
  sleep 15
  
  # 5. Verify Proxy - This requires manual steps due to complex constructor arguments
  log_step "VERIFY" "=== Step 5: Preparing to verify AccessManagedProxy ==="
  log_step "VERIFY" "Generating constructor arguments for the proxy..."
  
  # Set environment variables for the encode-proxy-constructor script
  export IMPLEMENTATION_ADDRESS=$IMPLEMENTATION_ADDRESS
  export ACCESS_MANAGER_ADDRESS=$ACCESS_MANAGER
  export VAULT_ADDRESS=$VAULT_PROXY
  
  # Run the encode-proxy-constructor script
  log_step "VERIFY" "Running script to generate proxy constructor arguments..."
  if npx hardhat run scripts/encode-proxy-constructor.js --network $NETWORK; then
    VERIFICATION_RESULTS["proxy"]="MANUAL_REQUIRED"
    log_step "VERIFY" "✅ Proxy constructor arguments generated"
    log_step "VERIFY" "📋 Manual verification required for proxy:"
    log_step "VERIFY" "1. Go to the block explorer: ${NETWORK}.basescan.org"
    log_step "VERIFY" "2. Search for your proxy contract: $VAULT_PROXY"
    log_step "VERIFY" "3. In the 'Contract' tab, click 'Verify & Publish'"
    log_step "VERIFY" "4. Select verification method: 'Solidity (Standard JSON Input)'"
    log_step "VERIFY" "5. Upload contract source code or use flattened contracts"
    log_step "VERIFY" "6. Set contract name to 'AccessManagedProxy'"
    log_step "VERIFY" "7. Paste the ABI-encoded constructor arguments from above"
    log_step "VERIFY" "8. Complete verification process"
  else
    VERIFICATION_RESULTS["proxy"]="FAILED"
    log_step "VERIFY" "❌ Failed to generate proxy constructor arguments"
  fi

else
  log_step "ERROR" "Failed to get implementation address. Output: $IMPLEMENTATION_ADDRESS"
  VERIFICATION_RESULTS["implementation"]="FAILED"
  VERIFICATION_RESULTS["proxy"]="FAILED"
  log_step "VERIFY" "Manual verification required:"
  log_step "VERIFY" "npx hardhat console --network $NETWORK"
  log_step "VERIFY" "const implSlot = '${IMPLEMENTATION_SLOT}';"
  log_step "VERIFY" "const result = await ethers.provider.getStorage('${VAULT_PROXY}', implSlot);"
  log_step "VERIFY" "const implAddress = '0x' + result.toString().slice(-40);"
  log_step "VERIFY" "console.log('Implementation address:', implAddress);"
  log_step "VERIFY" "Then verify with: npx hardhat verify --network $NETWORK <IMPLEMENTATION_ADDRESS>"
fi

# Print verification summary
log_step "SUMMARY" "=== VERIFICATION SUMMARY ==="
log_step "SUMMARY" "AccessManager: ${VERIFICATION_RESULTS["access_manager"]}"
log_step "SUMMARY" "Strategy: ${VERIFICATION_RESULTS["strategy"]}"
log_step "SUMMARY" "Implementation: ${VERIFICATION_RESULTS["implementation"]}"
log_step "SUMMARY" "Proxy: ${VERIFICATION_RESULTS["proxy"]}"

# Count successful verifications
SUCCESS_COUNT=0
TOTAL_COUNT=0

for result in "${VERIFICATION_RESULTS[@]}"; do
  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  if [ "$result" = "SUCCESS" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  fi
done

log_step "SUMMARY" "Successfully verified: $SUCCESS_COUNT/$TOTAL_COUNT contracts"

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
  log_step "SUMMARY" "🎉 All contracts verified successfully!"
elif [ $SUCCESS_COUNT -gt 0 ]; then
  log_step "SUMMARY" "⚠️ Some contracts verified successfully. Check logs above for details."
else
  log_step "SUMMARY" "❌ No contracts were verified successfully. Check logs above for details."
fi

log_step "COMPLETE" "Verification process completed!"
