import fs from "node:fs";
import path from "node:path";

export type E2EUserSeed = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "captador" | "operator";
};

export type E2EState = {
  runId: string;
  users: {
    admin: E2EUserSeed;
    captador: E2EUserSeed;
    operator: E2EUserSeed;
  };
  seededOfferName: string;
};

const statePath = path.resolve(process.cwd(), ".e2e-state.json");

export function writeE2EState(state: E2EState) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}

export function readE2EState(): E2EState {
  if (!fs.existsSync(statePath)) {
    throw new Error("E2E_STATE_NOT_FOUND");
  }
  return JSON.parse(fs.readFileSync(statePath, "utf-8")) as E2EState;
}

export function clearE2EState() {
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

export { statePath };
