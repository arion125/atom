import { Keypair } from "@solana/web3.js";
import { QueueManager } from "./queues/QueueManager";
import { Plan } from "./types/types";

export const createAtom = () => {
  const queueManager = new QueueManager();

  return {
    startPlan: ({ plan, keypair }: { plan: Plan; keypair: Keypair }) =>
      queueManager.addQueue({ keypair, plan }),
    stopPlan: (planName: string) => queueManager.removeQueue(planName),
    loop: () => {
      setInterval(() => {
        queueManager.processQueues();
      }, 1000);
    },
  };
};
