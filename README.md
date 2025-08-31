# Creating a ERC-20 token on Arbitrum Sepolia using Arbitrum Stylus and Lava RPC

A minimal dApp create to showcase the process of creating an ERC-20 token on Arbitrum Sepolia. Contract deployed using Arbitrum Stylus, powered by Lava RPC for contract deployment as well as dApp interactions.

## Project Structure

- `/contracts` - Rust smart contract using Arbitrum Stylus SDK
- `/react-frontend` - Simple React frontend with ethers.js integration

## Smart Contract

The ERC20 token contract is written in Rust using the Arbitrum Stylus SDK. It implements the standard ERC20 functionality with an additional minting capability for the contract owner. 

### Features

A simple dApp allows the users to:

1. Connect their wallet
2. Mint the token
3. Transfer to an address
4. Get the receipt of the Mint and Transer transactions
5. Continuously monitor Lava network performance


## Getting Started
1. Clone the directory
2. Configure Rust, Node.js on your machine
3. Deploy the contract

```
cd contracts

cargo stylus check 

cargo stylus deploy --no-verify --endpoint='your-lava-gateway-endpoint' --private-key="your-private-key"

```

4. Run the frontend 
Update the `config.js` file with the address of your deployed contract


```
cd react-frontend

npm install

npm start
```

Open your browser and navigate to `http://localhost:3000`.

### Prerequisites

- Node.js and npm
- Rust and Cargo
- Arbitrum Stylus SDK
- MetaMask or another Ethereum wallet

## License

This project is open source and available under the MIT License.
