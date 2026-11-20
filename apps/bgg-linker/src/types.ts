export interface GameCandidate {
  name: string;
  confidence: number;
  source: string;
}

export interface LookupGameMessage {
  type: "lookup-game";
  candidates: GameCandidate[];
}

export interface TestConnectionMessage {
  type: "test-connection";
  token: string;
}

export interface TestConnectionResponse {
  ok: boolean;
  message: string;
}

export interface LookupSuccess {
  status: "found";
  game: {
    id: number;
    name: string;
    year?: number;
    average?: number;
    bayesAverage?: number;
    usersRated?: number;
    rank?: number;
    url: string;
  };
}

export interface LookupNotFound {
  status: "not-found" | "needs-token" | "error";
  message?: string;
}

export type LookupResponse = LookupSuccess | LookupNotFound;

export interface StoredSettings {
  bggToken?: string;
}
