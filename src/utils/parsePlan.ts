import { Action, ActionRaw, Plan, PlanRaw } from "../types/types";
import { BN } from "@staratlas/anchor";
import { parsePublicKey } from "./parsePublicKey";

// Funzione per convertire ogni azione nel suo tipo corretto
const parseAction = (action: ActionRaw): Action => {
  switch (action.ix) {
    case "loadCargo":
    case "refuel":
    case "reammo":
    case "refood":
      return {
        ...action,
        sector: {
          ...action.sector,
          key: parsePublicKey(action.sector.key),
          coordinates: action.sector.coordinates.map((coord: string) => new BN(coord)),
        },
        resource: parsePublicKey(action.resource),
        starbase: parsePublicKey(action.starbase),
        cargoType: {
          ...action.cargoType,
          key: parsePublicKey(action.cargoType.key),
        },
        starbasePlayer: {
          ...action.starbasePlayer,
          key: parsePublicKey(action.starbasePlayer.key),
          starbasePlayerCargoPod: parsePublicKey(
            action.starbasePlayer.starbasePlayerCargoPod,
          ),
          starbasePlayerCargoPodMintAta: parsePublicKey(
            action.starbasePlayer.starbasePlayerCargoPodMintAta,
          ),
        },
      };
    case "unloadCargo":
      return {
        ...action,
        sector: {
          ...action.sector,
          key: parsePublicKey(action.sector.key),
          coordinates: action.sector.coordinates.map((coord: string) => new BN(coord)),
        },
        resource: parsePublicKey(action.resource),
        starbase: parsePublicKey(action.starbase),
        cargoType: {
          ...action.cargoType,
          key: parsePublicKey(action.cargoType.key),
        },
        starbasePlayer: {
          ...action.starbasePlayer,
          key: parsePublicKey(action.starbasePlayer.key),
          starbasePlayerCargoPod: parsePublicKey(
            action.starbasePlayer.starbasePlayerCargoPod,
          ),
          starbasePlayerCargoPodMintAta: parsePublicKey(
            action.starbasePlayer.starbasePlayerCargoPodMintAta,
          ),
        },
      };
    case "startMining":
      return {
        ...action,
        sector: {
          ...action.sector,
          key: parsePublicKey(action.sector.key),
          coordinates: action.sector.coordinates.map((coord: string) => new BN(coord)),
        },
        resource: parsePublicKey(action.resource),
        mineItem: parsePublicKey(action.mineItem),
      };
    case "trip":
      return {
        ...action,
        sector: {
          ...action.sector,
          key: parsePublicKey(action.sector.key),
          coordinates: action.sector.coordinates.map((coord: string) => new BN(coord)),
        },
        destinationSector: parsePublicKey(action.destinationSector),
      };
  }
};

// Funzione per convertire un piano nel tipo corretto
export const parsePlan = (plan: PlanRaw): Plan => {
  return {
    ...plan,
    fleet: parsePublicKey(plan.fleet),
    pubkey: parsePublicKey(plan.pubkey),
    profile: parsePublicKey(plan.profile),
    route: {
      ...plan.route,
      startSector: parsePublicKey(plan.route.startSector),
      endSector: parsePublicKey(plan.route.endSector),
      actions: plan.route.actions.map(parseAction),
    },
  };
};
