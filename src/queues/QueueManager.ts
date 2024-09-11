// src/QueueManager.ts

import { PlanQueue } from "./PlanQueue";
import { Plan } from "../types/types";
import { QueueAlreadyExistsError, QueueNotFoundError } from "../common/errors";
import { KeypairManager } from "./KeypairManager";
import { StarAtlasManager } from "../core/StarAtlasManager";
import { PlayerHandler } from "../core/PlayerHandler";
import { FleetHandler } from "../core/FleetHandler";

export class QueueManager {
  private queues: Map<string, PlanQueue>;
  private keypairManager: KeypairManager;

  constructor(keypairManager: KeypairManager) {
    this.queues = new Map();
    this.keypairManager = keypairManager;
  }

  /**
   * Adds a new queue to the manager.
   * @param plan The plan for which the queue is created.
   * @throws QueueAlreadyExistsError if a queue with the same name already exists.
   */
  public async addQueue(plan: Plan): Promise<void> {
    if (this.queues.has(plan.name)) {
      throw new QueueAlreadyExistsError(plan.name);
    }
    try {
      const keypair = this.keypairManager.getKeypair(plan.pubkey); // 1. seleziona il keypair
      const starAtlasManager = await StarAtlasManager.init(keypair); // 2. crea un star atlas manager
      const player = await PlayerHandler.init(starAtlasManager, plan.profile);
      const fleet = await FleetHandler.init(starAtlasManager, player, plan.fleet);

      const queue = new PlanQueue(
        starAtlasManager,
        plan.id,
        plan.name,
        plan.repeat,
        plan.route,
        player,
        fleet,
      );

      this.queues.set(plan.name, queue);
    } catch (e) {
      throw e; // FIX: typed error handling
    }
  }

  /**
   * Removes a queue based on its name.
   * @param name The name of the queue to be removed.
   * @throws QueueNotFoundError if the queue with the specified name does not exist.
   */
  public removeQueue(name: string): void {
    if (!this.queues.has(name)) {
      throw new QueueNotFoundError(name);
    }
    this.queues.delete(name);
  }

  /**
   * Processes all queues by running the next action in each queue.
   */
  public processQueues(): void {
    this.queues.forEach((queue) => {
      try {
        queue.runNextAction();
      } catch (e) {
        throw e; // FIX: typed error handling
      }
    });
  }
}
