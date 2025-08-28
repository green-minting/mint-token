# Green Minting Token (MINT)

A comprehensive ERC-20 token implementation with advanced features including EIP-3009 support for gasless transactions and a sophisticated vesting mechanism.

## Overview

The Green Minting Token project consists of three main smart contracts:

- **GreenMintingToken**: An ERC-20 token with burning capabilities and EIP-3009 support
- **EIP3009**: Implementation of EIP-3009 standard for transfer with authorization (gasless transactions)
- **VestedLock**: A vesting contract that releases tokens according to a predefined schedule

## Features

### Green Minting Token (MINT)
- **ERC-20 Standard**: Full compliance with ERC-20 token standard
- **Burnable**: Token holders can burn their tokens
- **EIP-3009 Support**: Gasless transactions through meta-transactions
- **Pre-funded Accounts**: Initial token distribution to specified accounts
- **Vesting Integration**: Automatic vesting setup during deployment

### EIP-3009 Implementation
- **Transfer with Authorization**: Allow third parties to transfer tokens on behalf of token holders
- **Receive with Authorization**: Enable authorized token receiving
- **Authorization Management**: Cancel unused authorizations
- **Nonce System**: Prevent replay attacks with unique nonces
- **Time-bounded Authorizations**: Support for validity windows

### Vesting Contract
- **Time-based Vesting**: Release tokens according to a schedule
- **Percentage-based Stages**: Configure release percentages for each vesting stage
- **Security Features**: Prevent double claiming and unauthorized access
- **Flexible Configuration**: Customizable vesting periods and schedules

## Contract Addresses

### Mainnet Deployments
- Check `deployments/ethereum_mainnet__*.json` for latest mainnet deployment details

### Testnet Deployments (Sepolia)
- Check `deployments/sepolia__*.json` for latest testnet deployment details

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory with:

```env
SEPOLIA_RPC_URL=your_sepolia_rpc_url
MAINNET_RPC_URL=your_mainnet_rpc_url
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Testing

Run the test suite:

```bash
npx hardhat test
```

Run tests with gas reporting:

```bash
REPORT_GAS=true npx hardhat test
```

### Deployment

Deploy to Sepolia testnet:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Deploy to Ethereum mainnet:

```bash
npx hardhat run scripts/deploy.ts --network ethereum_mainnet
```

### Verification

The deployment script automatically attempts to verify contracts on Etherscan. You can also manually verify:

```bash
npx hardhat run scripts/verifyContract.ts --network <network>
```

## Token Distribution

The initial token supply is distributed as follows:
- Pre-funded accounts receive immediate allocations
- Vesting account receives tokens locked in the VestedLock contract
- Vesting schedule: 12 stages with decreasing percentages (30%, 20%, 10%, 5%, 5%, 5%, 5%, 5%, 5%, 5%, 2.5%, 2.5%)

## Security

- All contracts use OpenZeppelin's battle-tested implementations
- EIP-712 standard for secure message signing
- Comprehensive test coverage
- Time-locked vesting mechanisms
- Nonce-based replay protection

## License

All rights reserved. This is proprietary software owned by Green Minting.
