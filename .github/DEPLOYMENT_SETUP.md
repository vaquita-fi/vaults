# GitHub Actions Deployment Setup

This guide explains how to set up GitHub Actions for automated deployment of vault contracts to Base networks.

## 🔧 Required Setup

### 1. GitHub Secrets

You need to configure the following secrets in your GitHub repository:

#### Repository Secrets
Go to your repository → Settings → Secrets and variables → Actions → Repository secrets

| Secret Name | Description | Required For |
|-------------|-------------|--------------|
| `PRIVATE_KEY` | Private key of the deployer account (without 0x prefix) | All deployments |
| `ETHERSCAN_API_KEY` | BaseScan API key for contract verification | Contract verification |

#### How to Get the Secrets

**Private Key:**
1. Export your private key from MetaMask or your wallet
2. Remove the `0x` prefix if present
3. Store the key securely

**BaseScan API Key:**
1. Go to [BaseScan.org](https://basescan.org)
2. Create an account and log in
3. Go to API-KEYs section
4. Create a new API key
5. Copy the API key

### 2. GitHub Environments

Create the following environments in your repository:

#### Base Sepolia Environment
1. Go to Settings → Environments
2. Create new environment: `base-sepolia`
3. Add protection rules if needed (optional)
4. No additional secrets needed (uses repository secrets)

#### Base Mainnet Environment
1. Go to Settings → Environments  
2. Create new environment: `base-mainnet`
3. **Recommended**: Add protection rules for mainnet deployments
4. No additional secrets needed (uses repository secrets)

### 3. Environment Protection Rules (Recommended for Mainnet)

For the `base-mainnet` environment, consider adding:
- **Required reviewers**: Require approval from specific team members
- **Wait timer**: Add a delay before deployment (e.g., 5 minutes)
- **Deployment branches**: Restrict to specific branches only

## 🚀 Workflow Triggers

### Manual Triggers Only

Use the "Actions" tab → "Deploy Vaults to Base Networks" → "Run workflow" with options:

- **Network**: Choose `baseSepolia` or `base`
- **Token**: Select token type (USDC, USDT, WETH, cbBTC)
- **Verify**: Enable/disable contract verification
- **Skip Tests**: Skip running tests before deployment

## 📋 Supported Tokens

### Base Sepolia (Testnet)
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **USDT**: `0x01a6810727db185bbf7f30ec158c3ac8b8112627`

### Base Mainnet
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **WETH**: `0x4200000000000000000000000000000000000006`
- **cbBTC**: `0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22`

## 🔍 Workflow Features

### Test Job
- Runs on all triggers
- Compiles contracts
- Runs linting (solhint)
- Executes test suite
- Can be skipped with `skip_tests` option

### Deployment Jobs
- **Base Sepolia**: Deploys individual tokens or all tokens
- **Base Mainnet**: Deploys individual tokens or all tokens
- **Artifact Upload**: Saves deployment logs and artifacts
- **Environment-specific**: Uses different environments for testnet/mainnet

### Verification
- Automatic contract verification on BaseScan
- Configurable delay between verifications (default: 15 seconds)
- Can be disabled with `--no-verify` flag

## 📊 Deployment Artifacts

Each deployment creates artifacts containing:
- Contract deployment logs
- Compiled contract artifacts
- Cache files
- Deployment addresses and transaction hashes

Artifacts are retained for 30 days and can be downloaded from the Actions tab.

## 🛠️ Troubleshooting

### Common Issues

1. **Private Key Format**
   - Ensure the private key doesn't have `0x` prefix
   - Key should be 64 characters long

2. **API Key Issues**
   - Verify the BaseScan API key is valid
   - Check API key permissions and rate limits

3. **Network Issues**
   - Ensure RPC endpoints are accessible
   - Check gas price and network congestion

4. **Verification Failures**
   - Wait for blockchain indexing (10-30 seconds)
   - Check constructor arguments match deployment
   - Increase `VERIFICATION_DELAY` if rate limited

### Debug Commands

You can run these commands locally to debug issues:

```bash
# Check network configuration
npx hardhat console --network baseSepolia

# Test compilation
npx hardhat compile

# Run tests
npx hardhat test

# Check contract sizes
npx hardhat size-contracts
```

## 🔒 Security Best Practices

1. **Private Key Security**
   - Use a dedicated deployment account
   - Never commit private keys to the repository
   - Rotate keys regularly

2. **Environment Protection**
   - Use environment protection rules for mainnet
   - Require manual approval for production deployments
   - Limit access to deployment secrets

3. **Verification**
   - Always verify contracts on block explorers
   - Keep verification logs for audit trails
   - Monitor deployment addresses

## 📈 Monitoring

### Success Indicators
- ✅ All contracts deployed successfully
- ✅ All roles configured properly
- ✅ All contracts verified (if enabled)
- 📊 Deployment summary with addresses
- 🔗 Block explorer links in logs

### Failure Handling
- Failed deployments are logged with detailed error messages
- Artifacts are still uploaded for debugging
- Manual retry is available through workflow dispatch

## 🎯 Usage Examples

### Deploy Single Token to Testnet
1. Go to Actions tab
2. Select "Deploy Vaults to Base Networks"
3. Click "Run workflow"
4. Choose:
   - Network: `baseSepolia`
   - Token: `USDC`
   - Verify: `true`

### Deploy All Tokens to Mainnet
1. Go to Actions tab
2. Select "Deploy Vaults to Base Networks"
3. Click "Run workflow"
4. Choose:
   - Network: `base`
   - Token: `USDC` (will deploy all supported tokens)
   - Verify: `true`

### Skip Verification for Testing
1. Go to Actions tab
2. Select "Deploy Vaults to Base Networks"
3. Click "Run workflow"
4. Choose:
   - Network: `baseSepolia`
   - Token: `USDC`
   - Verify: `false`

## 📞 Support

If you encounter issues:
1. Check the workflow logs for specific error messages
2. Verify your secrets are configured correctly
3. Ensure all prerequisites are met
4. Check network connectivity and gas fees
5. Review the deployment guide for manual deployment steps
