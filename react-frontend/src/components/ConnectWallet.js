import React from 'react';

const ConnectWallet = ({ account, connectWallet }) => {
  // Format address to show only first 6 and last 4 characters
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="wallet-container">
      <div className="wallet-info">
        <div className={`wallet-status ${account ? 'connected' : 'disconnected'}`}></div>
        <span>
          {account 
            ? `Connected: ${formatAddress(account)}` 
            : 'Wallet not connected'}
        </span>
      </div>
      {!account && (
        <button className="connect-button" onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default ConnectWallet;
