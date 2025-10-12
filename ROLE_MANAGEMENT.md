# Role Management

This document explains how to grant roles using the Hardhat script and GitHub Action.

## Overview

The role management system allows you to grant specific roles to addresses on deployed AccessManager contracts. This is equivalent to using the `cast send` command but provides better error handling and logging.

## Available Roles

Based on the deployment script, the following roles are available:

| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 1 | LP_ROLE | Liquidity Provider role |
| 2 | LOM_ADMIN | Limit Order Manager Admin role |
| 3 | REBALANCER_ROLE | Rebalancer role |
| 4 | STRATEGY_ADMIN_ROLE | Strategy Admin role |
| 5 | QUEUE_ADMIN_ROLE | Queue Admin role |
| 6 | FORWARD_TO_STRATEGY_ROLE | Forward to Strategy role |
| 7 | READ_ONLY_ROLE | Read Only role |

## Using the Hardhat Script

### Prerequisites

1. Set up your environment variables:
   ```bash
   export PRIVATE_KEY="your_private_key"
   export ACCESS_MANAGER_ADDRESS="0xCc020c689BC7a485084d335335bE0c4BE520c3E4"
   export ROLE_ID="7"
   export TARGET_ADDRESS="0xfceBCCfD7c74e8c5191609dEd61fD81D26a83327"
   export DELAY="0"
   ```

2. Run the script:
   ```bash
   npx hardhat run scripts/grant-role.js --network baseSepolia
   ```

### Environment Variables

- `ACCESS_MANAGER_ADDRESS` (required): The address of the AccessManager contract
- `ROLE_ID` (required): The role ID to grant (1-7)
- `TARGET_ADDRESS` (required): The address to grant the role to
- `DELAY` (optional): Delay in seconds before the role becomes active (default: 0)

## Using the GitHub Action

### Prerequisites

1. Add your private keys as GitHub secrets:
   - `TESTNET_PRIVATE_KEY` - for baseSepolia and scrollSepolia networks
   - `PRODUCTION_PRIVATE_KEY` - for base mainnet
2. Go to the Actions tab in your GitHub repository
3. Select "Grant Role" workflow
4. Click "Run workflow"

### Manual Triggers

The workflow only runs manually:
1. Go to Actions → "Grant Role" → "Run workflow"
2. Fill in the form with your desired parameters

### Input Parameters

- **AccessManager Address**: The contract address (e.g., `0xCc020c689BC7a485084d335335bE0c4BE520c3E4`)
- **Role ID**: The role to grant (1-7, default: 7 for READ_ONLY_ROLE)
- **Target Address**: The address to grant the role to
- **Delay**: Delay in seconds (default: 0)
- **Network**: Choose from baseSepolia, base, or scrollSepolia (default: baseSepolia)

### Example Usage

To replicate the cast command:
```
cast send 0xCc020c689BC7a485084d335335bE0c4BE520c3E4 "grantRole(uint64,address,uint32)" 7 0xfceBCCfD7c74e8c5191609dEd61fD81D26a83327 0 --rpc-url https://sepolia.base.org
```

Use these GitHub Action inputs:
- AccessManager Address: `0xCc020c689BC7a485084d335335bE0c4BE520c3E4`
- Role ID: `7`
- Target Address: `0xfceBCCfD7c74e8c5191609dEd61fD81D26a83327`
- Delay: `0`
- Network: `baseSepolia`

## Error Handling

The script provides detailed error messages for common issues:

- **Missing permissions**: The signer doesn't have permission to grant the role
- **Invalid addresses**: Address format validation
- **Invalid role ID**: Role ID must be between 1-7
- **Network issues**: Connection problems to the blockchain

## Security Considerations

1. **Private Key Security**: Never commit private keys to the repository
2. **Role Permissions**: Ensure the signer has appropriate permissions
3. **Address Validation**: Always verify addresses before granting roles
4. **Network Selection**: Double-check the network before executing

## Testing

Run the test script to validate the functionality:

```bash
node scripts/test-grant-role.js
```

This will test various scenarios including invalid inputs and missing parameters.

## Troubleshooting

### Common Issues

1. **"AccessManager: account is missing role"**
   - The signer doesn't have permission to grant this role
   - Check if the signer has the appropriate admin role

2. **"AccessManager: role is not managed"**
   - The role ID is not managed by this AccessManager
   - Verify the role ID is between 1-7

3. **"AccessManager: can only renounce roles for self"**
   - Cannot grant role to the same address that's calling the function
   - Use a different target address

4. **Network connection issues**
   - Check your RPC URL and network configuration
   - Ensure you have sufficient funds for gas fees
