import { PublicKey } from "@solana/web3.js";
import { PlayerProfile, PlayerName } from "@staratlas/player-profile";
import { ProfileFactionAccount } from "@staratlas/profile-faction";
import { readFromRPCOrError, readAllFromRPC } from "@staratlas/data-source";
import { Fleet, SagePlayerProfile, Starbase, StarbasePlayer } from "@staratlas/sage";
import { UserPoints } from "@staratlas/points";
import { StarAtlasManager } from "./StarAtlasManager";
import { ProfileVault } from "@staratlas/profile-vault";
import { FleetHandler } from "./FleetHandler";

export class PlayerHandler {
  // --- ATTRIBUTES ---
  // Managers
  private starAtlasManager: StarAtlasManager;

  // Keys
  private playerProfileKey: PublicKey;

  // Accounts
  private playerProfile!: PlayerProfile;
  private playerProfileName!: PlayerName;
  private playerProfileFaction!: ProfileFactionAccount;
  private playerProfilePoints!: UserPoints[];
  private playerProfileSage!: SagePlayerProfile;
  private playerVaultAuthority!: ProfileVault;

  private fleets!: FleetHandler[];

  // --- METHODS ---
  private constructor(starAtlasManager: StarAtlasManager, playerProfileKey: PublicKey) {
    this.starAtlasManager = starAtlasManager;
    this.playerProfileKey = playerProfileKey;
    this.fleets = [];
  }

  static async init(
    starAtlasManager: StarAtlasManager,
    playerProfileKey: PublicKey,
  ): Promise<PlayerHandler> {
    const playerHandler = new PlayerHandler(starAtlasManager, playerProfileKey);

    const [
      playerProfile,
      playerProfileName,
      playerProfileFaction,
      playerProfilePoints,
      playerProfileSage,
      playerVaultAuthority,
      fleets,
    ] = await Promise.all([
      playerHandler.fetchPlayerProfile(),
      playerHandler.fetchPlayerProfileName(),
      playerHandler.fetchPlayerProfileFaction(),
      playerHandler.fetchPlayerPoints(),
      playerHandler.fetchPlayerProfileSage(),
      playerHandler.fetchPlayerVaultAuthority(),
      playerHandler.fetchAllFleets(),
    ]);

    playerHandler.playerProfile = playerProfile;
    playerHandler.playerProfileName = playerProfileName;
    playerHandler.playerProfileFaction = playerProfileFaction;
    playerHandler.playerProfilePoints = playerProfilePoints;
    playerHandler.playerProfileSage = playerProfileSage;
    playerHandler.playerVaultAuthority = playerVaultAuthority;

    for (const fleet of fleets) {
      playerHandler.fleets.push(
        await FleetHandler.init(starAtlasManager, playerHandler, fleet),
      );
    }

    return playerHandler;
  }

  // Getters
  getPlayerProfile() {
    return this.playerProfile;
  }

  getPlayerProfileFaction() {
    return this.playerProfileFaction;
  }

  getName() {
    return this.playerProfileName.name;
  }

  getFleets() {
    return this.fleets;
  }

  // Fetch
  private async fetchPlayerProfile(): Promise<PlayerProfile> {
    try {
      const playerProfile = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().playerProfileProgram,
        this.playerProfileKey,
        PlayerProfile,
        "confirmed",
      );

      return playerProfile;
    } catch (e) {
      throw e;
    }
  }

  private async fetchPlayerProfileName(): Promise<PlayerName> {
    try {
      const [playerNameKey] = PlayerName.findAddress(
        this.starAtlasManager.getPrograms().playerProfileProgram,
        this.playerProfileKey,
      );

      const playerName = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().playerProfileProgram,
        playerNameKey,
        PlayerName,
        "confirmed",
      );

      return playerName;
    } catch (e) {
      throw e;
    }
  }

  private async fetchPlayerProfileFaction(): Promise<ProfileFactionAccount> {
    try {
      const [profileFaction] = ProfileFactionAccount.findAddress(
        this.starAtlasManager.getPrograms().profileFactionProgram,
        this.playerProfileKey,
      );

      const playerProfileFaction = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().profileFactionProgram,
        profileFaction,
        ProfileFactionAccount,
        "confirmed",
      );

      return playerProfileFaction;
    } catch (e) {
      throw e;
    }
  }

  private async fetchPlayerProfileSage(): Promise<SagePlayerProfile> {
    try {
      const [sagePlayerProfile] = SagePlayerProfile.findAddress(
        this.starAtlasManager.getPrograms().sageProgram,
        this.playerProfileKey,
        this.starAtlasManager.getGame().key,
      );

      const playerProfileSage = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().sageProgram,
        sagePlayerProfile,
        SagePlayerProfile,
        "confirmed",
      );

      return playerProfileSage;
    } catch (e) {
      throw e;
    }
  }

  private async fetchPlayerPoints(): Promise<UserPoints[]> {
    try {
      const fetchUserPoints = await readAllFromRPC(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().pointsProgram,
        UserPoints,
        "confirmed",
        [
          {
            memcmp: {
              offset: 9,
              bytes: this.playerProfileKey.toBase58(),
            },
          },
        ],
      );

      const userPoints = fetchUserPoints.flatMap((item) =>
        item.type === "ok" ? [item.data] : [],
      );

      return userPoints;
    } catch (e) {
      throw e;
    }
  }

  private async fetchPlayerVaultAuthority() {
    try {
      const [fetchPlayerVaultAuthority] = await readAllFromRPC(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().profileVaultProgram,
        ProfileVault,
        "confirmed",
        [
          {
            memcmp: {
              offset: 9,
              bytes: this.playerProfileKey.toBase58(),
            },
          },
        ],
      );

      const playerVaultAuthority =
        fetchPlayerVaultAuthority.type === "ok" ? fetchPlayerVaultAuthority.data : null;

      if (!playerVaultAuthority) throw new Error("Player vault authority not found");

      return playerVaultAuthority;
    } catch (e) {
      throw e;
    }
  }

  private async fetchAllFleets() {
    try {
      const fetchFleets = await readAllFromRPC(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().sageProgram,
        Fleet,
        "confirmed",
        [
          {
            memcmp: {
              offset: 41,
              bytes: this.playerProfileKey.toBase58(),
            },
          },
        ],
      );

      const fleets = fetchFleets.flatMap((fleet) =>
        fleet.type === "ok" ? [fleet.data] : [],
      );

      if (fleets.length === 0) throw new Error();

      return fleets;
    } catch (e) {
      throw e;
    }
  }

  // Getters
  getMiningXpAccount(): UserPoints {
    return this.playerProfilePoints.filter((account) =>
      account.data.pointCategory.equals(
        this.starAtlasManager.getPoints().miningXpCategory.category,
      ),
    )[0];
  }

  getPilotXpAccount(): UserPoints {
    return this.playerProfilePoints.filter((account) =>
      account.data.pointCategory.equals(
        this.starAtlasManager.getPoints().pilotXpCategory.category,
      ),
    )[0];
  }

  getCouncilRankXpAccount(): UserPoints {
    return this.playerProfilePoints.filter((account) =>
      account.data.pointCategory.equals(
        this.starAtlasManager.getPoints().councilRankXpCategory.category,
      ),
    )[0];
  }

  getCraftingXpAccount(): UserPoints {
    return this.playerProfilePoints.filter((account) =>
      account.data.pointCategory.equals(
        this.starAtlasManager.getPoints().craftingXpCategory.category,
      ),
    )[0];
  }

  getDataRunningXpAccount(): UserPoints {
    return this.playerProfilePoints.filter((account) =>
      account.data.pointCategory.equals(
        this.starAtlasManager.getPoints().dataRunningXpCategory.category,
      ),
    )[0];
  }

  getLpXpAccount(): UserPoints {
    return this.playerProfilePoints.filter((account) =>
      account.data.pointCategory.equals(
        this.starAtlasManager.getPoints().lpCategory.category,
      ),
    )[0];
  }

  // Helpers
  getStarbasePlayerAddress(starbase: Starbase) {
    const [starbasePlayer] = StarbasePlayer.findAddress(
      this.starAtlasManager.getPrograms().sageProgram,
      starbase.key,
      this.playerProfileSage.key,
      starbase.data.seqId,
    );

    return starbasePlayer;
  }

  /* 
  async getStarbasePlayerByStarbaseAsync(starbase: Starbase) {
    try {
      const starbasePlayer = await readFromRPCOrError(
        this.sageGame.getProvider().connection,
        this.sageGame.getSageProgram(),
        this.getStarbasePlayerAddress(starbase),
        StarbasePlayer,
        'confirmed',
      );
      return { type: 'Success' as const, data: starbasePlayer };
    } catch (e) {
      return { type: 'StarbasePlayerNotFound' as const };
    }
  } */

  async getStarbasePlayerPodAsync(starbase: Starbase) {
    const starbasePlayerPod = await this.starAtlasManager.getCargoPodsByAuthority(
      this.getStarbasePlayerAddress(starbase),
    );
    if (starbasePlayerPod.type !== "Success") return starbasePlayerPod;
    return { type: "Success" as const, data: starbasePlayerPod.data[0] };
  }
}
