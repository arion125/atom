// types/types.d.ts

import { PublicKey } from "@solana/web3.js";
import { BN } from "@staratlas/anchor";
import { GalacticMarketplaceIDLProgram } from "@staratlas/galactic-marketplace";
import { SageIDLProgram } from "@staratlas/sage";
import { CraftingIDLProgram } from "@staratlas/crafting";
import { CargoIDLProgram } from "@staratlas/cargo";
import { PlayerProfileIDLProgram } from "@staratlas/player-profile";
import { ProfileVaultIDLProgram } from "@staratlas/profile-vault";
import { ProfileFactionIDLProgram } from "@staratlas/profile-faction";
import { PointsIDLProgram } from "@staratlas/points";
import { PointsStoreIDLProgram } from "@staratlas/points-store";
import { AtlasFeePayerIDLProgram } from "@staratlas/atlas-prime";
import { ClaimStakeIDLProgram } from "@staratlas/claim-stake";
import { ScoreIDLProgram } from "@staratlas/score";
import { FactionEnlistmentIDLProgram } from "@staratlas/faction-enlistment";

// ACTION
interface ActionBaseRaw {
  ix: string;
  sector: {
    key: string;
    name: string;
    coordinates: string[];
  };
}

interface ActionBase {
  ix: string;
  sector: {
    key: PublicKey;
    name: string;
    coordinates: BN[];
  };
}

export interface LoadCargoRaw extends ActionBaseRaw {
  ix: "loadCargo" | "refuel" | "reammo" | "refood";
  cargoPodType: string;
  resource: string;
  amount: number;
  starbase: string;
  cargoType: {
    key: string;
    resourceWeight: number;
  };
  starbasePlayer: {
    key: string;
    starbasePlayerCargoPod: string;
    starbasePlayerCargoPodMintAta: string;
  };
}

export interface LoadCargo extends ActionBase {
  ix: "loadCargo" | "refuel" | "reammo" | "refood";
  cargoPodType: string;
  resource: PublicKey;
  amount: number;
  starbase: PublicKey;
  cargoType: {
    key: PublicKey;
    resourceWeight: number;
  };
  starbasePlayer: {
    key: PublicKey;
    starbasePlayerCargoPod: PublicKey;
    starbasePlayerCargoPodMintAta: PublicKey;
  };
}

export interface UnloadCargoRaw extends ActionBaseRaw {
  ix: "unloadCargo";
  cargoPodType: string;
  resource: string;
  amount: number;
  starbase: string;
  cargoType: {
    key: string;
    resourceWeight: number;
  };
  starbasePlayer: {
    key: string;
    starbasePlayerCargoPod: string;
    starbasePlayerCargoPodMintAta: string;
  };
}

export interface UnloadCargo extends ActionBase {
  ix: "unloadCargo";
  cargoPodType: string;
  resource: PublicKey;
  amount: number;
  starbase: PublicKey;
  cargoType: {
    key: PublicKey;
    resourceWeight: number;
  };
  starbasePlayer: {
    key: PublicKey;
    starbasePlayerCargoPod: PublicKey;
    starbasePlayerCargoPodMintAta: PublicKey;
  };
}

export interface StartMiningRaw extends ActionBaseRaw {
  ix: "startMining";
  resource: string;
  mineItem: string;
  timeNeeded: number;
  fuelNeeded: number;
  ammoNeeded: number;
  foodNeeded: number;
}

export interface StartMining extends ActionBase {
  ix: "startMining";
  resource: PublicKey;
  mineItem: PublicKey;
  timeNeeded: number;
  fuelNeeded: number;
  ammoNeeded: number;
  foodNeeded: number;
}

export interface TripRaw extends ActionBaseRaw {
  ix: "trip";
  movementType: string;
  destinationSector: string;
  distance: number;
  fuelNeeded: number;
}

export interface Trip extends ActionBase {
  ix: "trip";
  movementType: string;
  destinationSector: PublicKey;
  distance: number;
  fuelNeeded: number;
}

export type ActionRaw = LoadCargoRaw | UnloadCargoRaw | StartMiningRaw | TripRaw;
export type Action = LoadCargo | UnloadCargo | StartMining | Trip;

// ROUTE
export interface RouteRaw {
  name: string;
  startSector: string;
  endSector: string;
  actions: ActionRaw[];
}

export interface Route {
  name: string;
  startSector: PublicKey;
  endSector: PublicKey;
  actions: Action[];
}

// PLAN
export interface PlanRaw {
  id: number;
  name: string;
  fleet: string;
  pubkey: string;
  profile: string;
  repeat: number;
  route: RouteRaw;
}

export interface Plan {
  id: number;
  name: string;
  fleet: PublicKey;
  pubkey: PublicKey;
  profile: PublicKey;
  repeat: number;
  route: Route;
}

// AXIOS
export interface CreateLogPayload {
  message: string;
  pubkey: PublicKey;
  planId: number;
}

export interface GetPlanParams {
  pubkey: PublicKey;
  planName: string;
}

export interface DefaultApiResponse {
  message: string;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  error: string;
}

export interface MainDataRaw {
  game: {
    gameId: string;
  };
  programs: {
    galacticMarketplaceProgramId: string;
    sageProgramId: string;
    craftingProgramId: string;
    cargoProgramId: string;
    playerProfileProgramId: string;
    profileVaultProgramId: string;
    profileFactionProgramId: string;
    pointsProgramId: string;
    pointsStoreProgramId: string;
    atlasPrimeProgramId: string;
    claimStakesProgramId: string;
    scoreProgramId: string;
    factionEnlistmentProgramId: string;
  };
  tokens: {
    atlas: string;
    polis: string;
  };
}

export interface ResourceMintsRaw {
  silica: string;
  nitrogen: string;
  titanium_ore: string;
  titanium: string;
  aerogel: string;
  field_stabilizer: string;
  lumanite: string;
  power_source: string;
  electromagnet: string;
  hydrogen: string;
  copper: string;
  biomass: string;
  iron_ore: string;
  graphene: string;
  super_conductor: string;
  strange_emitter: string;
  carbon: string;
  iron: string;
  copper_ore: string;
  particle_accelerator: string;
  survey_data_unit: string;
  diamond: string;
  hydrocarbon: string;
  radiation_absorber: string;
  energy_substrate: string;
  framework: string;
  copper_wire: string;
  polymer: string;
  electronics: string;
  magnet: string;
  crystal_lattice: string;
  steel: string;
  arco: string;
  rochinol: string;
  fuel: string;
  food: string;
  toolkit: string;
  ammunition: string;
}

export interface Base64Script {
  base64Script: string;
}

// STAR ATLAS MANAGER CLASS
export interface MainData {
  game: {
    gameId: PublicKey;
  };
  programs: {
    galacticMarketplaceProgramId: PublicKey;
    sageProgramId: PublicKey;
    craftingProgramId: PublicKey;
    cargoProgramId: PublicKey;
    playerProfileProgramId: PublicKey;
    profileVaultProgramId: PublicKey;
    profileFactionProgramId: PublicKey;
    pointsProgramId: PublicKey;
    pointsStoreProgramId: PublicKey;
    atlasPrimeProgramId: PublicKey;
    claimStakesProgramId: PublicKey;
    scoreProgramId: PublicKey;
    factionEnlistmentProgramId: PublicKey;
  };
  tokens: {
    atlas: PublicKey;
    polis: PublicKey;
  };
}

export interface ResourceMints {
  silica: PublicKey;
  nitrogen: PublicKey;
  titanium_ore: PublicKey;
  titanium: PublicKey;
  aerogel: PublicKey;
  field_stabilizer: PublicKey;
  lumanite: PublicKey;
  power_source: PublicKey;
  electromagnet: PublicKey;
  hydrogen: PublicKey;
  copper: PublicKey;
  biomass: PublicKey;
  iron_ore: PublicKey;
  graphene: PublicKey;
  super_conductor: PublicKey;
  strange_emitter: PublicKey;
  carbon: PublicKey;
  iron: PublicKey;
  copper_ore: PublicKey;
  particle_accelerator: PublicKey;
  survey_data_unit: PublicKey;
  diamond: PublicKey;
  hydrocarbon: PublicKey;
  radiation_absorber: PublicKey;
  energy_substrate: PublicKey;
  framework: PublicKey;
  copper_wire: PublicKey;
  polymer: PublicKey;
  electronics: PublicKey;
  magnet: PublicKey;
  crystal_lattice: PublicKey;
  steel: PublicKey;
  arco: PublicKey;
  rochinol: PublicKey;
  fuel: PublicKey;
  food: PublicKey;
  toolkit: PublicKey;
  ammunition: PublicKey;
}

export interface StarAtlasManagerPrograms {
  galacticMarketplaceProgram: GalacticMarketplaceIDLProgram;
  sageProgram: SageIDLProgram;
  craftingProgram: CraftingIDLProgram;
  cargoProgram: CargoIDLProgram;
  playerProfileProgram: PlayerProfileIDLProgram;
  profileVaultProgram: ProfileVaultIDLProgram;
  profileFactionProgram: ProfileFactionIDLProgram;
  pointsProgram: PointsIDLProgram;
  pointsStoreProgram: PointsStoreIDLProgram;
  atlasPrimeProgram: AtlasFeePayerIDLProgram;
  claimStakesProgram: ClaimStakeIDLProgram;
  scoreProgram: ScoreIDLProgram;
  factionEnlistmentProgram: FactionEnlistmentIDLProgram;
}

export type Priority = "None" | "Low" | "Medium" | "High";

export type CargoPodType = "FuelTank" | "AmmoBank" | "CargoHold";

// FLEET HANDLER CLASS
export type LoadedResources = {
  mint: PublicKey;
  amount: BN;
  spaceInCargo: BN;
  cargoTypeKey: PublicKey;
  tokenAccountKey: PublicKey;
};

export type CargoPodEnhanced = {
  key: PublicKey;
  loadedAmount: BN;
  resources: LoadedResources[]; // resource_mint: CargoPodLoadedResource
  maxCapacity: BN;
  fullLoad: boolean;
};

// CRYPTO
export type EncryptedData = {
  salt: string;
  content: string;
  iv: string;
  tag: string;
};

type CryptoContent = {
  salt: string;
  content: string;
  iv: string;
  tag: string;
};

type CryptoResult =
  | { type: "Success"; result?: CryptoContent | Buffer }
  | { type: "EncryptionFailed" }
  | { type: "DecryptionFailed" }
  | { type: "SecretTooShort" }
  | { type: "InvalidSaltLength" }
  | { type: "InvalidIVLength" }
  | { type: "InvalidTagLength" }
  | { type: "InvalidContentHex" };

// PM2
export type IPCPacket = {
  type: string;
  data: {
    planName: string;
    publicKey: PublicKey;
    pwd: string;
  };
  topic: string;
};
