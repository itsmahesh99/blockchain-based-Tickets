'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './constants';
import MintTicketForm from './components/MintTicketForm';
import { retrieveTicketMetadata } from './utils/ipfs';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Ticket {
  tokenId: string;
  price: string;
  isUsed: boolean;
  approvedResalePrice: string | null;
  metadata: {
    name: string;
    description: string;
    attributes: {
      trait_type: string;
      value: string;
    }[];
  } | null;
}

interface EventLog extends ethers.Log {
  args: {
    tokenId: bigint;
    price: bigint;
    buyer: string;
    seller?: string;
  };
}

export default function Home() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [tokenURI, setTokenURI] = useState<string>('');
  const [ownedTickets, setOwnedTickets] = useState<Ticket[]>([]);
  const [resalePrice, setResalePrice] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<string>('');

  // Function to fetch owned tickets with metadata
  const fetchOwnedTickets = async () => {
    if (!contract || !account) return;
    
    try {
      setLoading(true);
      setError('');

      const filter = contract.filters.TicketMinted(account);
      const events = await contract.queryFilter(filter);
      
      const tickets = await Promise.all(events.map(async (event: any) => {
        const tokenId = event.args.tokenId;
        const isUsed = await contract.isUsed(tokenId);
        const originalPrice = await contract.originalPrice(tokenId);
        const approvedPrice = await contract.getApprovedPrice(tokenId);
        const tokenURI = await contract.tokenURI(tokenId);
        
        // Fetch metadata from IPFS
        let metadata = null;
        try {
          metadata = await retrieveTicketMetadata(tokenURI);
        } catch (err) {
          console.error('Error fetching metadata for token', tokenId, err);
        }
        
        return {
          tokenId: tokenId.toString(),
          price: ethers.formatEther(originalPrice),
          isUsed,
          approvedResalePrice: approvedPrice.toString() !== '0' ? ethers.formatEther(approvedPrice) : null,
          metadata
        };
      }));

      setOwnedTickets(tickets);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      setError(`Error fetching tickets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to use a ticket
  const useTicket = async (tokenId: string) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      setError('');

      const tx = await contract.useTicket(tokenId, {
        gasLimit: 200000
      });
      
      console.log('Using ticket, transaction:', tx.hash);
      setError('Using ticket... Please wait for confirmation');
      
      const receipt = await tx.wait();
      console.log('Ticket used! Receipt:', receipt);
      
      await fetchOwnedTickets(); // Refresh ticket list
    } catch (error: any) {
      console.error('Error using ticket:', error);
      setError(`Error using ticket: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to list a ticket for resale
  const resellTicket = async (tokenId: string, price: string) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      setError('');

      const priceInWei = ethers.parseEther(price);
      const tx = await contract.resellTicket(tokenId, priceInWei, {
        gasLimit: 200000
      });
      
      console.log('Listing ticket for resale, transaction:', tx.hash);
      setError('Listing ticket... Please wait for confirmation');
      
      const receipt = await tx.wait();
      console.log('Ticket listed! Receipt:', receipt);
      
      await fetchOwnedTickets(); // Refresh ticket list
    } catch (error: any) {
      console.error('Error listing ticket:', error);
      setError(`Error listing ticket: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to mint a new ticket
  const mintTicket = async () => {
    if (!contract || !tokenURI) return;
    
    try {
      setLoading(true);
      setError('');

      const ticketPrice = await contract.ticketPrice();
      const tx = await contract.mintTicket(tokenURI, {
        value: ticketPrice,
        gasLimit: 200000
      });
      
      console.log('Minting ticket, transaction:', tx.hash);
      setError('Minting ticket... Please wait for confirmation');
      
      const receipt = await tx.wait();
      console.log('Ticket minted! Receipt:', receipt);
      
      alert('Ticket minted successfully!');
      await fetchOwnedTickets(); // Refresh ticket list
      setTokenURI(''); // Clear input
    } catch (error: unknown) {
      console.error('Error minting ticket:', error);
      if (error instanceof Error) {
        setError(`Error minting ticket: ${error.message}`);
      } else {
        setError('Error minting ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (typeof window.ethereum !== 'undefined') {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x7a69') { // Hardhat's chainId
          setError('Please connect to Localhost:8545 network in MetaMask');
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
          setError('No accounts found. Please check MetaMask.');
          return;
        }

        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        console.log('Connected to account:', address);

        const ticketContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer
        );
        setContract(ticketContract);
        console.log('Contract instance created');

        // Verify contract code exists at address
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x') {
          setError('No contract found at specified address. Please check deployment.');
          return;
        }

        // Fetch owned tickets after connecting
        await fetchOwnedTickets();
      } else {
        setError('Please install MetaMask!');
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(`Error connecting wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch owned tickets when account changes
  useEffect(() => {
    if (account && contract) {
      fetchOwnedTickets();
    }
  }, [account, contract]);

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">TicketNFT Marketplace</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Wallet connection section */}
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Wallet Connection</h2>
          <p className="mb-4">
            {account ? (
              <>Connected: {account.slice(0, 6)}...{account.slice(-4)}</>
            ) : (
              'Not connected'
            )}
          </p>
          <button 
            onClick={connectWallet}
            disabled={loading}
            className={`bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>

        {/* Mint ticket form */}
        {account && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
            <MintTicketForm onSuccess={fetchOwnedTickets} />
          </div>
        )}

        {/* Owned tickets section */}
        {account && (
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Your Tickets</h2>
            {loading ? (
              <p>Loading tickets...</p>
            ) : ownedTickets.length === 0 ? (
              <p>No tickets found</p>
            ) : (
              <div className="space-y-4">
                {ownedTickets.map((ticket) => (
                  <div key={ticket.tokenId} className="p-4 border rounded-lg">
                    {ticket.metadata ? (
                      <>
                        <h3 className="text-xl font-medium">{ticket.metadata.name}</h3>
                        <p className="text-gray-600">{ticket.metadata.description}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {ticket.metadata.attributes.map((attr, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{attr.trait_type}:</span>{' '}
                              {attr.value}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="font-medium">Token ID: {ticket.tokenId}</p>
                    )}
                    <p className="mt-2">Original Price: {ticket.price} ETH</p>
                    <p>Status: {ticket.isUsed ? 'Used' : 'Available'}</p>
                    {ticket.approvedResalePrice && (
                      <p>Listed for: {ticket.approvedResalePrice} ETH</p>
                    )}
                    
                    {!ticket.isUsed && !ticket.approvedResalePrice && (
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={() => useTicket(ticket.tokenId)}
                          disabled={loading}
                          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                        >
                          Use Ticket
                        </button>
                        
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Resale price in ETH"
                            className="flex-1 p-2 border rounded"
                            onChange={(e) => {
                              if (e.target.value && !isNaN(parseFloat(e.target.value))) {
                                resellTicket(ticket.tokenId, e.target.value);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              const input = document.querySelector(`input[data-token-id="${ticket.tokenId}"]`) as HTMLInputElement;
                              if (input && input.value) {
                                resellTicket(ticket.tokenId, input.value);
                              }
                            }}
                            disabled={loading}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                          >
                            List for Resale
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
} 