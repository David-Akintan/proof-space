import fetch from "node-fetch";
global.fetch = fetch;

import {
  makeContractCall,
  broadcastTransaction,
  stringUtf8CV,
  stringAsciiCV,
  PostConditionMode,
  AnchorMode,
} from "@stacks/transactions";
import STACKS_TESTNET from '@stacks/network';
import { generateWallet } from "@stacks/wallet-sdk";
import dotenv from "dotenv";

dotenv.config();

const mnemonic = process.env.MNEMONIC;
const network = "testnet";

const getPrivateKey = async (mnemonic) => {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "",
  });
  return wallet.accounts[0].stxPrivateKey;
};

const regIP = async (ipData) => {
  try {

    if (!ipData.ipfsHash?.trim()) throw new Error("IPFS hash is required");
    if (!ipData.title?.trim()) throw new Error("Title is required");
    if (!ipData.description?.trim()) throw new Error("Description is required");
    if (!ipData.licenseType?.trim()) throw new Error("License type is required");
    if (!ipData.fileHash?.trim()) throw new Error("File hash is required");
    if (!ipData.category?.trim()) throw new Error("Category is required");
    if (!ipData.filename?.trim()) throw new Error("Filename is required");

    const privateKey = await getPrivateKey(mnemonic);
    console.log("🔑 Private key derived successfully: ", privateKey);

    const functionArgs = [
      stringAsciiCV(ipData.ipfsHash),
      stringAsciiCV(ipData.title),
      stringAsciiCV(ipData.description),
      stringAsciiCV(ipData.licenseType),
      stringAsciiCV(ipData.fileHash),
      stringAsciiCV(ipData.category),
      stringAsciiCV(ipData.filename),
    ];

    const txOptions = {
      contractAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
      contractName: "test-contract",
      functionName: "register-ip",
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

const main = async () => {
  try {
    await regIP({
      ipfsHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      title: "My First IP",
      description: "This is a description of my first IP.",
      licenseType: "CC-BY",
      fileHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      category: "art",
      filename: "my-first-ip.png",
    });
  } catch (error) {
    console.error("❌ Error in main function:", error);
  }
};

main();