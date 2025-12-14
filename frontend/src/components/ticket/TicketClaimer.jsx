import React, { useState, useEffect, useRef } from "react";
import {
  connect,
  disconnect,
  isConnected,
  request,
  openContractCall,
} from "@stacks/connect";
import {
  makeContractCall,
  broadcastTransaction,
  stringAsciiCV,
  PostConditionMode,
  AnchorMode,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import { contractName, contractAddress } from "../../Constants/constant";
import { generateWallet } from "@stacks/wallet-sdk";
import "./TicketClaimer.css";

const TicketClaimer = () => {
  const [status, setStatus] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Event and ticket states
  const [availableEvents, setAvailableEvents] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [purchasingMap, setPurchasingMap] = useState({});
  const [eventImageUrl, setEventImageUrl] = useState(null);
  const [eventImageUrls, setEventImageUrls] = useState({});

  // New state for event filtering
  const [eventFilter, setEventFilter] = useState("all"); // 'all' or 'my-events'
  const [filteredEvents, setFilteredEvents] = useState([]);

  // User account state
  const [userAddress, setUserAddress] = useState(null);

  const network = "testnet";

  // Contract and connection states
  // const { provider } = useConnect();
  // const [contract, setContract] = useState(null);
  const [userAccount, setUserAccount] = useState(null);

  useEffect(() => {
    if (eventFilter === "all") {
      setFilteredEvents(availableEvents);
    } else if (eventFilter === "my-events" && userAccount) {
      const myEvents = availableEvents.filter(
        (event) => event.organizer.toLowerCase() === userAccount.toLowerCase()
      );
      setFilteredEvents(myEvents);
    }
  }, [eventFilter, availableEvents, userAccount]);

  useEffect(() => {
    if (isConnected) {
      fetchAvailableEvents();
      if (userAddress) {
        fetchUserTickets();
      }
    }
  }, [isConnected, userAddress]);

  //get current blockheight
  const getCurrentBlockHeight = async () => {
    try {
      // Use the network object's coreApiUrl property
      const apiUrl = "https://api.testnet.hiro.so"; // Hardcoded for testnet
      const response = await fetch(`${apiUrl}/v2/info`);
      const data = await response.json();
      return data.stacks_tip_height;
    } catch (error) {
      console.error("Error fetching block height:", error);
      // Fallback to a reasonable estimate
      return 100000;
    }
  };

  // Fetch available events from blockchain
  const fetchAvailableEvents = async () => {
    try {
      setLoadingEvents(true);
      console.log("Fetching events...");

      // Get total event count
      const countResult = await fetchCallReadOnlyFunction({
        contractAddress: contractAddress,
        contractName: contractName,
        functionName: "get-event-count",
        functionArgs: [],
        network,
        senderAddress: contractAddress,
      });

      const eventCount = cvToJSON(countResult).value.value;
      console.log("Total events:", eventCount);

      if (eventCount === 0) {
        setAvailableEvents([]);
        setLoadingEvents(false);
        return;
      }

      // Get current block height
      const currentBlockHeight = await getCurrentBlockHeight();
      console.log("Current block height:", currentBlockHeight);

      // Fetch all events
      const eventPromises = [];
      for (let i = 0; i < eventCount; i++) {
        eventPromises.push(
          fetchCallReadOnlyFunction({
            contractAddress: contractAddress,
            contractName: contractName,
            functionName: "get-event",
            functionArgs: [uintCV(i)],
            network: network,
            senderAddress: contractAddress,
          })
        );
      }

      const results = await Promise.all(eventPromises);

      // Process events
      const activeEvents = [];
      for (let i = 0; i < results.length; i++) {
        const eventData = cvToJSON(results[i]);

        if (eventData.value) {
          const ev = eventData.value.value;

          // Check if event is active and in the future
          if (
            ev["is-active"].value &&
            ev["event-date"].value > currentBlockHeight
          ) {
            let hasTicket = false;

            // Check if user has ticket
            if (userAddress) {
              try {
                const ticketCheckResult = await fetchCallReadOnlyFunction({
                  contractAddress: contractAddress,
                  contractName: contractName,
                  functionName: "has-ticket-for-event",
                  functionArgs: [principalCV(userAddress), uintCV(i)],
                  network: network,
                  senderAddress: contractAddress,
                });
                const ticketCheck = cvToJSON(ticketCheckResult);
                hasTicket = ticketCheck.value.value.found;
              } catch (error) {
                console.error("Error checking ticket:", error);
              }
            }

            // Fetch IPFS metadata
            let eventImageUrl = null;
            try {
              const ipfsHash = ev["ipfs-hash"].value;
              const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}/metadata.json`;
              const metadataResponse = await fetch(metadataUrl);

              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                if (metadata.eventImageHash && metadata.eventImageName) {
                  eventImageUrl = `https://gateway.pinata.cloud/ipfs/${metadata.eventImageHash}/${metadata.eventImageName}`;
                  setEventImageUrls((prev) => ({
                    ...prev,
                    [i]: eventImageUrl,
                  }));
                }
              }
            } catch (error) {
              console.error("Error fetching IPFS metadata:", error);
            }

            console.log("Current Event: ", ev);

            activeEvents.push({
              id: i,
              ipfsHash: ev["ipfs-hash"].value,
              title: ev.title.value,
              description: ev.description.value,
              location: ev.location.value,
              eventDate: ev["event-date"].value,
              ticketPrice: ev["ticket-price"].value,
              ticketPriceSTX: (ev["ticket-price"].value / 1000000).toFixed(6),
              maxTickets: ev["max-tickets"].value,
              soldTickets: ev["sold-tickets"].value,
              organizer: ev.organizer.value,
              category: ev.category.value,
              timestamp: ev.timestamp.value,
              isActive: ev["is-active"].value,
              hasTicket,
              remainingTickets:
                ev["max-tickets"].value - ev["sold-tickets"].value,
              eventImageUrl,
            });
          }
        }
      }

      console.log("Active events found:", activeEvents.length);
      setAvailableEvents(activeEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      setStatus("Error fetching events: " + error.message);
      addToast({
        type: "error",
        message: "Failed to fetch events",
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch user's tickets
  const fetchUserTickets = async () => {
    if (!userAddress) return;

    try {
      setLoadingTickets(true);
      console.log("Fetching tickets for: ", userAddress);

      // Get user's ticket IDs
      const ticketIdsResult = await fetchCallReadOnlyFunction({
        contractAddress: contractAddress,
        contractName: contractName,
        functionName: "get-user-tickets",
        functionArgs: [principalCV(userAddress)],
        network: network,
        senderAddress: contractAddress,
      });

      const ticketIds = cvToJSON(ticketIdsResult).value.value;
      console.log("Ticket IDs:", ticketIds);

      if (!ticketIds || ticketIds.length === 0) {
        setUserTickets([]);
        return;
      }

      // Fetch ticket details
      const ticketPromises = ticketIds.map((ticketId) =>
        fetchCallReadOnlyFunction({
          contractAddress: contractAddress,
          contractName: contractName,
          functionName: "get-ticket",
          functionArgs: [uintCV(ticketId.value)],
          network: network,
          senderAddress: contractAddress,
        })
      );

      const ticketResults = await Promise.all(ticketPromises);

      // Process tickets with event details
      const ticketsWithDetails = await Promise.all(
        ticketResults.map(async (result, index) => {
          try {
            const ticketData = cvToJSON(result);

            if (!ticketData.value) return null;

            const ticket = ticketData.value.value;
            const eventId = ticket["event-id"].value;

            // Fetch event details
            const eventResult = await fetchCallReadOnlyFunction({
              contractAddress,
              contractName,
              functionName: "get-event",
              functionArgs: [uintCV(eventId)],
              network,
              senderAddress: contractAddress,
            });

            const eventData = cvToJSON(eventResult);

            if (!eventData.value) return null;

            const event = eventData.value.value;

            return {
              ticketId: ticket["ticket-id"].value,
              eventId: eventId,
              purchaseTime: ticket["purchase-time"].value,
              isValid: ticket["is-valid"].value,
              eventTitle: event.title.value,
              eventDate: event["event-date"].value,
              eventLocation: event.location.value,
              eventDescription: event.description.value,
              ticketPrice: event["ticket-price"].value,
              ticketPriceSTX: (event["ticket-price"].value / 1000000).toFixed(
                6
              ),
              owner: ticket.owner.value,
            };
          } catch (error) {
            console.error("Error processing ticket:", error);
            return null;
          }
        })
      );

      const validTickets = ticketsWithDetails.filter((t) => t !== null);
      console.log("Fetched tickets:", validTickets.length);
      setUserTickets(validTickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      addToast({
        type: "error",
        message: "Failed to fetch tickets",
      });
    } finally {
      setLoadingTickets(false);
    }
  };

  // Purchase ticket function
  const handlePurchaseTicket = async (eventId, ticketPrice) => {
    if (!isConnected || !userAddress) {
      addToast({
        type: "error",
        message: "Please connect your wallet first",
      });
      return;
    }

    try {
      setIsLoading(true);
      setPurchasingMap((prev) => ({ ...prev, [eventId]: true }));

      console.log("Purchasing ticket for event:", eventId);
      console.log("Ticket price (microSTX):", ticketPrice);

      // Create post condition for STX transfer
      const postConditions = [
        Pc.principal(userAddress).willSendEq(ticketPrice).ustx(),
      ];

      await openContractCall({
        contractAddress: contractAddress,
        contractName: contractName,
        functionName: "purchase-ticket",
        functionArgs: [uintCV(eventId)],
        postConditions: postConditions,
        postConditionMode: PostConditionMode.Deny,
        network: network,
        appDetails: {
          name: "Event Ticketing Platform",
          icon: window.location.origin + "/favicon.ico",
        },
        onFinish: (data) => {
          console.log("Transaction submitted:", data.txId);
          addToast({
            type: "success",
            message: `Ticket purchased successfully!`,
            hash: data.txId,
          });

          // Refresh data after a delay
          setTimeout(() => {
            fetchAvailableEvents();
            fetchUserTickets();
          }, 3000);
        },
        onCancel: () => {
          console.log("Transaction cancelled");
          addToast({
            type: "error",
            message: "Transaction cancelled",
          });
        },
      });
    } catch (error) {
      console.error("Purchase error:", error);

      let errorMessage = "Failed to purchase ticket";
      if (error.message) {
        errorMessage = error.message;
      }

      addToast({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setPurchasingMap((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const addToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Format date helper
  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const canvasRef = useRef(null);

  // Generate QR Code for ticket
  const generateQRCode = async (ticketData) => {
    try {
      // Create QR code data with event information
      const qrData = {
        ticketId: ticketData.ticketId,
        eventTitle: ticketData.eventTitle,
        eventDate: ticketData.eventDate,
        eventLocation: ticketData.eventLocation,
        ticketPrice: ticketData.ticketPrice,
        purchaseTime: ticketData.purchaseTime,
        isValid: ticketData.isValid,
      };

      // Convert to JSON string and encode for QR code
      const qrString = JSON.stringify(qrData);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        qrString
      )}`;

      return qrCodeUrl;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  };

  // Download ticket as image
  const downloadTicketAsImage = async (ticket) => {
    try {
      // Create canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas size
      canvas.width = 800;
      canvas.height = 600;

      // Set background
      ctx.fillStyle = "#F9F6F2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add gradient background
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      );
      gradient.addColorStop(0, "#FF6D01");
      gradient.addColorStop(1, "#FF9160");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, 100);

      // Add title
      ctx.fillStyle = "#2B2B2B";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Stacks Event Ticket", canvas.width / 2, 60);

      // Add event title
      ctx.fillStyle = "#2D5A66";
      ctx.font = "bold 24px Arial";
      ctx.fillText(`Event Title: ${ticket.eventTitle}`, canvas.width / 2, 120);

      // Add ticket details
      ctx.fillStyle = "#2B2B2B";
      ctx.font = "16px Arial";
      ctx.textAlign = "left";

      const details = [
        `Ticket ID: #${ticket.ticketId}`,
        `Event Date: ${formatDate(ticket.eventDate)}`,
        `Location: ${ticket.eventLocation}`,
        `Price: ${ticket.ticketPrice} ETH`,
        `Purchase Date: ${formatDate(ticket.purchaseTime)}`,
        `Status: ${ticket.isValid ? "Valid" : "Invalid"}`,
      ];

      let yPosition = 180;
      details.forEach((detail) => {
        ctx.fillText(detail, 50, yPosition);
        yPosition += 30;
      });

      // Generate and add QR code
      const qrCodeUrl = await generateQRCode(ticket);
      if (qrCodeUrl) {
        const qrImage = new Image();
        qrImage.crossOrigin = "anonymous";
        qrImage.onload = () => {
          ctx.drawImage(
            qrImage,
            canvas.width - 250,
            canvas.height - 250,
            200,
            200
          );

          // Add QR code label
          ctx.fillStyle = "#2D5A66";
          ctx.font = "14px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            "Scan for event details",
            canvas.width - 150,
            canvas.height - 30
          );

          // Download the image
          const link = document.createElement("a");
          link.download = `ticket-${ticket.ticketId}.png`;
          link.href = canvas.toDataURL();
          link.click();
        };
        qrImage.src = qrCodeUrl;
      } else {
        // Download without QR code if generation fails
        const link = document.createElement("a");
        link.download = `ticket-${ticket.ticketId}.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
    } catch (error) {
      console.error("Error downloading ticket:", error);
      addToast({
        id: Date.now(),
        type: "error",
        message: "Failed to download ticket",
      });
    }
  };

  return (
    <div className="ticket-claimer-container">
      <div className="ticket-claimer-header">
        <h1>🎟️ Ticket Marketplace</h1>
        <p>Claim tickets for upcoming events on Stacks Network</p>
      </div>

      <div className="events-section">
        <div className="events-header">
          <h2>🎪 Available Events</h2>

          {/* Event Filter Toggle */}
          <div className="event-filter-toggle">
            <button
              className={`filter-btn ${eventFilter === "all" ? "active" : ""}`}
              onClick={() => setEventFilter("all")}
            >
              All Events ({availableEvents.length})
            </button>
            <button
              className={`filter-btn ${
                eventFilter === "my-events" ? "active" : ""
              }`}
              onClick={() => setEventFilter("my-events")}
            >
              My Events (
              {
                availableEvents.filter(
                  (event) =>
                    event.organizer.toLowerCase() === userAccount?.toLowerCase()
                ).length
              }
              )
            </button>
          </div>
        </div>

        {loadingEvents ? (
          <div className="loading">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="no-events">
            <p>
              {eventFilter === "all"
                ? "No active events available at the moment."
                : "You haven't created any events yet."}
            </p>
            <p>Check back later for new events!</p>
          </div>
        ) : (
          <div className="events-grid">
            {filteredEvents.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-image">
                  {eventImageUrls[event.id] ? (
                    <img
                      src={eventImageUrls[event.id]}
                      alt={event.title}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="event-image-placeholder">
                      <span>📷</span>
                    </div>
                  )}
                </div>

                <div className="event-content">
                  <div className="event-header">
                    <h3>{event.title}</h3>
                    <span className="event-category">{event.category}</span>
                  </div>

                  <div className="event-details">
                    <p>
                      <strong>📍 Location: </strong> {event.location}
                    </p>
                    <p>
                      <strong>📅 Date:</strong> {formatDate(event.eventDate)}
                    </p>
                    <p>
                      <strong>💰 Price:</strong> {event.ticketPrice} ETH
                    </p>
                    <p>
                      <strong>🎟️ Available:</strong> {event.remainingTickets} /{" "}
                      {event.maxTickets}
                    </p>
                    {eventFilter === "all" && (
                      <p>
                        <strong>👤 Organizer:</strong>{" "}
                        {event.organizer.slice(0, 6)}...
                        {event.organizer.slice(-4)}
                      </p>
                    )}
                  </div>

                  {event.hasTicket ? (
                    <div className="ticket-status owned">
                      ✅ You own a ticket for this event
                    </div>
                  ) : (
                    <button
                      className="purchase-button"
                      onClick={() =>
                        handlePurchaseTicket(event.id, event.ticketPriceWei)
                      }
                      disabled={purchasingMap[event.id]}
                    >
                      {purchasingMap[event.id]
                        ? "Processing..."
                        : `Purchase Ticket (${event.ticketPrice} ETH)`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="my-tickets-section">
        <div className="tickets-header">
          <h2>🎫 My Tickets</h2>
          <div className="tickets-count">
            <span className="tickets-badge">{userTickets.length} Tickets</span>
          </div>
        </div>

        {loadingTickets ? (
          <div className="loading">Loading your tickets...</div>
        ) : userTickets.length === 0 ? (
          <div className="no-tickets">
            <div className="no-tickets-icon">🎫</div>
            <h3>No Tickets Yet</h3>
            <p>You don't have any tickets yet.</p>
            {!isConnected ? (
              <p>Connect to Stacks Network to purchase tickets!</p>
            ) : (
              <p>Purchase tickets from the available events above!</p>
            )}
          </div>
        ) : (
          <div className="tickets-grid">
            {userTickets.map((ticket) => (
              <div key={ticket.ticketId} className="ticket-card">
                <div className="ticket-header">
                  <h3>{ticket.eventTitle}</h3>
                  <span className="ticket-id">#{ticket.ticketId}</span>
                </div>

                <div className="ticket-details">
                  <p>
                    <strong>📅 Event Date:</strong>{" "}
                    {formatDate(ticket.eventDate)}
                  </p>
                  <p>
                    <strong>📍 Location:</strong> {ticket.eventLocation}
                  </p>
                  <p>
                    <strong>💰 Paid:</strong> {ticket.ticketPrice} ETH
                  </p>
                  <p>
                    <strong>📝 Description:</strong> {ticket.eventDescription}
                  </p>
                  <p>
                    <strong>🕒 Purchased:</strong>{" "}
                    {formatDate(ticket.purchaseTime)}
                  </p>
                </div>

                <div className="ticket-actions">
                  <div className="ticket-status">
                    {ticket.isValid ? (
                      <span className="valid" style={{ color: "#000000" }}>
                        ✅ Valid Ticket
                      </span>
                    ) : (
                      <span className="invalid" style={{ color: "#000000" }}>
                        ❌ Invalid Ticket
                      </span>
                    )}
                  </div>

                  <button
                    className="download-ticket-btn"
                    onClick={() => downloadTicketAsImage(ticket)}
                    title="Download ticket as image"
                  >
                    📥 Download Ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div className="toast-content">
              <span className="toast-message">{toast.message}</span>
              {toast.hash && (
                <a
                  href={`/${toast.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="toast-link"
                >
                  View Transaction
                </a>
              )}
            </div>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketClaimer;
