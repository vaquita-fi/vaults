# GitHub Actions Deployment

This directory contains GitHub Actions workflows for automated deployment of vault contracts to Base networks.

## 📁 Files

- **`workflows/deploy.yml`** - Main deployment workflow
- **`DEPLOYMENT_SETUP.md`** - Detailed setup instructions for GitHub Actions

## 🚀 Quick Setup

1. **Configure Secrets** (Repository Settings → Secrets and variables → Actions):
   - `PRIVATE_KEY` - Deployer account private key (without 0x prefix)
   - `ETHERSCAN_API_KEY` - BaseScan API key for contract verification

2. **Create Environments** (Repository Settings → Environments):
   - `base-sepolia` - For testnet deployments
   - `base-mainnet` - For mainnet deployments (recommend protection rules)

3. **Trigger Deployment**:
   - **Manual**: Go to Actions tab → "Deploy Vaults to Base Networks" → Run workflow

## 📋 Supported Tokens

### Base Sepolia (Testnet)
- USDC, USDT

### Base Mainnet  
- USDC, WETH, cbBTC

## 🔧 Features

- ✅ Automated testing before deployment
- ✅ Contract compilation and verification
- ✅ Artifact upload and retention
- ✅ Environment-specific deployments
- ✅ Manual workflow dispatch with options
- ✅ Comprehensive logging and error handling

For detailed setup instructions, see [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md).
