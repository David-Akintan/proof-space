import fetch from "node-fetch";
global.fetch = fetch;

import {
  makeContractCall,
  broadcastTransaction,
  stringUtf8CV,
  PostConditionMode,
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  AnchorMode,
} from "@stacks/transactions";
import STACKS_TESTNET from '@stacks/network';
import { generateWallet } from "@stacks/wallet-sdk";
import dotenv from "dotenv";
import { contractAddress, contractName } from "../frontend/src/Constants/constant";

dotenv.config();

const mnemonic = process.env.MNEMONIC;
const network = "testnet";

const getPrivateKey = async () => {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "",
  });
  return wallet.accounts[0].stxPrivateKey;
};

const addMessage = async (message) => {
  try {
    const privateKey = await getPrivateKey(mnemonic);
    console.log("🔑 Private key derived successfully: ", privateKey);

    const functionArgs = [
      stringUtf8CV(message),
    ];

    const txOptions = {
      contractAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
      contractName: "my-contract",
      functionName: "add-message",
      functionArgs: functionArgs,
      senderKey: privateKey,
      network: network,
      postConditions: [],
      postConditionMode: PostConditionMode.Allow,
      
    };

    console.log("🔨 Building transaction...");
    const transaction = await makeContractCall(txOptions);
    console.log("✅ Transaction built successfully: ", transaction);

    console.log("📡 Broadcasting transaction...");
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network: network,
    });
    console.log("Broadcast response: ", broadcastResponse);

    if (broadcastResponse.error) {
      console.error("❌ Broadcast error:", broadcastResponse.error);
      throw new Error(broadcastResponse.error);
    }

    console.log("✅ Transaction broadcast successfully!");
    console.log("Transaction ID:", broadcastResponse.txid);
    console.log(
      `🔍 View on explorer: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=testnet`
    );

    return broadcastResponse;
  } catch (error) {
    console.error("❌ Error in regIP function:", error);
    throw error;
  }
};

const getAllIPs = async () => {
    try {
      const network = "testnet";
        const privateKey = await getPrivateKey();
        
        const result = await fetchCallReadOnlyFunction({
          contractAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
          contractName: "test-contract",
          functionName: 'get-ip-count',
          functionArgs: [],
          senderAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
          network: network,
        });

        const totalCount = cvToJSON(result).value.value;
        console.log('Total IP count: ', totalCount);

        const allIPs = [];
        for (let i = 0; i < totalCount; i++) {
          const ipResult = await fetchCallReadOnlyFunction({
            contractAddress: 'STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28',
            contractName: "test-contract",
            functionName: 'get-ip',
            functionArgs: [uintCV(i)],
            senderAddress: 'STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28',
            network: network,
          });

          const ipData = cvToJSON(ipResult);
          console.log(`IP Data for ID ${i}: `, ipData);

          if (ipData.value) {
            allIPs.push({
              id: i,
              ipfsHash: ipData.value.value['ipfs-hash'].value,
              title: ipData.value.value['title'].value,
              description: ipData.value.value['description'],
              licenseType: ipData.value.value['license-type'].value,
              owner: ipData.value.value['owner'].value,
              fileHash: ipData.value.value['file-hash'].value,
              filename: ipData.value.value['filename'].value,
              category: ipData.value.value['category'].value,
              timestamp: ipData.value.value['timestamp'].value,
            });
          }
          console.log('Timestamp: ', ipData.value.value['timestamp'].value);
        }
        
        console.log("Fetched IPs: ", allIPs);
        // setIpEntries(allIPs);
      } catch (error) {
        console.error("Error fetching IPs: ", error);
        // setLoading(false);
      }

  }

const purchaseTicket = async (eventId, ticketPriceSTX) => {
  try {
    const network = "testnet";
    const privateKey = await getPrivateKey();
    const wallet = await generateWallet({
      secretKey: mnemonic,
      password: "",
    });

    const senderAddress = wallet.accounts[0].address;


    const postConditions = [
        Pc.principal(senderAddress).willSendEq(ticketPriceSTX).ustx(),
      ];

    const txOptions = {
      contractAddress: contractAddress,
      contractName: contractName,
      functionName: "purchase-ticket",
      functionArgs: [uintCV(eventId)],
      senderKey: privateKey,
      network: network,
      postConditions: postConditions,
      postConditionMode: PostConditionMode.Deny,
    };

    console.log("🔨 Building transaction...");
    const transaction = await makeContractCall(txOptions);
    console.log("✅ Transaction built successfully: ", transaction);

    console.log("📡 Broadcasting transaction...");
    const broadcastResponse = await broadcastTransaction({
      transaction,
      network: network,
    });
    console.log("Broadcast response: ", broadcastResponse);

    if (broadcastResponse.error) {
      console.error("❌ Broadcast error:", broadcastResponse.error);
      throw new Error(broadcastResponse.error);
    }

    console.log("✅ Transaction broadcast successfully!");
    console.log("Transaction ID:", broadcastResponse.txid);
    console.log(
      `🔍 View on explorer: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=testnet`
    );

    return broadcastResponse;
  } catch (error) {
    console.error("❌ Error in purchaseTicket function:", error);
    throw error;
  } finally {
    setIsLoading(false);
    setPurchasingMap((prev) => ({ ...prev, [eventId]: false }));
  }
};

const main = async () => {
  try {
    // await addMessage("Hello, this is my third message!");
    await getAllIPs();
  } catch (error) {
    console.error("❌ Error in main function:", error);
  }
};

main();