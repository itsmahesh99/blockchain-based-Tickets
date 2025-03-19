import { NFTStorage } from 'nft.storage';

// Replace with your NFT.Storage API key
const NFT_STORAGE_KEY = 'YOUR_NFT_STORAGE_API_KEY';
const client = new NFTStorage({ token: NFT_STORAGE_KEY });

export interface TicketMetadata {
  name: string;
  description: string;
  image: File | string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
  external_url?: string;
}

export async function uploadTicketMetadata(
  eventName: string,
  seat: string,
  date: string,
  location: string,
  price: string,
  organizer: string,
  imageFile: File
): Promise<string> {
  try {
    // Create metadata object
    const metadata: TicketMetadata = {
      name: `${eventName} Ticket`,
      description: `Ticket for ${eventName} at ${location}`,
      image: imageFile,
      attributes: [
        {
          trait_type: "Event",
          value: eventName
        },
        {
          trait_type: "Seat",
          value: seat
        },
        {
          trait_type: "Date",
          value: date
        },
        {
          trait_type: "Location",
          value: location
        },
        {
          trait_type: "Price",
          value: price
        },
        {
          trait_type: "Organizer",
          value: organizer
        }
      ]
    };

    // Upload to IPFS via NFT.Storage
    const result = await client.store(metadata);
    console.log('IPFS CID:', result.url);
    return result.url; // Returns ipfs://... URL
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
}

export async function retrieveTicketMetadata(ipfsUrl: string): Promise<TicketMetadata | null> {
  try {
    // Convert ipfs:// URL to HTTP URL
    const cid = ipfsUrl.replace('ipfs://', '');
    const gateway = 'https://nftstorage.link/ipfs/';
    const response = await fetch(gateway + cid);
    
    if (!response.ok) {
      throw new Error('Failed to fetch metadata');
    }

    const metadata = await response.json();
    return metadata;
  } catch (error) {
    console.error('Error retrieving from IPFS:', error);
    return null;
  }
} 