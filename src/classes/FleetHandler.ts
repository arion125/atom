import { BN } from '@staratlas/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  DepositCargoToFleetInput,
  Fleet,
  FleetShips,
  FleetStateData,
  IdleToLoadingBayInput,
  LoadingBayToIdleInput,
  PlanetType,
  ShipStats,
  StarbaseCreateCargoPodInput,
  StarbasePlayer,
  StartMiningAsteroidInput,
  StartSubwarpInput,
  StopMiningAsteroidInput,
  WarpToCoordinateInput,
  WithdrawCargoFromFleetInput,
} from '@staratlas/sage';
import { CargoPod, CargoType } from '@staratlas/cargo';
import {
  InstructionReturn,
  byteArrayToString,
  readAllFromRPC,
} from '@staratlas/data-source';
import { PlayerHandler } from './PlayerHandler';
import { readFromRPCOrError } from '@staratlas/data-source';
import { StarAtlasManager } from './StarAtlasManager';
import {
  Account,
  getAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  Action,
  CargoPodEnhanced,
  CargoPodType,
  LoadCargo,
  LoadedResources,
  StartMining,
  Trip,
  UnloadCargo,
} from '../../types/types';
import { getTokenAccountsByOwner } from '../../utils/getTokenAccountsByOwner';
import { getTokenAccountBalance } from '../../utils/getTokenAccountBalance';

export class FleetHandler {
  // --- ATTRIBUTES ---
  // Managers
  private starAtlasManager: StarAtlasManager;

  // Keys
  private fleetKey: PublicKey;

  // Accounts
  private fleet!: Fleet;
  private stats!: ShipStats;

  private fleetShips!: FleetShips;

  private owner: PlayerHandler;

  // Data
  private onlyDataRunner!: boolean;
  private onlyMiners!: boolean;

  private state!: FleetStateData;

  private cargoHold!: CargoPodEnhanced;
  private fuelTank!: CargoPodEnhanced;
  private ammoBank!: CargoPodEnhanced;

  // --- METHODS ---
  private constructor(
    starAtlasManager: StarAtlasManager,
    playerHandler: PlayerHandler,
    fleetKey: PublicKey,
  ) {
    this.starAtlasManager = starAtlasManager;
    this.fleetKey = fleetKey;
    this.owner = playerHandler;
  }

  static async init(
    starAtlasManager: StarAtlasManager,
    playerHandler: PlayerHandler,
    fleetKey: PublicKey,
  ): Promise<FleetHandler> {
    const fleetHandler = new FleetHandler(
      starAtlasManager,
      playerHandler,
      fleetKey,
    );
    await fleetHandler.update();

    return fleetHandler;
  }

  // Getters
  getName() {
    return byteArrayToString(this.fleet.data.fleetLabel);
  }

  // Fetch
  private async fetchFleet(): Promise<Fleet> {
    try {
      const fleet = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().sageProgram,
        this.fleetKey,
        Fleet,
        'confirmed',
      );

      return fleet;
    } catch (e) {
      throw e;
    }
  }

  private async fetchFleetShips(): Promise<FleetShips> {
    try {
      const [fleetShipsKey] = FleetShips.findAddress(
        this.starAtlasManager.getPrograms().sageProgram,
        this.fleetKey,
      );

      const fleetShips = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().sageProgram,
        fleetShipsKey,
        FleetShips,
        'confirmed',
      );

      return fleetShips;
    } catch (e) {
      throw e;
    }
  }

  // !! this function throws an error
  /* getCurrentSector(): SectorRoute {
    let coordinates;
    let starbase;

    if (this.fleet.state.MoveWarp) {
      coordinates = this.fleet.state.MoveWarp.toSector as SectorCoordinates;
      starbase = this.getSageGame().getStarbaseByCoords(coordinates);
      return {
        key: this.getSageGame().getSectorKeyByCoords(coordinates),
        coordinates,
        hasStarbase: starbase.type === 'Success',
      };
    }

    if (this.fleet.state.MoveSubwarp) {
      coordinates = this.fleet.state.MoveSubwarp.toSector as SectorCoordinates;
      starbase = this.getSageGame().getStarbaseByCoords(coordinates);
      return {
        key: this.getSageGame().getSectorKeyByCoords(coordinates),
        coordinates,
        hasStarbase: starbase.type === 'Success',
      };
    }

    if (this.fleet.state.StarbaseLoadingBay) {
      const starbase = this.getSageGame().getStarbaseByKey(
        this.fleet.state.StarbaseLoadingBay.starbase,
      );
      if (starbase.type !== 'Success') {
        throw new Error('Starbase loading failed');
      }
      coordinates = starbase.data.data.sector as SectorCoordinates;
      return {
        key: this.getSageGame().getSectorKeyByCoords(coordinates),
        coordinates,
        hasStarbase: true,
      };
    }

    if (this.fleet.state.Idle) {
      coordinates = this.fleet.state.Idle.sector as SectorCoordinates;
      starbase = this.getSageGame().getStarbaseByCoords(coordinates);
      return {
        key: this.getSageGame().getSectorKeyByCoords(coordinates),
        coordinates,
        hasStarbase: starbase.type === 'Success',
      };
    }

    if (this.fleet.state.Respawn) {
      coordinates = this.fleet.state.Respawn.sector as SectorCoordinates;
      starbase = this.getSageGame().getStarbaseByCoords(coordinates);
      return {
        key: this.getSageGame().getSectorKeyByCoords(coordinates),
        coordinates,
        hasStarbase: starbase.type === 'Success',
      };
    }

    if (this.fleet.state.MineAsteroid) {
      const planet = this.getSageGame().getPlanetByKey(
        this.fleet.state.MineAsteroid.asteroid,
      );
      if (planet.type !== 'Success') {
        throw new Error('Planet loading failed');
      }
      coordinates = planet.data.data.sector as SectorCoordinates;
      starbase = this.getSageGame().getStarbaseByCoords(coordinates);
      return {
        key: this.getSageGame().getSectorKeyByCoords(coordinates),
        coordinates,
        hasStarbase: starbase.type === 'Success',
      };
    }

    throw new Error('Invalid fleet state');
  } */

  // OK
  private async getCurrentCargoDataByType(
    type: CargoPodType,
  ): Promise<CargoPodEnhanced> {
    try {
      const cargoPodKey =
        type === 'CargoHold'
          ? this.fleet.data.cargoHold
          : type === 'FuelTank'
            ? this.fleet.data.fuelTank
            : type === 'AmmoBank'
              ? this.fleet.data.ammoBank
              : (null as never);

      const cargoPodMaxCapacity: BN =
        type === 'CargoHold'
          ? new BN(this.stats.cargoStats.cargoCapacity)
          : type === 'FuelTank'
            ? new BN(this.stats.cargoStats.fuelCapacity)
            : type === 'AmmoBank'
              ? new BN(this.stats.cargoStats.ammoCapacity)
              : new BN(0);

      //if (!cargoPodType || cargoPodMaxCapacity.eq(new BN(0)))
      //  return { type: 'CargoPodTypeError' as const };

      const cargoPod = await this.getCargoPodByKey(cargoPodKey);
      //if (cargoPod.type !== 'Success') return cargoPod;

      const cargoPodTokenAccounts = await getTokenAccountsByOwner(
        this.starAtlasManager.getProvider().connection,
        cargoPod.key,
      );

      if (cargoPodTokenAccounts.length === 0) {
        const cargoPodEnhanced: CargoPodEnhanced = {
          key: cargoPod.key,
          loadedAmount: new BN(0),
          resources: [],
          maxCapacity: cargoPodMaxCapacity,
          fullLoad: false,
        };
        return cargoPodEnhanced;
      }

      const resources: LoadedResources[] = [];

      for (const tokenAccount of cargoPodTokenAccounts) {
        const [cargoTypeKey] = CargoType.findAddress(
          this.starAtlasManager.getPrograms().cargoProgram,
          this.starAtlasManager.getCargoStatsDefinition().key,
          tokenAccount.mint,
          this.starAtlasManager.getCargoStatsDefinition().data.seqId,
        );
        const [cargoType] = this.starAtlasManager
          .getCargoTypes()
          .filter((item) => item.key.equals(cargoTypeKey));

        const resourceSpaceInCargoPerUnit = cargoType.stats[0] as BN;

        resources.push({
          mint: tokenAccount.mint,
          amount: new BN(tokenAccount.amount),
          spaceInCargo: new BN(tokenAccount.amount).mul(
            resourceSpaceInCargoPerUnit,
          ),
          cargoTypeKey: cargoType.key,
          tokenAccountKey: tokenAccount.address,
        });
      }

      let loadedAmount = new BN(0);
      resources.forEach((item) => {
        loadedAmount = loadedAmount.add(item.spaceInCargo);
      });

      const cargoPodEnhanced: CargoPodEnhanced = {
        key: cargoPod.key,
        loadedAmount,
        resources,
        maxCapacity: cargoPodMaxCapacity,
        fullLoad: loadedAmount.eq(cargoPodMaxCapacity),
      };

      return cargoPodEnhanced;
    } catch (e) {
      throw e;
    }
  }

  // OK
  private async getCargoPodByKey(cargoPodKey: PublicKey): Promise<CargoPod> {
    try {
      const cargoPod = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().cargoProgram,
        cargoPodKey,
        CargoPod,
        'confirmed',
      );
      return cargoPod;
    } catch (e) {
      throw e;
    }
  }

  // OK
  private async update() {
    try {
      const [fleet, fleetShips] = await Promise.all([
        await this.fetchFleet(),
        await this.fetchFleetShips(),
      ]);

      this.fleet = fleet;
      this.stats = fleet.data.stats;

      this.fleetShips = fleetShips;

      this.onlyDataRunner = this.stats.miscStats.scanCost === 0;
      this.onlyMiners = this.stats.cargoStats.ammoConsumptionRate === 0;

      this.state = fleet.state;

      const [fuelTank, ammoBank, cargoHold] = await Promise.all([
        await this.getCurrentCargoDataByType('FuelTank'),
        await this.getCurrentCargoDataByType('AmmoBank'),
        await this.getCurrentCargoDataByType('CargoHold'),
      ]);

      this.fuelTank = fuelTank;
      this.ammoBank = ammoBank;
      this.cargoHold = cargoHold;
    } catch (e) {
      throw e;
    }
  }

  async ixLoadCargo(action: LoadCargo) {
    await this.update();

    /* if (!this.state.StarbaseLoadingBay)
      return { type: 'FleetNotDockedToStarbase' as const }; */

    const ixs: InstructionReturn[] = [];
    const mint = action.resource;

    const cargoStatsDefinition =
      this.starAtlasManager.getCargoStatsDefinition();

    const cargoType = this.starAtlasManager.getCargoTypeByMint(mint); // NO IN JSON

    const resourceSpaceInCargoPerUnit = cargoType.stats[0] as BN;

    /* const fleetCurrentSector = this.getCurrentSector();
    if (!fleetCurrentSector)
      return { type: 'FleetCurrentSectorError' as const };

    const currentStarbase = this.getSageGame().getStarbaseByCoords(
      fleetCurrentSector.coordinates,
    );
    if (currentStarbase.type !== 'Success') return currentStarbase; */

    const starbase = action.starbase;

    const starbasePlayer = action.starbasePlayer.key;

    const starbasePlayerPod = action.starbasePlayer.starbasePlayerCargoPod;

    const starbasePodMintAta =
      action.starbasePlayer.starbasePlayerCargoPodMintAta;

    const starbasePodMintAtaBalance = await getTokenAccountBalance(
      this.starAtlasManager.getProvider().connection,
      starbasePodMintAta,
    );

    if (starbasePodMintAtaBalance === 0)
      throw new Error('No resource in starbase');

    const cargoHold = this.cargoHold;

    const ixFleetCargoHoldMintAta =
      this.starAtlasManager.ixCreateAssociatedTokenAccountIdempotent(
        cargoHold.key,
        mint,
      );
    try {
      await getAccount(
        this.starAtlasManager.getProvider().connection,
        ixFleetCargoHoldMintAta.address,
      );
    } catch (e) {
      ixs.push(ixFleetCargoHoldMintAta.instruction);
    }

    // Calc the amount to deposit
    const amount = new BN(action.amount);
    let amountToDeposit = BN.min(
      amount.mul(resourceSpaceInCargoPerUnit),
      cargoHold.maxCapacity.sub(cargoHold.loadedAmount),
    );
    amountToDeposit = amountToDeposit.div(resourceSpaceInCargoPerUnit);

    /* if (amountToDeposit.eq(new BN(0)))
      return { type: 'FleetCargoPodIsFull' as const }; */

    amountToDeposit = BN.min(
      amountToDeposit,
      new BN(starbasePodMintAtaBalance),
    );

    /* if (amountToDeposit.eq(new BN(0)))
      return { type: 'StarbaseCargoIsEmpty' as const }; */

    const input: DepositCargoToFleetInput = {
      keyIndex: 0,
      amount: amountToDeposit,
    };

    const ix_1 = Fleet.depositCargoToFleet(
      this.starAtlasManager.getPrograms().sageProgram,
      this.starAtlasManager.getPrograms().cargoProgram,
      this.starAtlasManager.getAsyncSigner(),
      this.owner.getPlayerProfile().key,
      this.owner.getPlayerProfileFaction().key,
      'funder',
      starbase,
      starbasePlayer,
      this.fleetKey,
      starbasePlayerPod,
      cargoHold.key,
      cargoType.key,
      cargoStatsDefinition.key,
      starbasePodMintAta,
      ixFleetCargoHoldMintAta.address,
      mint,
      this.starAtlasManager.getGame().key,
      this.starAtlasManager.getGameState().key,
      input,
    );

    ixs.push(ix_1);
    return ixs;
  }
  /* 
  async ixUnloadCargo(action: UnloadCargo) {
    const update = await this.update();
    if (update.type !== 'Success')
      return { type: 'FleetFailedToUpdate' as const };

    if (!this.state.StarbaseLoadingBay)
      return { type: 'FleetNotDockedToStarbase' as const };

    const ixs: InstructionReturn[] = [];
    const mint = this.getSageGame().getResourceMintByName(resourceName);

    const fleetCurrentSector = this.getCurrentSector();
    if (!fleetCurrentSector)
      return { type: 'FleetCurrentSectorError' as const };

    const currentStarbase = this.getSageGame().getStarbaseByCoords(
      fleetCurrentSector.coordinates,
    );
    if (currentStarbase.type !== 'Success') return currentStarbase;

    const starbasePlayerPod = await this.player.getStarbasePlayerPodAsync(
      currentStarbase.data,
    );
    if (starbasePlayerPod.type !== 'Success') return starbasePlayerPod;
    // console.log(starbasePlayerPod)

    const ixStarbasePodMintAta =
      this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(
        starbasePlayerPod.data.key,
        mint,
      );
    try {
      await getAccount(
        this.getSageGame().getProvider().connection,
        ixStarbasePodMintAta.address,
      );
    } catch (e) {
      ixs.push(ixStarbasePodMintAta.instruction);
    }

    const cargoPod = await this.getCurrentCargoDataByType(cargoPodType);
    if (cargoPod.type !== 'Success') return cargoPod;
    // console.log(cargoHold)

    const [fleetCargoPodResourceData] = cargoPod.data.resources.filter((item) =>
      item.mint.equals(mint),
    );
    if (!fleetCargoPodResourceData)
      return { type: 'NoResourcesToWithdraw' as const };
    // console.log(mintAta)

    // Calc the amount to withdraw
    let amountToWithdraw = BN.min(
      amount,
      new BN(fleetCargoPodResourceData.amount),
    );
    if (amountToWithdraw.eq(new BN(0)))
      return { type: 'NoResourcesToWithdraw' as const };

    // console.log(amountToWithdraw.toNumber())

    const input: WithdrawCargoFromFleetInput = {
      keyIndex: 0,
      amount: amountToWithdraw,
    };

    const ix_1 = Fleet.withdrawCargoFromFleet(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getCargoProgram(),
      this.getSageGame().getAsyncSigner(),
      'funder',
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      currentStarbase.data.key,
      this.player.getStarbasePlayerAddress(currentStarbase.data),
      this.fleet.key,
      cargoPod.data.key,
      starbasePlayerPod.data.key,
      this.getSageGame().getCargoTypeKeyByMint(mint),
      this.getSageGame().getCargoStatsDefinition().key,
      fleetCargoPodResourceData.tokenAccountKey,
      ixStarbasePodMintAta.address,
      mint,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      input,
    );

    ixs.push(ix_1);
    return { type: 'Success' as const, ixs, amountToWithdraw };
  }
  */
  /* async ixStartMining(action: StartMining) {
    const update = await this.update();

    if (this.state.MineAsteroid) return { type: 'FleetIsMining' as const };
    if (this.state.StarbaseLoadingBay)
      return { type: 'FleetIsDocked' as const };

    const ixs: InstructionReturn[] = [];

    const fleetCurrentSector = this.getCurrentSector();
    if (!fleetCurrentSector)
      return { type: 'FleetCurrentSectorError' as const };

    const currentStarbase = this.getSageGame().getStarbaseByCoords(
      fleetCurrentSector.coordinates,
    );
    if (currentStarbase.type !== 'Success') return currentStarbase;

    const starbase = action.starbase; // ADD TO JSON

    const starbasePlayer = action.starbasePlayer.key; // ADD TO JSON

    if (starbasePlayer.type !== 'Success') {
      const ix_0 = StarbasePlayer.registerStarbasePlayer(
        this.getSageGame().getSageProgram(),
        this.player.getProfileFactionAddress(),
        this.player.getSagePlayerProfileAddress(),
        currentStarbase.data.key,
        this.getSageGame().getGame().key,
        this.getSageGame().getGameState().key,
        currentStarbase.data.data.seqId,
      );
      ixs.push(ix_0);
    }

    const planet = action.asteroid; // ADD TO JSON

    const resource = action.resource;
    const mineItem = action.mineItem;

    const fuelTank = this.fuelTank;

    const [fuelInTankData] = fuelTank.resources.filter((item) =>
      item.mint.equals(this.getSageGame().getResourcesMint().Fuel),
    );
    if (!fuelInTankData)
      return { type: 'FleetCargoPodTokenAccountNotFound' as const };

    const input: StartMiningAsteroidInput = { keyIndex: 0 };

    // Movement Handler
    const ix_movement = await this.ixMovementHandler();
    if (ix_movement.type !== 'Success') return ix_movement;
    if (ix_movement.ixs.length > 0) ixs.push(...ix_movement.ixs);

    const ix_1 = Fleet.startMiningAsteroid(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      this.fleet.key,
      currentStarbase.data.key,
      starbasePlayerKey,
      mineableResource.mineItem.key,
      mineableResource.resource.key,
      currentPlanet.data[0].key,
      this.getSageGame().getGameState().key,
      this.getSageGame().getGame().key,
      fuelInTankData.tokenAccountKey,
      input,
    );
    ixs.push(ix_1);

    return { type: 'Success' as const, ixs };
  }*/
  /*
  async ixStopMining() {
    const update = await this.update();
    if (update.type !== 'Success')
      return { type: 'FleetFailedToUpdate' as const };

    if (!this.fleet.state.MineAsteroid)
      return { type: 'FleetIsNotMiningAsteroid' as const };

    const ixs: InstructionReturn[] = [];

    const fleetCurrentSector = this.getCurrentSector();
    if (!fleetCurrentSector)
      return { type: 'FleetCurrentSectorError' as const };

    const currentStarbase = this.getSageGame().getStarbaseByCoords(
      fleetCurrentSector.coordinates,
    );
    if (currentStarbase.type !== 'Success') return currentStarbase;

    const planetKey = this.fleet.state.MineAsteroid.asteroid;
    const miningResourceKey = this.fleet.state.MineAsteroid.resource;

    const miningResource =
      this.getSageGame().getResourceByKey(miningResourceKey);
    if (miningResource.type !== 'Success') return miningResource;

    const miningMineItem = this.getSageGame().getMineItemByKey(
      miningResource.data.data.mineItem,
    );
    if (miningMineItem.type !== 'Success') return miningMineItem;

    const miningMint = miningMineItem.data.data.mint;
    const foodMint = this.getSageGame().getResourcesMint().Food;
    const ammoMint = this.getSageGame().getResourcesMint().Ammo;
    const fuelMint = this.getSageGame().getResourcesMint().Fuel;

    const cargoHold = this.getCargoHold();

    const ixFleetCargoHoldMintAta =
      this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(
        cargoHold.key,
        miningMint,
      );
    try {
      await getAccount(
        this.getSageGame().getProvider().connection,
        ixFleetCargoHoldMintAta.address,
      );
    } catch (e) {
      ixs.push(ixFleetCargoHoldMintAta.instruction);
    }

    const ixFleetCargoHoldFoodAta =
      this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(
        cargoHold.key,
        foodMint,
      );
    try {
      await getAccount(
        this.getSageGame().getProvider().connection,
        ixFleetCargoHoldFoodAta.address,
      );
    } catch (e) {
      ixs.push(ixFleetCargoHoldFoodAta.instruction);
    }

    const ammoBank = this.getAmmoBank();

    const ixFleetAmmoBankAmmoAta =
      this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(
        ammoBank.key,
        ammoMint,
      );
    try {
      await getAccount(
        this.getSageGame().getProvider().connection,
        ixFleetAmmoBankAmmoAta.address,
      );
    } catch (e) {
      if (!this.onlyMiners) {
        ixs.push(ixFleetAmmoBankAmmoAta.instruction);
      }
    }

    const fuelTank = this.getFuelTank();

    const ixFleetFuelTankFuelAta =
      this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(
        fuelTank.key,
        fuelMint,
      );
    try {
      await getAccount(
        this.getSageGame().getProvider().connection,
        ixFleetFuelTankFuelAta.address,
      );
    } catch (e) {
      ixs.push(ixFleetFuelTankFuelAta.instruction);
    }

    const miningResourceFrom = getAssociatedTokenAddressSync(
      miningMint,
      miningMineItem.data.key,
      true,
    );

    const ix_0 = Fleet.asteroidMiningHandler(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getCargoProgram(),
      this.fleet.key,
      currentStarbase.data.key,
      miningMineItem.data.key,
      miningResource.data.key,
      planetKey,
      this.fleet.data.cargoHold,
      this.fleet.data.ammoBank,
      this.getSageGame().getCargoTypeByResourceName(ResourceName.Food),
      this.getSageGame().getCargoTypeByResourceName(ResourceName.Ammo),
      this.getSageGame().getCargoTypeKeyByMint(miningMineItem.data.data.mint),
      this.getSageGame().getCargoStatsDefinition().key,
      this.getSageGame().getGameState().key,
      this.getSageGame().getGame().key,
      ixFleetCargoHoldFoodAta.address,
      ixFleetAmmoBankAmmoAta.address,
      miningResourceFrom,
      ixFleetCargoHoldMintAta.address,
      this.getSageGame().getResourcesMint().Food,
      this.getSageGame().getResourcesMint().Ammo,
    );
    ixs.push(ix_0);

    const input: StopMiningAsteroidInput = { keyIndex: 0 };

    const ix_1 = Fleet.stopMiningAsteroid(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getCargoProgram(),
      this.getSageGame().getPointsProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      this.fleet.key,
      miningMineItem.data.key,
      miningResource.data.key,
      planetKey,
      this.fleet.data.fuelTank,
      this.getSageGame().getCargoTypeByResourceName(ResourceName.Fuel),
      this.getSageGame().getCargoStatsDefinition().key,
      this.player.getMiningXpKey(),
      this.getSageGame().getGamePoints().miningXpCategory.category,
      this.getSageGame().getGamePoints().miningXpCategory.modifier,
      this.player.getPilotXpKey(),
      this.getSageGame().getGamePoints().pilotXpCategory.category,
      this.getSageGame().getGamePoints().pilotXpCategory.modifier,
      this.player.getCouncilRankXpKey(),
      this.getSageGame().getGamePoints().councilRankXpCategory.category,
      this.getSageGame().getGamePoints().councilRankXpCategory.modifier,
      this.getSageGame().getGameState().key,
      this.getSageGame().getGame().key,
      ixFleetFuelTankFuelAta.address,
      this.getSageGame().getResourcesMint().Fuel,
      input,
    );
    ixs.push(ix_1);

    return { type: 'Success' as const, ixs };
  }

  async ixDockToStarbase() {
    const update = await this.update();
    if (update.type !== 'Success')
      return { type: 'FleetFailedToUpdate' as const };

    if (this.state.StarbaseLoadingBay)
      return { type: 'FleetIsDocked' as const };
    if (this.state.MineAsteroid) return { type: 'FleetIsMining' as const };

    const ixs: InstructionReturn[] = [];

    const fleetCurrentSector = this.getCurrentSector();
    if (!fleetCurrentSector)
      return { type: 'FleetCurrentSectorError' as const };

    const currentStarbase = this.getSageGame().getStarbaseByCoords(
      fleetCurrentSector.coordinates,
    );
    if (currentStarbase.type !== 'Success') return currentStarbase;

    const starbasePlayerKey = this.player.getStarbasePlayerAddress(
      currentStarbase.data,
    );
    const starbasePlayer = await this.player.getStarbasePlayerByStarbaseAsync(
      currentStarbase.data,
    );
    //console.log(starbasePlayer.data?.key.toBase58())

    const starbasePlayerPod = await this.player.getStarbasePlayerPodAsync(
      currentStarbase.data,
    );
    //console.log(starbasePlayerPod.data?.key.toBase58())

    if (starbasePlayer.type !== 'Success') {
      const ix_0 = StarbasePlayer.registerStarbasePlayer(
        this.getSageGame().getSageProgram(),
        this.player.getProfileFactionAddress(),
        this.player.getSagePlayerProfileAddress(),
        currentStarbase.data.key,
        this.getSageGame().getGame().key,
        this.getSageGame().getGameState().key,
        currentStarbase.data.data.seqId,
      );
      ixs.push(ix_0);
    }

    if (starbasePlayerPod.type !== 'Success') {
      const podSeedBuffer = Keypair.generate().publicKey.toBuffer();
      const podSeeds = Array.from(podSeedBuffer);

      const cargoInput: StarbaseCreateCargoPodInput = {
        keyIndex: 0,
        podSeeds,
      };

      const ix_1 = StarbasePlayer.createCargoPod(
        this.getSageGame().getSageProgram(),
        this.getSageGame().getCargoProgram(),
        starbasePlayerKey,
        this.getSageGame().getAsyncSigner(),
        this.player.getPlayerProfile().key,
        this.player.getProfileFactionAddress(),
        currentStarbase.data.key,
        this.getSageGame().getCargoStatsDefinition().key,
        this.getSageGame().getGame().key,
        this.getSageGame().getGameState().key,
        cargoInput,
      );
      ixs.push(ix_1);
    }

    const input: IdleToLoadingBayInput = 0;

    // Movement Handler
    const ix_movement = await this.ixMovementHandler();
    if (ix_movement.type !== 'Success') return ix_movement;
    if (ix_movement.ixs.length > 0) ixs.push(...ix_movement.ixs);

    const ix_2 = Fleet.idleToLoadingBay(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      this.fleet.key,
      currentStarbase.data.key,
      starbasePlayerKey,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      input,
    );
    ixs.push(ix_2);

    return { type: 'Success' as const, ixs };
  }

  async ixUndockFromStarbase() {
    const update = await this.update();
    if (update.type !== 'Success')
      return { type: 'FleetFailedToUpdate' as const };

    if (this.state.Idle) return { type: 'FleetIsIdle' as const };
    if (this.state.MineAsteroid) return { type: 'FleetIsMining' as const };
    if (this.state.MoveWarp || this.state.MoveSubwarp)
      return { type: 'FleetIsMoving' as const };

    const ixs: InstructionReturn[] = [];

    const fleetCurrentSector = await this.getCurrentSector();
    if (!fleetCurrentSector)
      return { type: 'FleetCurrentSectorError' as const };

    const currentStarbase = this.getSageGame().getStarbaseByCoords(
      fleetCurrentSector.coordinates,
    );
    if (currentStarbase.type !== 'Success') return currentStarbase;

    const starbasePlayerKey = this.player.getStarbasePlayerAddress(
      currentStarbase.data,
    );

    const input: LoadingBayToIdleInput = 0;

    const ix_1 = Fleet.loadingBayToIdle(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      this.fleet.key,
      currentStarbase.data.key,
      starbasePlayerKey,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      input,
    );
    ixs.push(ix_1);

    return { type: 'Success' as const, ixs };
  }

  async ixWarpToSector(action: Trip) {
    const update = await this.update();
    if (update.type !== 'Success')
      return { type: 'FleetFailedToUpdate' as const };

    if (this.state.MineAsteroid) return { type: 'FleetIsMining' as const };
    if (this.state.StarbaseLoadingBay)
      return { type: 'FleetIsDocked' as const };

    const ixs: InstructionReturn[] = [];

    const fuelMint = this.getSageGame().getResourceMintByName(
      ResourceName.Fuel,
    );

    const fuelTank = this.getFuelTank();

    const [fuelInTankData] = fuelTank.resources.filter((item) =>
      item.mint.equals(fuelMint),
    );
    if (!fuelInTankData) return { type: 'FleetFuelTankIsEmpty' as const };

    if (fuelInTankData.amount.lt(fuelNeeded))
      return { type: 'NoEnoughFuelToWarp' as const };

    const input: WarpToCoordinateInput = {
      keyIndex: 0,
      toSector: sector.coordinates as [BN, BN],
    };

    // Movement Handler
    const ix_movement = await this.ixMovementHandler();
    if (ix_movement.type !== 'Success') return ix_movement;
    if (ix_movement.ixs.length > 0) ixs.push(...ix_movement.ixs);

    const ix_0 = Fleet.warpToCoordinate(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      this.fleet.key,
      fuelTank.key,
      this.getSageGame().getCargoTypeKeyByMint(fuelMint),
      this.getSageGame().getCargoStatsDefinition().key,
      fuelInTankData.tokenAccountKey,
      fuelMint,
      this.getSageGame().getGameState().key,
      this.getSageGame().getGame().key,
      this.getSageGame().getCargoProgram(),
      input,
    );

    ixs.push(ix_0);

    return { type: 'Success' as const, ixs };
  }

  async ixSubwarpToSector(action: Trip) {
    const update = await this.update();
    if (update.type !== 'Success')
      return { type: 'FleetFailedToUpdate' as const };

    if (this.state.MineAsteroid) return { type: 'FleetIsMining' as const };
    if (this.state.StarbaseLoadingBay)
      return { type: 'FleetIsDocked' as const };

    const ixs: InstructionReturn[] = [];

    const fuelMint = this.getSageGame().getResourceMintByName(
      ResourceName.Fuel,
    );

    const fuelTank = this.getFuelTank();

    if (fuelNeeded.gt(new BN(0))) {
      // Temporary for Subwarp bug
      const [fuelInTankData] = fuelTank.resources.filter((item) =>
        item.mint.equals(fuelMint),
      );
      if (!fuelInTankData) return { type: 'FleetFuelTankIsEmpty' as const };

      if (fuelInTankData.amount.lt(fuelNeeded))
        return { type: 'NoEnoughFuelToSubwarp' as const };
    }

    const input = {
      keyIndex: 0,
      toSector: sector.coordinates as [BN, BN],
    } as StartSubwarpInput;

    // Movement Handler
    const ix_movement = await this.ixMovementHandler();
    if (ix_movement.type !== 'Success') return ix_movement;
    if (ix_movement.ixs.length > 0) ixs.push(...ix_movement.ixs);

    const ix_0 = Fleet.startSubwarp(
      this.getSageGame().getSageProgram(),
      this.getSageGame().getAsyncSigner(),
      this.player.getPlayerProfile().key,
      this.player.getProfileFactionAddress(),
      this.fleet.key,
      this.getSageGame().getGame().key,
      this.getSageGame().getGameState().key,
      input,
    );

    ixs.push(ix_0);

    return { type: 'Success' as const, ixs };
  }

  async ixMovementHandler() {
    // Warp and Subwarp Handler
    const update = await this.update();
    if (update.type !== 'Success')
      return { type: 'FleetFailedToUpdate' as const };

    const ixs: InstructionReturn[] = [];

    const fuelMint = this.getSageGame().getResourceMintByName(
      ResourceName.Fuel,
    );

    const fuelTank = this.getFuelTank();

    // const [fuelInTankData] = fuelTank.resources.filter((item) => item.mint.equals(fuelMint));
    // if (!fuelInTankData || fuelInTankData.amount.eq(new BN(0))) return { type: "FleetFuelTankIsEmpty" as const }; // Temporary disabled for Subwarp Bug
    const ixFleetFuelTankMintAta =
      this.getSageGame().ixCreateAssociatedTokenAccountIdempotent(
        fuelTank.key,
        fuelMint,
      );
    try {
      await getAccount(
        this.getSageGame().getProvider().connection,
        ixFleetFuelTankMintAta.address,
      );
    } catch (e) {
      ixs.push(ixFleetFuelTankMintAta.instruction);
    }

    const currentTimestamp: BN = new BN(
      await this.getSageGame().getCurrentTimestampOnChain(),
    );

    const ix_movement =
      this.fleet.state.MoveWarp &&
      (!this.fleet.state.MoveWarp.warpFinish ||
        this.fleet.state.MoveWarp.warpFinish.lt(currentTimestamp))
        ? [
            Fleet.moveWarpHandler(
              this.getSageGame().getSageProgram(),
              this.getSageGame().getPointsProgram(),
              this.getPlayer().getPlayerProfile().key,
              this.key,
              this.player.getPilotXpKey(),
              this.getSageGame().getGamePoints().pilotXpCategory.category,
              this.getSageGame().getGamePoints().pilotXpCategory.modifier,
              this.player.getCouncilRankXpKey(),
              this.getSageGame().getGamePoints().councilRankXpCategory.category,
              this.getSageGame().getGamePoints().councilRankXpCategory.modifier,
              this.getSageGame().getGame().key,
            ),
          ]
        : this.fleet.state.MoveSubwarp &&
            (!this.fleet.state.MoveSubwarp.arrivalTime ||
              this.fleet.state.MoveSubwarp.arrivalTime.lt(currentTimestamp))
          ? [
              Fleet.movementSubwarpHandler(
                this.getSageGame().getSageProgram(),
                this.getSageGame().getCargoProgram(),
                this.getSageGame().getPointsProgram(),
                this.getPlayer().getPlayerProfile().key,
                this.key,
                fuelTank.key,
                this.getSageGame().getCargoTypeKeyByMint(fuelMint),
                this.getSageGame().getCargoStatsDefinition().key,
                // fuelInTankData.tokenAccountKey,
                ixFleetFuelTankMintAta.address,
                fuelMint,
                this.player.getPilotXpKey(),
                this.getSageGame().getGamePoints().pilotXpCategory.category,
                this.getSageGame().getGamePoints().pilotXpCategory.modifier,
                this.player.getCouncilRankXpKey(),
                this.getSageGame().getGamePoints().councilRankXpCategory
                  .category,
                this.getSageGame().getGamePoints().councilRankXpCategory
                  .modifier,
                this.getSageGame().getGame().key,
              ),
            ]
          : [];

    ixs.push(...ix_movement);

    return { type: 'Success' as const, ixs };
  }
   */
}
