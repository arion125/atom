import {
  Connection,
  Keypair,
  PublicKey,
  TransactionSignature,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@staratlas/anchor';
import {
  Priority,
  StarAtlasManagerPrograms,
  MainData,
  ResourceMints,
} from '../../types/types';
import { getMainData } from '../../apis/getMainData';
import { getResourceMints } from '../../apis/getResourceMints';
import { GetMainDataError, GetResourceMintsError } from '../../common/errors';
import {
  readFromRPCOrError,
  readAllFromRPC,
  createAssociatedTokenAccountIdempotent,
  AsyncSigner,
  keypairToAsyncSigner,
  InstructionReturn,
  buildDynamicTransactions,
  sendTransaction,
} from '@staratlas/data-source';
import { GALACTIC_MARKETPLACE_IDL } from '@staratlas/galactic-marketplace';
import {
  Game,
  GameState,
  Points,
  RiskZonesData,
  SAGE_IDL,
  Ship,
  StarbaseLevelInfo,
  StarbaseUpkeepInfo,
} from '@staratlas/sage';
import { CRAFTING_IDL } from '@staratlas/crafting';
import { CARGO_IDL, CargoType, CargoStatsDefinition } from '@staratlas/cargo';
import { PLAYER_PROFILE_IDL } from '@staratlas/player-profile';
import { PROFILE_VAULT_IDL } from '@staratlas/profile-vault';
import { PROFILE_FACTION_IDL } from '@staratlas/profile-faction';
import { POINTS_IDL } from '@staratlas/points';
import { POINTS_STORE_IDL } from '@staratlas/points-store';
import { ATLAS_FEE_PAYER_IDL } from '@staratlas/atlas-prime';
import { CLAIM_STAKE_IDL } from '@staratlas/claim-stake';
import { SCORE_IDL } from '@staratlas/score';
import { ENLIST_TO_FACTION_IDL } from '@staratlas/faction-enlistment';

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

  private ships!: Ship[]; // Ship è l'account che contiene i dati delle navi su SAGE

  private cargoTypes!: CargoType[]; // CargoType è l'account che contiene i dati di ogni risorsa rispetto alle stive (es. peso)

  // --- METHODS ---
  private constructor() {
    this.connection = new Connection(process.env.MAIN_RPC_URL, 'confirmed');
    this.priority = 'None';
    this.programs = {} as StarAtlasManagerPrograms;
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

      const [mainData, resourceMints] = await Promise.all([
        getMainData(),
        getResourceMints(),
      ]);

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

      const [game, ships, cargoTypes] = await Promise.all([
        starAtlas.fetchGame(),
        starAtlas.fetchShips(),
        starAtlas.fetchCargoTypes(),
      ]);

      starAtlas.game = game.game;
      starAtlas.cargoStatsDefinition = game.cargoStatsDefinition;
      starAtlas.points = game.game.data.points;
      starAtlas.riskZones = game.game.data.riskZones;

      starAtlas.gameState = game.gameState;
      starAtlas.starbaseLevels = game.gameState.data.fleet.starbaseLevels;
      starAtlas.upkeep = game.gameState.data.fleet.upkeep;

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
        'confirmed',
      );

      const gameState: GameState = await readFromRPCOrError(
        this.provider.connection,
        this.programs.sageProgram,
        game.data.gameState,
        GameState,
        'confirmed',
      );

      const cargoStatsDefinition = await readFromRPCOrError(
        this.provider.connection,
        this.programs.cargoProgram,
        game.data.cargo.statsDefinition,
        CargoStatsDefinition,
        'confirmed',
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
        'confirmed',
      );

      const ships = fetchShips.flatMap((item) =>
        item.type === 'ok' ? [item.data] : [],
      );

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
        'confirmed',
      );

      const cargoTypes = fetchCargoTypes.flatMap((item) =>
        item.type === 'ok' ? [item.data] : [],
      );

      return cargoTypes;
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
    const [cargoType] = this.cargoTypes.filter((item) =>
      item.data.mint.equals(mint),
    );
    return cargoType;
  }

  public async sendDynamicTransaction(
    instructions: InstructionReturn[],
  ): Promise<TransactionSignature> {
    const txs = await buildDynamicTransactions(instructions, this.funder, {
      connection: this.provider.connection,
    });

    if (txs.isErr()) {
      throw txs.error;
    }

    let txSignature: TransactionSignature = '';

    for (const tx of txs.value) {
      const result = await sendTransaction(tx, this.provider.connection, {
        commitment: 'confirmed',
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
  }

  // Instructions
  public ixCreateAssociatedTokenAccountIdempotent(
    owner: PublicKey,
    mint: PublicKey,
  ) {
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
