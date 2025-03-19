import { useState } from 'react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { parseEther } from 'viem';
import { TicketNFT } from '../contracts/types';
import ticketNFTAbi from '../contracts/TicketNFT.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

interface Ticket {
  id: number;
  name: string;
  price: string;
  image: string;
}

export default function TicketList() {
  const [tickets] = useState<Ticket[]>([
    {
      id: 1,
      name: "VIP Concert Ticket",
      price: "0.1",
      image: "/ticket-placeholder.png"
    }
  ]);

  const { address } = useAccount();

  const { config } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: ticketNFTAbi,
    functionName: 'mintTicket',
    args: ['ipfs://QmTicketMetadataHash'],
    value: parseEther('0.1'),
  });

  const { write: mintTicket, isLoading } = useContractWrite(config);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Available Tickets</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border rounded-lg p-4 shadow-lg">
            <img
              src={ticket.image}
              alt={ticket.name}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
            <h2 className="text-xl font-semibold mb-2">{ticket.name}</h2>
            <p className="text-gray-600 mb-4">{ticket.price} ETH</p>
            <button
              onClick={() => mintTicket?.()}
              disabled={!mintTicket || isLoading || !address}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Purchasing...' : 'Purchase Ticket'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 