import { useState, useRef } from 'react';
import { uploadTicketMetadata } from '../utils/ipfs';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../constants';

interface MintTicketFormProps {
  onSuccess?: () => void;
}

export default function MintTicketForm({ onSuccess }: MintTicketFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Form fields
  const [eventName, setEventName] = useState('');
  const [seat, setSeat] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('0.1'); // Default price in ETH
  const [organizer, setOrganizer] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      // Check if image is selected
      const imageFile = fileInputRef.current?.files?.[0];
      if (!imageFile) {
        throw new Error('Please select a ticket image');
      }

      // Upload metadata to IPFS
      const metadataUrl = await uploadTicketMetadata(
        eventName,
        seat,
        date,
        location,
        `${price} ETH`,
        organizer,
        imageFile
      );

      // Connect to contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Mint NFT with metadata
      const tx = await contract.mintTicket(metadataUrl, {
        value: ethers.parseEther(price),
        gasLimit: 200000
      });

      console.log('Minting ticket, transaction:', tx.hash);
      const receipt = await tx.wait();
      console.log('Ticket minted! Receipt:', receipt);

      // Reset form
      setEventName('');
      setSeat('');
      setDate('');
      setLocation('');
      setPrice('0.1');
      setOrganizer('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call success callback
      onSuccess?.();
    } catch (err) {
      console.error('Error minting ticket:', err);
      setError(err instanceof Error ? err.message : 'Error minting ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Mint New Ticket</h2>
      
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Event Name</label>
        <input
          type="text"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Seat</label>
        <input
          type="text"
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Price (ETH)</label>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Organizer</label>
        <input
          type="text"
          value={organizer}
          onChange={(e) => setOrganizer(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Ticket Image</label>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          required
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Minting...' : 'Mint Ticket'}
      </button>
    </form>
  );
} 