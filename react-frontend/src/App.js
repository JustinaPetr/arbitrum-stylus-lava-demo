import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import ConnectWallet from './components/ConnectWallet';
import MyTokenABI from './contracts/MyToken.json';
import { CONFIG } from './config';

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [tokenName, setTokenName] = useState('Token');
  const [tokenSymbol, setTokenSymbol] = useState('TKN');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Lava read-only provider + network status
  const [lavaProvider, setLavaProvider] = useState(null);
  const [netStatus, setNetStatus] = useState({
    chainId: null,
    blockNumber: null,
    gasPriceGwei: null,
    blockHash: null,
  });
  const [netUpdatedAt, setNetUpdatedAt] = useState(null);
  const [netOpen, setNetOpen] = useState(false); // collapsed/expanded toggle

  // Last transaction receipt (shown after mint/transfer)
  const [lastTxReceipt, setLastTxReceipt] = useState(null);

  // --- Helpers ---
  const isValidAmount = (val) => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (trimmed === '') return false;
    // up to 18 decimals for ERC-20 with 18 decimals
    return /^\d+(?:\.\d{1,18})?$/.test(trimmed);
  };

  const shortAddress = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

  const formatTxFeeEth = (receipt) => {
    try {
      if (!receipt) return null;
      const gasUsed = receipt.gasUsed;
      const effGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice;
      if (!gasUsed || !effGasPrice) return null;
      const feeWei = gasUsed.mul(effGasPrice);
      return ethers.utils.formatEther(feeWei);
    } catch {
      return null;
    }
  };

  // Initialize contract with signer
  const initContract = async (activeSigner) => {
    try {
      const contract = new ethers.Contract(
        CONFIG.CONTRACT_ADDRESS,
        MyTokenABI,
        activeSigner
      );
      setTokenContract(contract);

      const [name, symbol] = await Promise.all([contract.name(), contract.symbol()]);
      setTokenName(name);
      setTokenSymbol(symbol);

      const userAddress = await activeSigner.getAddress();
      const userBalance = await contract.balanceOf(userAddress);
      setBalance(ethers.utils.formatEther(userBalance));
    } catch (e) {
      console.error('Error initializing contract:', e);
      setError('Failed to connect to the token contract.');
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    const { ethereum } = window;
    if (!ethereum || !ethereum.isMetaMask) {
      setError('Please install MetaMask to use this application.');
      return;
    }

    try {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      const nextSigner = web3Provider.getSigner();
      setSigner(nextSigner);

      await initContract(nextSigner);
      setError('');
    } catch (e) {
      console.error('Error connecting wallet:', e);
      setError('Failed to connect wallet.');
    }
  };

  const mintTokens = async () => {
    if (!tokenContract || !signer || !isValidAmount(mintAmount)) {
      setError('Enter a valid mint amount and ensure your wallet is connected.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccessMessage('');
    setLastTxReceipt(null);

    try {
      const amount = ethers.utils.parseEther(mintAmount.trim());
      const tx = await tokenContract.mint(amount.toString());
      const mined = await tx.wait();

      // Fetch full receipt from Lava RPC if available, otherwise use wallet's receipt
      const lavaReceipt = lavaProvider ? await lavaProvider.getTransactionReceipt(tx.hash) : null;
      setLastTxReceipt(lavaReceipt || mined);

      const userAddress = await signer.getAddress();
      const newBalance = await tokenContract.balanceOf(userAddress);
      setBalance(ethers.utils.formatEther(newBalance));

      setSuccessMessage(`Minted ${mintAmount} ${tokenSymbol}.`);
      setMintAmount('');
    } catch (e) {
      console.error('Error minting tokens:', e);
      setError(`Failed to mint tokens: ${e.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const transferTokens = async () => {
    if (!tokenContract || !signer || !transferTo || !isValidAmount(transferAmount)) {
      setError('Provide a valid recipient address and amount, and connect your wallet.');
      return;
    }

    const userAddress = await signer.getAddress();
    if (transferTo.toLowerCase() === userAddress.toLowerCase()) {
      setError('You cannot transfer tokens to your own address.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccessMessage('');
    setLastTxReceipt(null);

    try {
      const amount = ethers.utils.parseEther(transferAmount.trim());
      const tx = await tokenContract.transfer(transferTo, amount.toString());
      const mined = await tx.wait();

      const lavaReceipt = lavaProvider ? await lavaProvider.getTransactionReceipt(tx.hash) : null;
      setLastTxReceipt(lavaReceipt || mined);

      const newBalance = await tokenContract.balanceOf(userAddress);
      setBalance(ethers.utils.formatEther(newBalance));

      setSuccessMessage(`Transferred ${transferAmount} ${tokenSymbol} to ${shortAddress(transferTo)}.`);
      setTransferTo('');
      setTransferAmount('');
    } catch (e) {
      console.error('Error transferring tokens:', e);
      setError(`Failed to transfer tokens: ${e.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMintSubmit = (e) => {
    e.preventDefault();
    mintTokens();
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    transferTokens();
  };

  // Initialize providers on mount
  useEffect(() => {
    // Set up a read-only Lava provider to showcase RPC reads
    try {
      const lavaUrl = CONFIG.NETWORK?.rpcUrls?.[0];
      if (lavaUrl) {
        const lp = new ethers.providers.JsonRpcProvider(lavaUrl);
        setLavaProvider(lp);
      }
    } catch (e) {
      console.error('Error creating Lava provider:', e);
    }

    const checkIfMetaMaskIsInstalled = () => {
      const { ethereum } = window;
      return Boolean(ethereum && ethereum.isMetaMask);
    };

    const initProvider = async () => {
      if (!checkIfMetaMaskIsInstalled()) {
        setError('Please install MetaMask to use this application.');
        return;
      }

      if (window.ethereum) {
        try {
          // Network guard (Arbitrum Sepolia by default from CONFIG)
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const chainIdNum = parseInt(chainId, 16);

            if (chainIdNum !== CONFIG.CHAIN_ID_NUM) {
              setError(`Switch to the correct network. Current chain ID: ${chainIdNum}`);
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: CONFIG.NETWORK.chainId }],
                });
                setError('');
              } catch (switchError) {
                if (switchError.code === 4902) {
                  try {
                    await window.ethereum.request({
                      method: 'wallet_addEthereumChain',
                      params: [CONFIG.NETWORK],
                    });
                    setError('');
                  } catch (addError) {
                    console.error('Error adding network:', addError);
                    setError('Add the target network to MetaMask to continue.');
                  }
                } else {
                  console.error('Error switching network:', switchError);
                }
              }
            }
          } catch (chainError) {
            console.error('Error checking chain ID:', chainError);
          }

          const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(web3Provider);

          const accounts = await web3Provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            const nextSigner = web3Provider.getSigner();
            setSigner(nextSigner);
            await initContract(nextSigner);
          }

          window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              const s = web3Provider.getSigner();
              setSigner(s);
              initContract(s);
            } else {
              setAccount('');
              setSigner(null);
              setTokenContract(null);
              setBalance('0');
            }
          });

          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        } catch (e) {
          console.error('Error initializing provider:', e);
          setError('Failed to connect to the Ethereum provider.');
        }
      } else {
        setError('Please install MetaMask to use this application.');
      }
    };

    initProvider();
  }, []);

  // Poll live network status from Lava RPC (5s)
  useEffect(() => {
    if (!lavaProvider) return;

    let isStale = false;
    let intervalId;

    const fetchStatus = async () => {
      try {
        const [network, blockNumber, gasPrice] = await Promise.all([
          lavaProvider.getNetwork(),
          lavaProvider.getBlockNumber(),
          lavaProvider.getGasPrice(),
        ]);
        const block = await lavaProvider.getBlock(blockNumber);
        if (isStale) return;
        setNetStatus({
          chainId: network.chainId,
          blockNumber,
          gasPriceGwei: Number(ethers.utils.formatUnits(gasPrice, 'gwei')).toFixed(2),
          blockHash: block?.hash || null,
        });
        setNetUpdatedAt(new Date());
      } catch (e) {
        console.error('Error fetching network status from Lava:', e);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 5_000);

    return () => {
      isStale = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [lavaProvider]);

  return (
    <div className="App">
      <header className="app-header">
        <div className="container">
          <h1 className="title">Token Dashboard</h1>
          <p className="subtitle">Interact with your ERC-20 on {CONFIG.NETWORK.chainName || 'the configured network'}.</p>
        </div>
      </header>

      <main className="container">
        <section className="toolbar">
          <ConnectWallet account={account} connectWallet={connectWallet} />
        </section>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {successMessage && <div className="alert alert-success" role="status">{successMessage}</div>}

        {account ? (
          <div className="grid">
            <div className="card">
              <h2 className="card-title">{tokenName} ({tokenSymbol})</h2>
              <div className="meta">
                <div className="meta-row">
                  <span className="label">Contract</span>
                  <span className="value monospace">{shortAddress(CONFIG.CONTRACT_ADDRESS)}</span>
                </div>
                <div className="meta-row">
                  <span className="label">Account</span>
                  <span className="value monospace">{shortAddress(account)}</span>
                </div>
                <div className="meta-row">
                  <span className="label">Balance</span>
                  <span className="value">{balance} {tokenSymbol}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Mint</h3>
              <form onSubmit={handleMintSubmit} className="form">
                <div className="form-group">
                  <label htmlFor="mintAmount">Amount</label>
                  <input
                    type="text"
                    id="mintAmount"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    placeholder="e.g. 100.0"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                  />
                </div>
                <button type="submit" className="btn" disabled={isProcessing}>
                  {isProcessing ? 'Processing…' : 'Mint'}
                </button>
              </form>
            </div>

            <div className="card">
              <h3 className="card-title">Transfer</h3>
              <form onSubmit={handleTransferSubmit} className="form">
                <div className="form-group">
                  <label htmlFor="transferTo">Recipient</label>
                  <input
                    type="text"
                    id="transferTo"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x…"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="transferAmount">Amount</label>
                  <input
                    type="text"
                    id="transferAmount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="e.g. 25"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                  />
                </div>
                <button type="submit" className="btn" disabled={isProcessing}>
                  {isProcessing ? 'Processing…' : 'Transfer'}
                </button>
              </form>
            </div>

            {/* Expandable Network Status (via Lava RPC) */}
            <div className="card">
              <button
                type="button"
                className="action-button"
                style={{ width: '100%' }}
                onClick={() => setNetOpen((v) => !v)}
                aria-expanded={netOpen}
                aria-controls="lava-net-status"
              >
                {netOpen ? 'Hide Network Status (Lava RPC Live)' : 'Show Network Status (Lava RPC Live)'}
              </button>

              {netOpen && (
                <div id="lava-net-status" className="meta" style={{ marginTop: 12 }}>
                  <div className="meta-row">
                    <span className="label">Chain ID</span>
                    <span className="value monospace">{netStatus.chainId ?? '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Block #</span>
                    <span className="value monospace">{netStatus.blockNumber ?? '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Gas Price</span>
                    <span className="value">{netStatus.gasPriceGwei ? `${netStatus.gasPriceGwei} Gwei` : '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Block Hash</span>
                    <span className="value monospace">{netStatus.blockHash ? shortAddress(netStatus.blockHash) : '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Last Updated</span>
                    <span className="value">{netUpdatedAt ? netUpdatedAt.toLocaleTimeString() : '—'}</span>
                  </div>
                </div>
              )}
            </div>

            {lastTxReceipt && (
              <div className="card">
                <h3 className="card-title">Last Transaction Receipt</h3>
                <div className="meta">
                  <div className="meta-row">
                    <span className="label">Tx Hash</span>
                    <span className="value monospace">{shortAddress(lastTxReceipt.transactionHash)}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Block</span>
                    <span className="value monospace">{lastTxReceipt.blockNumber}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Gas Used</span>
                    <span className="value">{lastTxReceipt.gasUsed?.toString?.() || '—'}</span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Fee</span>
                    <span className="value">
                      {formatTxFeeEth(lastTxReceipt) ? `${formatTxFeeEth(lastTxReceipt)} ETH` : '—'}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="label">Status</span>
                    <span className="value">{lastTxReceipt.status === 1 ? '✅ Success' : '❌ Failed'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state card">
            <h2 className="card-title">Wallet not connected</h2>
            <p>Connect your wallet to view your balance and manage tokens.</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>Built on {CONFIG.NETWORK.chainName || 'configured network'} • Powered by Lava RPC</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
