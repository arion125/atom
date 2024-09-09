import { PublicKey } from '@solana/web3.js';
import { PlayerProfile, PlayerName } from '@staratlas/player-profile';
import { ProfileFactionAccount } from '@staratlas/profile-faction';
import { readFromRPCOrError, readAllFromRPC } from '@staratlas/data-source';
import { SagePlayerProfile } from '@staratlas/sage';
import { UserPoints } from '@staratlas/points';
import { StarAtlasManager } from './StarAtlasManager';

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

  // --- METHODS ---
  private constructor(
    starAtlasManager: StarAtlasManager,
    playerProfileKey: PublicKey,
  ) {
    this.starAtlasManager = starAtlasManager;
    this.playerProfileKey = playerProfileKey;
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
    ] = await Promise.all([
      playerHandler.fetchPlayerProfile(),
      playerHandler.fetchPlayerProfileName(),
      playerHandler.fetchPlayerProfileFaction(),
      playerHandler.fetchPlayerPoints(),
      playerHandler.fetchPlayerProfileSage(),
    ]);

    playerHandler.playerProfile = playerProfile;
    playerHandler.playerProfileName = playerProfileName;
    playerHandler.playerProfileFaction = playerProfileFaction;
    playerHandler.playerProfilePoints = playerProfilePoints;
    playerHandler.playerProfileSage = playerProfileSage;

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

  // Fetch
  private async fetchPlayerProfile(): Promise<PlayerProfile> {
    try {
      const playerProfile = await readFromRPCOrError(
        this.starAtlasManager.getProvider().connection,
        this.starAtlasManager.getPrograms().playerProfileProgram,
        this.playerProfileKey,
        PlayerProfile,
        'confirmed',
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
        'confirmed',
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
        'confirmed',
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
        'confirmed',
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
        'confirmed',
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
        item.type === 'ok' ? [item.data] : [],
      );

      return userPoints;
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

  /*   getStarbasePlayerAddress(starbase: Starbase) {
    const [starbasePlayer] = StarbasePlayer.findAddress(
      this.sageGame.getSageProgram(),
      starbase.key,
      this.getSagePlayerProfileAddress(),
      starbase.data.seqId,
    );

    return starbasePlayer;
  }

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
  }

  async getStarbasePlayerPodAsync(starbase: Starbase) {
    const starbasePlayerPod = await this.getSageGame().getCargoPodsByAuthority(
      this.getStarbasePlayerAddress(starbase),
    );
    if (starbasePlayerPod.type !== 'Success') return starbasePlayerPod;
    return { type: 'Success' as const, data: starbasePlayerPod.data[0] };
  } */
}
