import { Connection, Keypair, PublicKey, SendTransactionError } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@staratlas/anchor";
import {
  Priority,
  StarAtlasManagerPrograms,
  MainData,
  ResourceMints,
  StarAtlasManagerGalia,
} from "../types/types";
import { getMainData } from "../apis/getMainData";
import { getResourceMints } from "../apis/getResourceMints";
import { GetMainDataError, GetResourceMintsError } from "../common/errors";
import {
  readFromRPCOrError,
  readAllFromRPC,
  createAssociatedTokenAccountIdempotent,
  AsyncSigner,
  keypairToAsyncSigner,
  InstructionReturn,
  sendTransaction,
} from "@staratlas/data-source";
import { GALACTIC_MARKETPLACE_IDL } from "@staratlas/galactic-marketplace";
import {
  Game,
  GameState,
  getCargoPodsByAuthority,
  MineItem,
  Planet,
  Points,
  Resource,
  RiskZonesData,
  SAGE_IDL,
  Sector,
  Ship,
  Star,
  Starbase,
  StarbaseLevelInfo,
  StarbaseUpkeepInfo,
} from "@staratlas/sage";
import { CRAFTING_IDL } from "@staratlas/crafting";
import { CARGO_IDL, CargoType, CargoStatsDefinition } from "@staratlas/cargo";
import { PLAYER_PROFILE_IDL } from "@staratlas/player-profile";
import { PROFILE_VAULT_IDL } from "@staratlas/profile-vault";
import { PROFILE_FACTION_IDL } from "@staratlas/profile-faction";
import { POINTS_IDL } from "@staratlas/points";
import { POINTS_STORE_IDL } from "@staratlas/points-store";
import {
  APTransactionBuilderConstructor,
  ATLAS_FEE_PAYER_IDL,
  AtlasPrimeTransactionBuilder,
  DummyKeys,
  PostTransactionArgs,
} from "@staratlas/atlas-prime";
import { CLAIM_STAKE_IDL } from "@staratlas/claim-stake";
import { SCORE_IDL } from "@staratlas/score";
import { ENLIST_TO_FACTION_IDL } from "@staratlas/faction-enlistment";
import { getPrimeData } from "../apis/getPrimeData";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PlayerHandler } from "./PlayerHandler";
export class StarAtlasManager {
  // --- ATTRIBUTES ---
  // Connection
  private connection: Connection;
  private provider!: AnchorProvider;
  private priority: Priority;
  private funder!: AsyncSigner;

  // Keys
  private mainData!: MainData; // Game, Programs, Tokens
  private resourceMints!: ResourceMints;

  // Programs
  private programs!: StarAtlasManagerPrograms;

  // Accounts
  private game!: Game;
  private cargoStatsDefinition!: CargoStatsDefinition;
  private points!: Points;
  private riskZones!: RiskZonesData;

  private gameState!: GameState;
  private starbaseLevels!: StarbaseLevelInfo;
  private upkeep!: StarbaseUpkeepInfo;

  private galia!: StarAtlasManagerGalia;

  private ships!: Ship[]; // Ship è l'account che contiene i dati delle navi su SAGE

  private cargoTypes!: CargoType[]; // CargoType è l'account che contiene i dati di ogni risorsa rispetto alle stive (es. peso)

  // Atlas Prime
  private dummyKeys!: DummyKeys;

  // --- METHODS ---
  private constructor() {
    this.connection = new Connection(process.env.MAIN_RPC_URL, "confirmed");
    this.priority = "None";
    this.programs = {} as StarAtlasManagerPrograms;
    this.galia = {} as StarAtlasManagerGalia;
  }

  static async init(keypair: Keypair): Promise<StarAtlasManager> {
    try {
      const starAtlas = new StarAtlasManager();

      const funder = keypairToAsyncSigner(keypair);
      starAtlas.funder = funder;

      const provider = new AnchorProvider(
        starAtlas.connection,
        new Wallet(keypair),
        AnchorProvider.defaultOptions(),
      );
      starAtlas.provider = provider;

      const [mainData, resourceMints, dummyKeys] = await Promise.all([
        getMainData(),
        getResourceMints(),
        getPrimeData(),
      ]);

      starAtlas.dummyKeys = dummyKeys;

      starAtlas.mainData = mainData;
      starAtlas.resourceMints = resourceMints;

      starAtlas.programs.galacticMarketplaceProgram = new Program(
        GALACTIC_MARKETPLACE_IDL,
        mainData.programs.galacticMarketplaceProgramId,
        provider,
      );

      starAtlas.programs.sageProgram = new Program(
        SAGE_IDL,
        mainData.programs.sageProgramId,
        provider,
      );

      starAtlas.programs.craftingProgram = new Program(
        CRAFTING_IDL,
        mainData.programs.craftingProgramId,
        provider,
      );

      starAtlas.programs.cargoProgram = new Program(
        CARGO_IDL,
        mainData.programs.cargoProgramId,
        provider,
      );

      starAtlas.programs.playerProfileProgram = new Program(
        PLAYER_PROFILE_IDL,
        mainData.programs.playerProfileProgramId,
        provider,
      );

      starAtlas.programs.profileVaultProgram = new Program(
        PROFILE_VAULT_IDL,
        mainData.programs.profileVaultProgramId,
        provider,
      );

      starAtlas.programs.profileFactionProgram = new Program(
        PROFILE_FACTION_IDL,
        mainData.programs.profileFactionProgramId,
        provider,
      );

      starAtlas.programs.pointsProgram = new Program(
        POINTS_IDL,
        mainData.programs.pointsProgramId,
        provider,
      );

      starAtlas.programs.pointsStoreProgram = new Program(
        POINTS_STORE_IDL,
        mainData.programs.pointsStoreProgramId,
        provider,
      );

      starAtlas.programs.atlasPrimeProgram = new Program(
        ATLAS_FEE_PAYER_IDL,
        mainData.programs.atlasPrimeProgramId,
        provider,
      );

      starAtlas.programs.claimStakesProgram = new Program(
        CLAIM_STAKE_IDL,
        mainData.programs.claimStakesProgramId,
        provider,
      );

      starAtlas.programs.scoreProgram = new Program(
        SCORE_IDL,
        mainData.programs.scoreProgramId,
        provider,
      );

      starAtlas.programs.factionEnlistmentProgram = new Program(
        ENLIST_TO_FACTION_IDL,
        mainData.programs.factionEnlistmentProgramId,
        provider,
      );

      const [
        game,
        ships,
        cargoTypes,
        // sectors,
        stars,
        planets,
        starbases,
        mineItems,
        resources,
      ] = await Promise.all([
        starAtlas.fetchGame(),
        starAtlas.fetchShips(),
        starAtlas.fetchCargoTypes(),
        // starAtlas.fetchSectors(),
        starAtlas.fetchStars(),
        starAtlas.fetchPlanets(),
        starAtlas.fetchStarbases(),
        starAtlas.fetchMineItems(),
        starAtlas.fetchResources(),
      ]);

      starAtlas.game = game.game;
      starAtlas.cargoStatsDefinition = game.cargoStatsDefinition;
      starAtlas.points = game.game.data.points;
      starAtlas.riskZones = game.game.data.riskZones;

      starAtlas.gameState = game.gameState;
      starAtlas.starbaseLevels = game.gameState.data.fleet.starbaseLevels;
      starAtlas.upkeep = game.gameState.data.fleet.upkeep;

      // starAtlas.galia.sectors = sectors;
      starAtlas.galia.stars = stars;
      starAtlas.galia.planets = planets;
      starAtlas.galia.starbases = starbases;
      starAtlas.galia.mineItems = mineItems;
      starAtlas.galia.resources = resources;

      starAtlas.ships = ships;
      starAtlas.cargoTypes = cargoTypes;

      return starAtlas;
    } catch (e) {
      if (e instanceof GetMainDataError) throw e;
      if (e instanceof GetResourceMintsError) throw e;
      throw e;
    }
  }

  // Getters
  public getProvider() {
    return this.provider;
  }

  public getAsyncSigner() {
    return this.funder;
  }

  public getPrograms() {
    return this.programs;
  }

  public getGame() {
    return this.game;
  }

  public getGameState() {
    return this.gameState;
  }

  public getPoints() {
    return this.points;
  }

  public getCargoStatsDefinition() {
    return this.cargoStatsDefinition;
  }

  public getCargoTypes() {
    return this.cargoTypes;
  }

  public getGalia() {
    return this.galia;
  }

  // Fetch
  private async fetchGame(): Promise<{
    game: Game;
    gameState: GameState;
    cargoStatsDefinition: CargoStatsDefinition;
  }> {
    try {
      const game: Game = await readFromRPCOrError(
        this.provider.connection,
        this.programs.sageProgram,
        this.mainData.game.gameId,
        Game,
        "confirmed",
      );

      const gameState: GameState = await readFromRPCOrError(
        this.provider.connection,
        this.programs.sageProgram,
        game.data.gameState,
        GameState,
        "confirmed",
      );

      const cargoStatsDefinition = await readFromRPCOrError(
        this.provider.connection,
        this.programs.cargoProgram,
        game.data.cargo.statsDefinition,
        CargoStatsDefinition,
        "confirmed",
      );

      return { game, gameState, cargoStatsDefinition };
    } catch (e) {
      throw e;
    }
  }

  private async fetchShips(): Promise<Ship[]> {
    try {
      const fetchShips = await readAllFromRPC(
        this.provider.connection,
        this.programs.sageProgram,
        Ship,
        "confirmed",
      );

      const ships = fetchShips.flatMap((ship) => (ship.type === "ok" ? [ship.data] : []));

      return ships;
    } catch (e) {
      throw e;
    }
  }

  private async fetchCargoTypes(): Promise<CargoType[]> {
    try {
      const fetchCargoTypes = await readAllFromRPC(
        this.provider.connection,
        this.programs.cargoProgram,
        CargoType,
        "confirmed",
      );

      const cargoTypes = fetchCargoTypes.flatMap((item) =>
        item.type === "ok" ? [item.data] : [],
      );

      return cargoTypes;
    } catch (e) {
      throw e;
    }
  }

  // Unused
  private async fetchSectors(): Promise<Sector[]> {
    try {
      const fetchSectors = await readAllFromRPC(
        this.provider.connection,
        this.programs.sageProgram,
        Sector,
        "confirmed",
      );

      const sectors = fetchSectors.flatMap((sector) =>
        sector.type === "ok" ? [sector.data] : [],
      );

      return sectors;
    } catch (e) {
      throw e;
    }
  }

  private async fetchStars(): Promise<Star[]> {
    try {
      const fetchStars = await readAllFromRPC(
        this.provider.connection,
        this.programs.sageProgram,
        Star,
        "confirmed",
      );

      const stars = fetchStars.flatMap((star) => (star.type === "ok" ? [star.data] : []));

      return stars;
    } catch (e) {
      throw e;
    }
  }

  private async fetchPlanets(): Promise<Planet[]> {
    try {
      const fetchPlanets = await readAllFromRPC(
        this.provider.connection,
        this.programs.sageProgram,
        Planet,
        "confirmed",
      );

      const planets = fetchPlanets.flatMap((planet) =>
        planet.type === "ok" ? [planet.data] : [],
      );

      return planets;
    } catch (e) {
      throw e;
    }
  }

  private async fetchStarbases(): Promise<Starbase[]> {
    try {
      const fetchStarbases = await readAllFromRPC(
        this.provider.connection,
        this.programs.sageProgram,
        Starbase,
        "confirmed",
      );

      const starbases = fetchStarbases.flatMap((starbase) =>
        starbase.type === "ok" ? [starbase.data] : [],
      );

      return starbases;
    } catch (e) {
      throw e;
    }
  }

  // Mine Item contains data about a resource in Sage (like hardness)
  private async fetchMineItems(): Promise<MineItem[]> {
    try {
      const fetchMineItems = await readAllFromRPC(
        this.provider.connection,
        this.programs.sageProgram,
        MineItem,
        "confirmed",
      );

      const mineItems = fetchMineItems.flatMap((mineItem) =>
        mineItem.type === "ok" ? [mineItem.data] : [],
      );

      return mineItems;
    } catch (e) {
      throw e;
    }
  }

  // Resource contains data about a resource in a planet (like richness or mining stats)
  private async fetchResources(): Promise<Resource[]> {
    try {
      const fetchResources = await readAllFromRPC(
        this.provider.connection,
        this.programs.sageProgram,
        Resource,
        "confirmed",
      );

      const resources = fetchResources.flatMap((resource) =>
        resource.type === "ok" ? [resource.data] : [],
      );

      return resources;
    } catch (e) {
      throw e;
    }
  }

  // Setters
  setPriority(): void {}

  setConnection(): void {}

  setKeypair(): void {}

  // Helpers
  /***
   * Dato il mint di una risorsa, consente di ottenere il cargoType
   */
  public getCargoTypeByMint(mint: PublicKey) {
    const [cargoType] = this.cargoTypes.filter((item) => item.data.mint.equals(mint));
    return cargoType;
  }

  /***
   * Dato un account authority, consente di ottenere i cargoPods
   */
  public async getCargoPodsByAuthority(authority: PublicKey) {
    try {
      const fetchCargoPods = await getCargoPodsByAuthority(
        this.provider.connection,
        this.programs.cargoProgram,
        authority,
      );

      const cargoPods = fetchCargoPods.flatMap((pod) =>
        pod.type === "ok" ? [pod.data] : [],
      );

      if (cargoPods.length == 0) return { type: "CargoPodsNotFound" as const };

      return { type: "Success" as const, data: cargoPods };
    } catch (e) {
      return { type: "CargoPodsNotFound" as const };
    }
  }

  public getStarbaseByKey(key: PublicKey) {
    const [starbase] = this.galia.starbases.filter((item) => item.key.equals(key));
    return starbase;
  }

  // Txs
  /* public async sendDynamicTransaction(
    instructions: InstructionReturn[],
  ): Promise<TransactionSignature> {
    const txs = await buildDynamicTransactions(instructions, this.funder, {
      connection: this.provider.connection,
    });

    if (txs.isErr()) {
      throw txs.error;
    }

    let txSignature: TransactionSignature = "";

    for (const tx of txs.value) {
      const result = await sendTransaction(tx, this.provider.connection, {
        commitment: "confirmed",
        sendOptions: {
          skipPreflight: false,
        },
      });

      if (result.value.isErr()) {
        throw result.value.error;
      }

      txSignature = result.value.value;
    }

    return txSignature;
  } */

  public async buildAndSendDynamicTransactions(
    instructions: InstructionReturn[],
    playerHandler: PlayerHandler,
    vaultAuthority: PublicKey,
  ) {
    const pta: PostTransactionArgs = {
      /* noVault: {
        funder: this.funder,
        funderTokenAccount: getAssociatedTokenAddressSync(
          this.mainData.tokens.atlas,
          this.funder.publicKey(),
          true,
        ),
      }, */
      vault: {
        funderVaultAuthority: vaultAuthority,
        funderVault: getAssociatedTokenAddressSync(
          this.mainData.tokens.atlas,
          vaultAuthority,
          true,
        ), // ATLAS ATA
        keyInput: {
          key: this.funder,
          profile: playerHandler.getPlayerProfile(),
          playerProfileProgram: this.programs.playerProfileProgram,
        },
        vaultProgram: this.programs.profileVaultProgram,
      },
    };

    const aptbc: APTransactionBuilderConstructor = {
      afpUrl: "https://prime.staratlas.com/",
      connection: this.provider.connection,
      commitment: "confirmed",
      dummyKeys: this.dummyKeys,
      postArgs: pta,
      program: this.programs.atlasPrimeProgram,
    };

    const aptb = new AtlasPrimeTransactionBuilder(aptbc);
    aptb.add(instructions);

    try {
      const tx = await aptb.buildNextOptimalTransaction();
      if (tx.isErr()) {
        throw tx.error;
      }
      // console.log(tx.value);

      const sim = await this.provider.connection.simulateTransaction(
        tx.value.transaction,
      );
      console.log("Error: ", sim.value.err);

      const sig = await sendTransaction(tx.value, this.provider.connection, {
        sendOptions: { skipPreflight: true },
      });
      console.log(sig.value);

      console.log("Remaining: ", aptb.instructions.length);
    } catch (e) {
      if (e instanceof SendTransactionError) {
        const logs = await e.getLogs(this.provider.connection);
        console.log(logs);
      }
      console.log(e);
    }
  }

  // Instructions
  public ixCreateAssociatedTokenAccountIdempotent(owner: PublicKey, mint: PublicKey) {
    const associatedTokenAccount = createAssociatedTokenAccountIdempotent(
      mint,
      owner,
      true,
    );
    const associatedTokenAccountKey = associatedTokenAccount.address;
    const associatedTokenAccountKeyIx = associatedTokenAccount.instructions;

    return {
      address: associatedTokenAccountKey,
      instruction: associatedTokenAccountKeyIx,
    };
  }
}
