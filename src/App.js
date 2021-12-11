import React from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";

import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";
import idl from "./idl.json";

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
let baseAccount = Keypair.generate();

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TEST_GIFS = [
  "https://i.giphy.com/media/eIG0HfouRQJQr1wBzz/giphy.webp",
  "https://media3.giphy.com/media/L71a8LW2UrKwPaWNYM/giphy.gif?cid=ecf05e47rr9qizx2msjucl1xyvuu47d7kf25tqt2lvo024uo&rid=giphy.gif&ct=g",
  "https://media4.giphy.com/media/AeFmQjHMtEySooOc8K/giphy.gif?cid=ecf05e47qdzhdma2y3ugn32lkgi972z9mpfzocjj6z1ro4ec&rid=giphy.gif&ct=g",
  "https://i.giphy.com/media/PAqjdPkJLDsmBRSYUp/giphy.webp",
];

export default function App() {
  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */

  const [walletAddress, setWalletAddress] = React.useState(null);
  const [gifList, setGifList] = React.useState([]);

  React.useEffect(() => {
    const onLoad = async () => {
      await connectToPhantomWalletIfFound(setWalletAddress);
    };

    window.addEventListener("load", onLoad);

    return () => window.removeEventListener("load", onLoad);
  }, []);

  React.useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");

      // Call Solana program here.
      getGifList(setGifList);
    }
  }, [walletAddress]);

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">🖼 Squid GIF Portal</p>
          <p className="sub-text">
            View your Squid Game GIF collection in the metaverse ✨
          </p>

          {walletAddress
            ? renderConnectedContainer({ gifList, setGifList })
            : renderNotConnectedContainer({ setWalletAddress })}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
}

function renderNotConnectedContainer({ setWalletAddress }) {
  return (
    <button
      className="cta-button connect-wallet-button"
      onClick={() => connectWallet(setWalletAddress)}
    >
      Connect to Wallet
    </button>
  );
}

function renderConnectedContainer({ gifList = [], setGifList }) {
  return (
    <div className="connected-container">
      <p className="connected-text">Connected to your Phantom Wallet!</p>
      <div className="gif-container">
        {gifList.map((gif, index) => (
          <img alt="GIF" className="gif" key={index} src={gif} />
        ))}
      </div>
    </div>
  );
}

async function connectWallet(setWalletAddress) {
  console.log("Connecting to wallet...");
  const { solana } = window;

  if (solana) {
    const response = await solana.connect();
    console.log("Connected with Public Key:", response.publicKey.toString());
    setWalletAddress(response.publicKey.toString());
  }
}

async function connectToPhantomWalletIfFound(setWalletAddress) {
  try {
    const { solana } = window;

    if (solana) {
      if (solana.isPhantom) {
        console.log("Phantom wallet found!");

        const response = await solana.connect({ onlyIfTrusted: true });

        console.log(
          "Connected with Public Key:",
          response.publicKey.toString()
        );

        setWalletAddress(response.publicKey.toString());
      }
    } else {
      alert("Solana object not found! Get a Phantom Wallet 👻");
    }
  } catch (error) {
    console.error(error);
  }
}

async function sendGif(gifUrl) {
  if (gifUrl.length === 0) {
    console.log("No gif link given!");
    return;
  }

  console.log("Gif link:", gifUrl);
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    await program.rpc.addGif(gifUrl, {
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      },
    });
    console.log("GIF successfully sent to program", gifUrl);

    await getGifList();
  } catch (error) {
    console.log("Error sending GIF:", error);
  }
}

function getProvider() {
  const connection = new Connection(network, opts.preflightCommitment);
  const provider = new Provider(
    connection,
    window.solana,
    opts.preflightCommitment
  );
  return provider;
}

async function getGifList(setGifList) {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const account = await program.account.baseAccount.fetch(
      baseAccount.publicKey
    );

    console.log("Got the account", account);
    setGifList(account.gifList);
  } catch (error) {
    console.log("Error in getGifList: ", error);
    setGifList(null);
  }
}
