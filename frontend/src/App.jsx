import { useState, useEffect } from "react";
import { isConnected } from "@stacks/connect";
import ConnectWallet from "./components/ConnectWallet";
import RegisterIP from "./components/ip/RegisterIP";
import IPDashboard from "./components/ip/IPDashboard";
import EventCreatorForm from "./components/event/EventCreatorForm";
import TicketClaimer from "./components/ticket/TicketClaimer";
import LoadingSpinner from "./components/LoadingSpinner";

// import './styles/App.css'
import "./App.css";

function App() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState("register");

  // Simulate initial loading
  useEffect(() => {
    // Simulate app initialization
    const initializeApp = async () => {
      // Simulate async operations like checking wallet connection, loading contracts, etc.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setLoading(false);
    };

    initializeApp();
  }, []);

  // Check for connection changes
  useEffect(() => {
    const checkConnection = () => {
      const connectionStatus = isConnected();
      if (connectionStatus !== connected) {
        setConnected(connectionStatus);
      }
    };

    const intervalId = setInterval(checkConnection, 500);
    return () => clearInterval(intervalId);
  }, [connected]);

  if (loading) {
    return <LoadingSpinner message="ProofSpace" />;
  }

  return (
    <div>
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <h1>🏕️ ProofSpace</h1>
            </div>
          </div>

          <nav className="header-nav">
            <button
              className={`nav-link ${
                currentPage === "register" ? "active" : ""
              }`}
              onClick={() => setCurrentPage("register")}
            >
              📝 Register IP
            </button>
            <button
              className={`nav-link ${
                currentPage === "dashboard" ? "active" : ""
              }`}
              onClick={() => setCurrentPage("dashboard")}
            >
              📚 Dashboard
            </button>
            <button
              className={`nav-link ${currentPage === "events" ? "active" : ""}`}
              onClick={() => setCurrentPage("events")}
            >
              🎫 Create Events
            </button>
            <button
              className={`nav-link ${
                currentPage === "tickets" ? "active" : ""
              }`}
              onClick={() => setCurrentPage("tickets")}
            >
              🎟️ Claim Tickets
            </button>
          </nav>

          <div className="header-right">
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main Content */}
      {connected ? (
        <main className="app-main">
          {currentPage === "register" ? (
            <>
              <RegisterIP />
            </>
          ) : currentPage === "events" ? (
            <EventCreatorForm />
          ) : currentPage === "dashboard" ? (
            <IPDashboard />
          ) : currentPage === "tickets" ? (
            <TicketClaimer />
          ) : (
            <RegisterIP />
          )}
        </main>
      ) : (
        <main className="app-main">
          <div className="connect-wallet-prompt">
            <div className="prompt-content">
              <h2>Connect Your Wallet</h2>
              <p>Please connect your wallet to access ProofSpace features</p>
              <ConnectWallet />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
