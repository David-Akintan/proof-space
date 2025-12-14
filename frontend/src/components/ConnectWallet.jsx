import { useState, useRef, useEffect } from "react";
import { Button, Dropdown } from "react-daisyui";
import { connect, disconnect, isConnected, request } from "@stacks/connect";
import {
  fetchCallReadOnlyFunction,
  stringUtf8CV,
  uintCV,
} from "@stacks/transactions";
import { AddressPurpose, RpcErrorCode } from "@sats-connect/core";
import "./Connectwallet.css";

const network = "testnet";

const ConnectWallet = () => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [addresses, setAddresses] = useState(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false); // dropdown state

  const wrapperRef = useRef(null);

  // Handle dropdown close on outside click or Esc key
  useEffect(() => {
    function handleOutside(e) {
      if (
        open &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  // Check for connection changes
  useEffect(() => {
    const checkConnection = () => {
      const connectionStatus = isConnected();
      if (connectionStatus !== connected) {
        setConnected(connectionStatus);
        if (connectionStatus) {
          // loadMessages();
        }
      }
    };

    const intervalId = setInterval(checkConnection, 500);
    return () => clearInterval(intervalId);
  }, [connected]);

  // useEffect(() => {
  //   setConnected(isConnected());
  //   if (isConnected()) {
  //     loadMessages();
  //   }
  // }, []);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };

  const connectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      await connect({
        appDetails: {
          name: "Stacks Ticket",
          icon: window.location.origin + "/logo.svg",
        },
        onFinish: () => {
          setConnected(true);
          // Small delay to ensure connection is fully established
          setTimeout(() => {
            loadMessages();
          }, 100);
        },
      });
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const disconnectWallet = async () => {
    disconnect();
    setConnected(false);
  };

  const copyAddress = () => {
    if (mainAddr) {
      navigator.clipboard.writeText(mainAddr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setOpen(false);
    }
  };

  return (
    <div className="wallet-container">
      {error && <p className="wallet-error">⚠️ {error}</p>}

      {!connected ? (
        <Button
          onClick={connectWallet}
          disabled={loading}
          className="wallet-btn"
        >
          {loading ? "Connecting..." : "Connect Wallet"}
        </Button>
      ) : (
        <div ref={wrapperRef} className="wallet-wrapper">
          <Button
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            className="wallet-btn"
          >
            Connected
          </Button>

          {open && (
            <div className="wallet-dropdown">
              <button onClick={copyAddress} className="copy">
                📋 Copy Address
              </button>
              <button onClick={disconnectWallet} className="disconnect">
                🔌 Disconnect
              </button>
            </div>
          )}

          {copied && <p className="wallet-copied">✅ Address copied!</p>}
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;
