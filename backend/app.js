import {
  connect,
  disconnect,
  isConnected,
  request,
  openContractCall,
} from "@stacks/connect";
import {
  fetchCallReadOnlyFunction,
  stringUtf8CV,
  uintCV,
  makeContractCall,
  broadcastTransaction,
  standardPrincipalCV,
  AnchorMode,
  Cl,
  Pc,
  PostConditionMode,
} from "@stacks/transactions";
import { deriveStxPrivateKey, generateWallet } from "@stacks/wallet-sdk";
import STACKS_TESTNET from "@stacks/network";
import dotenv from "dotenv";
import { get } from "http";
dotenv.config();

const mnemonic = process.env.MNEMONIC;


const network = "testnet"; // uses default testnet RPC URL

const getPrivateKey = async (mnemonic) => {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "",
  });
  // console.log("Generated Private Key: ", wallet.accounts[0].stxPrivateKey);
  return wallet.accounts[0].stxPrivateKey;

  // console.log(wallet);
};

// const getMessageCount = async () => {
//   try {
//     const result = await fetchCallReadOnlyFunction({
//       contractAddress: 'STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28',
//       contractName: 'my-contract',
//       functionName: 'get-recent-messages',
//       functionArgs: [],
//       senderAddress: 'STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28', // can be any valid Stacks address
//       network,
//     })

//     const messageCount = parseInt(result.value);
//     console.log('Message count:', messageCount);
//     return messageCount;

//   } catch (error) {
//     console.error('Error fetching message count:', error);
//   }
// }

// const getIpCount = async () => {
//   try {
//     const result = await fetchCallReadOnlyFunction({
//       contractAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
//       contractName: "test-contract",
//       functionName: "get-ip-count",
//       functionArgs: functionArgs,
//       senderAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28", // can be any valid Stacks address
//       network,
//     });

//     console.log("IP count:", result.value);
//     return result;
//   } catch (error) {
//     console.error("Error fetching IP count:", error);
//   }
// };

const createRegistry = async (ipData) => {

  try {
    const privateKey = await getPrivateKey(mnemonic);

    // First ensure wallet is connected
    const connected = await connect({
      appDetails: {
        name: "IP Registry",
        icon: window.location.origin + "/favicon.ico",
      },
    });


    const functionArgs = [
      stringUtf8CV(ipData.ipfsHash),
      stringUtf8CV(ipData.title),
      stringUtf8CV(ipData.description),
      stringUtf8CV(ipData.licenseType),
      stringUtf8CV(ipData.fileHash),
      stringUtf8CV(ipData.category),
      stringUtf8CV(ipData.filename),
    ];

  const result = await request('stx_callContract', {
    contract: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28.test-contract",
      functionName: "register-ip",
      functionArgs: functionArgs.map(arg => arg.hex),
      network: network,
      // senderAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
      // senderKey: privateKey,
      postConditions: [],
      postConditionMode: PostConditionMode.Deny,
  });

  if (result.error) {
    console.error("❌ Error calling contract: ", result.error);
  } else {
    console.log("✅ Contract call result: ", result);
  }
  
} catch (error) {
    console.error("❌ Error in app function:", error);
  }
};

// const registerIP = async (ipData) => {
//   try {
//     const privateKey = await getPrivateKey(mnemonic);
//     console.log("Using Private Key: ", privateKey);

//     const functionArgs = [
//       stringUtf8CV(ipData.hash),
//       stringUtf8CV(ipData.title),
//       stringUtf8CV(ipData.description),
//       stringUtf8CV(ipData.licenseType),
//       stringUtf8CV(ipData.fileHash),
//       stringUtf8CV(ipData.category),
//       stringUtf8CV(ipData.filename),
//     ];

//     const txnOptions = {
//       contractAddress: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
//       contractName: "test-contract",
//       functionName: "register-ip",
//       senderKey: privateKey,
//       functionArgs: functionArgs,
//       sender: "STN8JGEFMNGN5XGFKT6993XHMTPXWRFPNSGRNV28",
//       network: network,
//       // NO POST CONDITIONS - no asset transfers
//       postConditions: [],
//       postConditionMode: PostConditionMode.Deny,
//     };

//     const transaction = await makeContractCall(txnOptions);
//     console.log("Transaction created: ", transaction);
//     const broadcastResponse = await broadcastTransaction(transaction, network);

//     if (broadcastResponse.error) {
//       console.error("❌ Error broadcasting transaction: ", broadcastResponse.error);
//       throw new Error(broadcastResponse.error);
//     } else {
//        console.log("✅ Transaction broadcast successfully!");
//       console.log("Transaction ID:", broadcastResponse.txid);
//       console.log(
//         `View on explorer: https://explorer.hiro.so/txid/${broadcastResponse.txid}?chain=testnet`
//       );
//       console.log("Broadcast response: ", broadcastResponse);
//       return broadcastResponse;
//     }
    
//   } catch (error) {
//     console.error("Error registering IP:", error);
//     throw error;
//   }
// };

const main = async () => {
  try {
    await createRegistry({
      ipfsHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      title: "My First IP",
      description: "This is a description of my first IP.",
      licenseType: "CC-BY",
      fileHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      category: "art",
      filename: "my-first-ip.png",
    });
  } catch (error) {
    console.error("Error in main function:", error);
  }
};

main();