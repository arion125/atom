import * as dotenv from "dotenv";
import { Keypair, PublicKey } from "@solana/web3.js";
import { StarAtlasManager } from "./core/StarAtlasManager";
import { PlayerHandler } from "./core/PlayerHandler";
import { base64ToJson } from "./utils/base64ToJson";
import { ProfileVault } from "@staratlas/profile-vault";
import { RentBank } from "@staratlas/atlas-prime";
import { LoadCargo } from "./types/types";

// cli();

// 1. workflow che gestisce l'esecuzione del piano
// 2. workflow che rinnova un token jwt in scadenza

dotenv.config();
const main = async () => {
  const bs58Key = Uint8Array.from([]);

  const walletPbk = new PublicKey("");
  const playerProfilePbk = new PublicKey("");
  const hotKeypair = Keypair.fromSecretKey(bs58Key);
  // const hotWallet = new Wallet(hotKeypair);

  const plan = base64ToJson("");

  const sam = await StarAtlasManager.init(hotKeypair);
  const ph = await PlayerHandler.init(sam, playerProfilePbk);

  const [vault] = ProfileVault.findVaultSigner(
    sam.getPrograms().profileVaultProgram,
    playerProfilePbk,
    walletPbk,
  ); // ATLAS vault (authority)

  const [rentBank] = RentBank.findAddress(sam.getPrograms().atlasPrimeProgram, {
    funderProfile: playerProfilePbk,
  }); // SOL vault

  console.log("Vault:", vault);
  console.log("Rent bank:", rentBank);

  // console.log("Plan action:", plan.route.actions[0]);
  const load = await ph.getFleets()[0].ixLoadCargo(plan.route.actions[0] as LoadCargo);
  await sam.buildAndSendDynamicTransactions(load, ph, vault);
};

main();
