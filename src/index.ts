import { cli } from "./cli";

export const main = () => {
  //const plan = fetchPlan(planName);

  //const queueManager = new QueueManager(plan);

  setInterval(() => {
    console.log("Hello, lollo");
  }, 1000);
};

// main();

cli();

// 1. workflow che gestisce l'esecuzione del piano
// 2. workflow che rinnova un token jwt in scadenza
