# Enhanced Deployment Guide

This guide covers the improved deployment scripts that support multiple tokens (USDC, WETH, BTC) on Base networks with enhanced verification and logging.

## 🚀 Quick Start

### Automated Deployment with GitHub Actions

For automated deployments, we provide GitHub Actions workflows that handle the entire deployment process:

- **Setup Guide**: See [`.github/DEPLOYMENT_SETUP.md`](.github/DEPLOYMENT_SETUP.md) for detailed setup instructions
- **Workflow File**: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
- **Features**: Automated testing, deployment, verification, and artifact management

### Manual Deployment

### Prerequisites

1. **Environment Setup**
   ```bash
   # Create .env file with required variables
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Required Environment Variables**
   ```bash
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   
   # Optional: Configure verification delay (default: 15 seconds)
   VERIFICATION_DELAY=15
   ```

### Single Token Deployment

#### Deploy to Base Sepolia (Testnet)
```bash
# Deploy USDC vault
./scripts/deploy-to-base-sepolia.sh --token USDC

# Deploy USDT vault
./scripts/deploy-to-base-sepolia.sh --token USDT

# Skip verification
./scripts/deploy-to-base-sepolia.sh --token USDC --no-verify
```

#### Deploy to Base Mainnet
```bash
# Deploy USDC vault
./scripts/deploy-to-base.sh --token USDC

# Deploy WETH vault
./scripts/deploy-to-base.sh --token WETH

# Deploy cbBTC vault
./scripts/deploy-to-base.sh --token cbBTC

# Skip verification
./scripts/deploy-to-base.sh --token USDC --no-verify
```

### Multi-Token Deployment

#### Deploy All Tokens to Base Sepolia
```bash
# Deploy USDC and USDT (only stablecoins available on testnet)
./scripts/deploy-all-tokens.sh --network baseSepolia --tokens USDC,USDT
```

#### Deploy All Tokens to Base Mainnet
```bash
# Deploy all supported tokens
./scripts/deploy-all-tokens.sh --network base --tokens USDC,WETH,cbBTC
```

## 📊 Supported Tokens

### Base Sepolia (Testnet)
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **USDT**: `0x01a6810727db185bbf7f30ec158c3ac8b8112627`

### Base Mainnet
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **WETH**: `0x4200000000000000000000000000000000000006`
- **cbBTC**: `0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22`

## 🔍 Contract Verification

### Enhanced Verification Script
```bash
# Verify contracts with enhanced logging and rate limiting protection
./scripts/verify-contracts-enhanced.sh baseSepolia <vault_address> <strategy_address> <access_manager_address> <deployer_address> USDC
```

### Rate Limiting Protection
The deployment scripts include built-in delays between contract verifications to prevent rate limiting:

- **Default delay**: 15 seconds between each verification
- **Configurable**: Set `VERIFICATION_DELAY=30` in your `.env` file for longer delays
- **Automatic**: Delays are applied automatically during deployment and verification

### Manual Verification
If automatic verification fails, you can verify contracts manually:

1. **AccessManager**
   ```bash
   npx hardhat verify --network baseSepolia <access_manager_address> <deployer_address>
   ```

2. **Strategy**
   ```bash
   npx hardhat verify --network baseSepolia <strategy_address> <token_address> <aave_pool_address>
   ```

3. **Vault Implementation**
   ```bash
   npx hardhat verify --network baseSepolia <implementation_address>
   ```

4. **Vault Proxy** (Manual)
   - Use the `encode-proxy-constructor.js` script to get constructor arguments
   - Verify manually on the block explorer

## 📋 Script Options

### deploy-to-base-sepolia.sh
```bash
./scripts/deploy-to-base-sepolia.sh [--no-verify] [--token USDC|USDT] [--help]
```

### deploy-to-base.sh
```bash
./scripts/deploy-to-base.sh [--no-verify] [--token USDC|WETH|cbBTC] [--help]
```

### deploy-all-tokens.sh
```bash
./scripts/deploy-all-tokens.sh --network <base|baseSepolia> [--no-verify] [--tokens USDC,USDT] [--help]
```

### verify-contracts-enhanced.sh
```bash
./scripts/verify-contracts-enhanced.sh <network> <vault_address> <strategy_address> <access_manager_address> <deployer_address> [token_type]
```

## 🎯 Key Improvements

### 1. Multi-Token Support
- Support for USDC, WETH, and BTC on Base networks
- Token-specific vault names and symbols
- Network-aware token address selection

### 2. Enhanced Verification
- Better error handling and logging
- Detailed verification status reporting
- Support for complex proxy verification
- Manual verification guidance

### 3. Improved Logging
- Timestamped log entries
- Step-by-step progress tracking
- Color-coded status indicators
- Comprehensive deployment summaries

### 4. Flexible Deployment
- Single token or multi-token deployment
- Network-specific configurations
- Optional verification skipping
- Help documentation

## 🔧 Troubleshooting

### Common Issues

1. **Verification Failures**
   - Ensure API keys are set correctly
   - Wait for blockchain indexing (10-30 seconds)
   - Check constructor arguments match deployment

2. **Rate Limiting Issues**
   - Increase `VERIFICATION_DELAY` in `.env` file (try 30-60 seconds)
   - Use different RPC endpoints if available
   - Deploy during off-peak hours

3. **Token Not Supported**
   - Only USDC and USDT available on Base Sepolia testnet
   - Use USDC, WETH, or cbBTC for Base Mainnet deployments

4. **Network Issues**
   - Verify RPC endpoints are accessible
   - Check private key format
   - Ensure sufficient gas fees

### Debug Commands

```bash
# Check network configuration
npx hardhat console --network baseSepolia

# Verify environment variables
cat .env

# Test compilation
npx hardhat compile

# Check contract sizes
npx hardhat size-contracts
```

## 📈 Deployment Examples

### Example 1: Deploy USDC Vault to Base Sepolia
```bash
./scripts/deploy-to-base-sepolia.sh --token USDC
```

### Example 2: Deploy All Tokens to Base Sepolia
```bash
./scripts/deploy-all-tokens.sh --network baseSepolia --tokens USDC,USDT
```

### Example 3: Deploy All Tokens to Base Mainnet
```bash
./scripts/deploy-all-tokens.sh --network base --tokens USDC,WETH,cbBTC
```

### Example 4: Deploy Without Verification
```bash
./scripts/deploy-to-base.sh --token WETH --no-verify
```

## 🎉 Success Indicators

A successful deployment will show:
- ✅ All contracts deployed successfully
- ✅ All roles configured properly
- ✅ All contracts verified (if verification enabled)
- 📊 Deployment summary with addresses
- 🔗 Instructions for interaction

## 📞 Support

If you encounter issues:
1. Check the logs for specific error messages
2. Verify your environment configuration
3. Ensure all prerequisites are met
4. Check network connectivity and gas fees
