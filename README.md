# ProofSpace - Stacks IP & Event Management Platform

ProofSpace is a decentralized application built on the Stacks blockchain that allows users to register intellectual property (IP), create events, and manage ticketing - all secured by smart contracts.

## 🌟 Key Features

### Intellectual Property Registration

- Register creative works, inventions, and digital assets on the Stacks blockchain
- Store metadata and file hashes for verification
- Maintain permanent ownership records

### Event Creation & Management

- Create events with title, description, location, and date
- Set ticket prices and maximum capacity
- Manage event status (active/inactive)

### Decentralized Ticketing System

- Purchase tickets for events using STX cryptocurrency
- Verify ticket ownership through blockchain records
- Secure peer-to-peer transactions

## 🏗️ Architecture

### Backend (Smart Contracts)

- Built with Clarity smart contract language for the Stacks blockchain
- Core data structures for IPs, Events, and Tickets

### Frontend (React/Vite)

- Modern React application with Vite build tool
- Responsive design for desktop and mobile
- Stacks Wallet integration for authentication and transactions

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- A Stacks wallet (e.g., Hiro Wallet)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd stacks-project
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### Running the Application

Start the frontend development server:

```bash
cd frontend
npm run dev
```

Open your browser to `http://localhost:5173`

### Smart Contract Deployment

To deploy the smart contract to a Stacks network:

```bash
cd backend
clarinet deploy
```

## 🛠️ Technologies Used

- **Clarity**: Smart contract language for Stacks
- **Clarinet**: Development toolkit for Stacks smart contracts
- **React**: JavaScript library for building user interfaces
- **Vite**: Next-generation frontend tooling
- **Stacks.js**: JavaScript libraries for Stacks blockchain integration

## 📱 Responsive Design

The application features a fully responsive design that works on:

- Desktop computers
- Tablets
- Mobile devices

## 🎨 UI Highlights

- Modern gradient-based color scheme with orange accents
- Smooth animations and transitions
- Loading states with animated spinners
- Clear visual feedback for user interactions
