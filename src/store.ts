import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { DecodedStreamEvent } from "./indexer/watchStreams.js";

const DATA_FILE = process.env.DATA_FILE ?? "data/events.json";

export interface PersistedState {
  contractId?: string | undefined;
  events: DecodedStreamEvent[];
  lastLedger?: number | undefined;
}

// Events are only reused if they were saved for the same contract
export function loadState(contractId: string): PersistedState {
  try {
    if (!existsSync(DATA_FILE)) return { contractId, events: [] };
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    if (parsed.contractId !== contractId) {
      console.log("Saved events belong to a different contract, starting fresh.");
      return { contractId, events: [] };
    }
    return {
      contractId,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      lastLedger: typeof parsed.lastLedger === "number" ? parsed.lastLedger : undefined,
    };
  } catch (err) {
    console.error("Could not read saved state, starting fresh:", (err as Error).message);
    return { contractId, events: [] };
  }
}

export function saveState(state: PersistedState): void {
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Could not save state:", (err as Error).message);
  }
}
