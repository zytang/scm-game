
export type Role = 'Retailer' | 'Wholesaler' | 'Distributor' | 'Manufacturer';

export const ROLES: Role[] = ['Retailer', 'Wholesaler', 'Distributor', 'Manufacturer'];

export interface GameConfig {
    holdingCost: number; // Default 1
    backorderCost: number; // Default 4
    infoDelay: number; // Default 1 round
    shipDelay: number; // Default 2 rounds
    startingInventory: number; // Default 20
    startingBacklog: number; // Default 0
    demandPattern: number[]; // Array of demand per round
    totalRounds: number; // Default 12
}

export interface Shipment {
    id: string;
    amount: number;
    arrivalRound: number; // The round this shipment arrives and becomes available
    fromRole: Role | 'Supplier'; // Manufacturer receives from "Supplier" (infinite)
    toRole: Role;
}

export interface Order {
    id: string;
    amount: number;
    placedRound: number;
    arrivalRound: number; // The round this order is visible/received by the upstream
    fromRole: Role;
    toRole: Role | 'Customer'; // Retailer receives from "Customer"
}

export interface NodeState {
    role: Role;
    onHandInventory: number;
    backlog: number;
    incomingShipments: Shipment[]; // "Pipeline" inventory
    incomingOrders: Order[]; // Orders from downstream
    lastOrderPlaced: number;
    lastDemandReceived: number; // What they saw this round (or last)
    costHolding: number; // Accumulated
    costStockout: number; // Accumulated

    // Analytics History
    orderHistory: number[];
    inventoryHistory: number[];
    backlogHistory: number[];
}

export interface TeamState {
    id: string;
    name: string;
    nodes: Record<Role, NodeState>;
    playerMap: Record<Role, string | null>; // Maps Role to Player Name/ID
    totalCost: number;
    bullwhipIndex: number | null;

    // Per-team round tracking (for independent pacing)
    currentRound: number;
    roundPhase: RoundPhase;
}

export type GamePhase = 'LOBBY' | 'PLAYING' | 'COMPLETED';
export type RoundPhase = 'ORDERING' | 'PROCESSING';

export interface GameSession {
    id: string;
    joinCode: string; // Short code for students
    currentRound: number;
    totalRounds: number;
    phase: GamePhase;
    roundPhase: RoundPhase;
    roundEndTime: number | null; // Timestamp for auto-advance/lock
    config: GameConfig;
    teams: Record<string, TeamState>; // Keyed by team ID
    pendingOrders: Record<string, Partial<Record<Role, number>>>; // teamId -> role -> amount
    demandHistory: number[]; // What has been revealed so far (0..currentRound)
    createdAt: number;
}
