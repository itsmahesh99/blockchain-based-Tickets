'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import TicketNFT from '../contracts/TicketNFT.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Home() {
  return (
    <div>
      <h1>Hello from Next.js!</h1>
    </div>
  );
}
