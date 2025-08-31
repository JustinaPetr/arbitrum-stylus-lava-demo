// Configuration for the dApp
export const CONFIG = {
  // Contract deployed on Arbitrum Sepolia
  CONTRACT_ADDRESS: "0xfd9085188be7ba7758fe6e63c80ce2d67da3bd53",
  
  // Network configuration
  NETWORK: {
    chainId: "0x66eee", // Arbitrum Sepolia chainId in hex
    chainName: "Arbitrum Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: [""],
    blockExplorerUrls: ["https://sepolia.arbiscan.io/"]
  },
  
  // Network ID as a number for comparison
  CHAIN_ID_NUM: 421614
};
