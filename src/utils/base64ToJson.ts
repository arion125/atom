import { parsePlan } from "./parsePlan";
import { Plan, PlanRaw } from "../types/types";
import { Base64ToJsonError } from "../common/errors";

// Processa la stringa in base64 per convertirla in json e crea la coda
export const base64ToJson = (input: string): Plan => {
  try {
    const decodedInput = Buffer.from(input, "base64").toString("utf8");
    const planRaw: PlanRaw = JSON.parse(decodedInput);
    const plan: Plan = parsePlan(planRaw);
    return plan;
  } catch (e) {
    throw new Base64ToJsonError();
  }
};
