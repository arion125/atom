import { MainData, MainDataRaw } from '../types/types';
import { parsePublicKey } from './parsePublicKey';

// Funzione per convertire un piano nel tipo corretto
export const parseMainData = (mainData: MainDataRaw): MainData => {
  return {
    game: {
      gameId: parsePublicKey(mainData.game.gameId),
    },
    programs: {
      galacticMarketplaceProgramId: parsePublicKey(
        mainData.programs.galacticMarketplaceProgramId,
      ),
      sageProgramId: parsePublicKey(mainData.programs.sageProgramId),
      craftingProgramId: parsePublicKey(mainData.programs.craftingProgramId),
      cargoProgramId: parsePublicKey(mainData.programs.cargoProgramId),
      playerProfileProgramId: parsePublicKey(
        mainData.programs.playerProfileProgramId,
      ),
      profileVaultProgramId: parsePublicKey(
        mainData.programs.profileVaultProgramId,
      ),
      profileFactionProgramId: parsePublicKey(
        mainData.programs.profileFactionProgramId,
      ),
      pointsProgramId: parsePublicKey(mainData.programs.pointsProgramId),
      pointsStoreProgramId: parsePublicKey(
        mainData.programs.pointsStoreProgramId,
      ),
      atlasPrimeProgramId: parsePublicKey(
        mainData.programs.atlasPrimeProgramId,
      ),
      claimStakesProgramId: parsePublicKey(
        mainData.programs.claimStakesProgramId,
      ),
      scoreProgramId: parsePublicKey(mainData.programs.scoreProgramId),
      factionEnlistmentProgramId: parsePublicKey(
        mainData.programs.factionEnlistmentProgramId,
      ),
    },
    tokens: {
      atlas: parsePublicKey(mainData.tokens.atlas),
      polis: parsePublicKey(mainData.tokens.polis),
    },
  };
};
