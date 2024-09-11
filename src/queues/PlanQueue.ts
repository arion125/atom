// src/PlanQueue.ts

import { Action, Route } from "../types/types";
import { StarAtlasManager } from "../core/StarAtlasManager";
import { PlayerHandler } from "../core/PlayerHandler";
import { FleetHandler } from "../core/FleetHandler";
import { createLog } from "../apis/createLog";
import { resourceNames } from "../common/constants";

export class PlanQueue {
  private starAtlasManager: StarAtlasManager;
  private planId: number;
  private planName: string;
  private route: Route;

  private player: PlayerHandler;
  private fleet: FleetHandler;

  private currentIndex: number;
  private repeatCount: number;
  private lastActionInProgress: boolean;

  constructor(
    starAtlasManager: StarAtlasManager,
    planId: number,
    planName: string,
    repeat: number,
    route: Route,
    player: PlayerHandler,
    fleet: FleetHandler,
  ) {
    this.starAtlasManager = starAtlasManager;
    this.planId = planId;
    this.planName = planName;
    this.route = route;
    this.player = player;
    this.fleet = fleet;
    this.currentIndex = 0;
    this.repeatCount = repeat || 999999;
    this.lastActionInProgress = false;
  }

  public async runNextAction() {
    if (!this.lastActionInProgress) {
      if (this.currentIndex >= this.route.actions.length) {
        if (this.repeatCount === 0) return; // Fine della coda
        if (this.repeatCount > 0) this.repeatCount--;
        this.currentIndex = 0; // Ripeti le azioni
      }

      const action: Action = this.route.actions[this.currentIndex];
      //console.log(`Eseguendo azione: ${action.ix} - ${this.name}`);

      this.lastActionInProgress = true;
      // Implementare logica per gestire ogni tipo di azione
      switch (action.ix) {
        case "refuel":
        case "reammo":
        case "refood":
        case "loadCargo": {
          const ixs = await this.fleet.ixLoadCargo(action);
          await this.starAtlasManager.sendDynamicTransaction(ixs);
          await createLog({
            message: `Loaded ${action.amount} ${resourceNames[`${action.resource}`]} in cargo hold.`,
            planId: this.planId,
            pubkey: this.starAtlasManager.getAsyncSigner().publicKey(),
          });
          this.lastActionInProgress = false;
        }
        case "unloadCargo": {
        }
        case "startMining": {
        }
        case "trip": {
        }
      }

      this.currentIndex++;
    }
  }
}
