
import { v4 as uuidv4 } from 'uuid';
import {
    GameSession, GameConfig,
    GamePhase, TeamState, NodeState, Role, ROLES,
    Shipment, Order, RoundPhase
} from '@/types/game';

// DEMAND PATTERN LIBRARY (from game_data)
export const DEMAND_PATTERNS: Record<string, { name: string; description: string; pattern: number[] }> = {
    A: { name: 'Stable', description: 'Constant demand - Level 1 baseline', pattern: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
    B: { name: 'Mild Noise', description: 'Slight variation - Intro-friendly', pattern: [9, 10, 11, 10, 9, 10, 11, 10, 9, 10, 11, 10] },
    C: { name: 'Realistic Noise', description: 'Unpredictable variation - Level 2', pattern: [8, 11, 9, 12, 10, 9, 13, 8, 11, 10, 12, 9] },
    D: { name: 'Step Change', description: 'Classic bullwhip demonstration', pattern: [10, 10, 10, 10, 10, 14, 14, 14, 14, 14, 14, 14] },
    E: { name: 'Spike & Revert', description: 'Tests overreaction to one-time spike', pattern: [10, 10, 10, 10, 18, 10, 10, 10, 10, 10, 10, 10] },
    F: { name: 'Promotion Wave', description: 'Batching effect demonstration', pattern: [9, 9, 9, 14, 14, 14, 9, 9, 9, 14, 14, 9] },
    G: { name: 'Seasonal Ramp', description: 'Gradual increase - Forecasting lesson', pattern: [8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13] },
    H: { name: 'Misleading Calm', description: 'Stable early, turbulent later', pattern: [10, 10, 10, 10, 10, 10, 8, 12, 9, 13, 10, 12] }
};

// DEFAULT CONSTANTS
const DEFAULT_CONFIG: GameConfig = {
    holdingCost: 1,
    backorderCost: 4,
    infoDelay: 1,
    shipDelay: 2,
    startingInventory: 20,
    startingBacklog: 0,
    demandPattern: DEMAND_PATTERNS.D.pattern, // Default Pattern D (Step Change)
    totalRounds: 12
};

export const GameEngine = {
    createSession: (customConfig?: Partial<GameConfig>): GameSession => {
        const id = uuidv4();
        const joinCode = Math.random().toString(36).substring(2, 6).toUpperCase();

        // Merge default config with custom config
        const config: GameConfig = {
            ...DEFAULT_CONFIG,
            ...customConfig
        };

        return {
            id,
            joinCode,
            currentRound: 0,
            totalRounds: config.totalRounds,
            phase: 'LOBBY',
            roundPhase: 'ORDERING',
            roundEndTime: null,
            config,
            teams: {}, // Teams will be added via join
            pendingOrders: {},
            demandHistory: [],
            createdAt: Date.now(),
        };
    },

    addTeam: (session: GameSession, teamName: string): TeamState => {
        const teamId = uuidv4();
        const nodes: Record<string, NodeState> = {};

        // Initialize Nodes
        ROLES.forEach(role => {
            // Pipeline setup from Spec:
            // "Pipeline shipments: 10 arriving next round, 10 arriving in two rounds"
            // Current Round is 0. 
            // Arriving Next (Round 1) -> arrivalRound = 1
            // Arriving Two (Round 2) -> arrivalRound = 2

            const initialShipments: Shipment[] = [
                {
                    id: uuidv4(),
                    amount: 10,
                    arrivalRound: 1,
                    fromRole: getUpstreamRole(role), // Helper
                    toRole: role
                },
                {
                    id: uuidv4(),
                    amount: 10,
                    arrivalRound: 2,
                    fromRole: getUpstreamRole(role),
                    toRole: role
                }
            ];

            nodes[role] = {
                role,
                onHandInventory: session.config.startingInventory,
                backlog: session.config.startingBacklog,
                incomingShipments: initialShipments,
                incomingOrders: [],
                lastOrderPlaced: 0,
                lastDemandReceived: 0,
                costHolding: 0,
                costStockout: 0,
                orderHistory: [],
                inventoryHistory: [session.config.startingInventory],
                backlogHistory: [session.config.startingBacklog]
            };
        });

        const newTeam: TeamState = {
            id: teamId,
            name: teamName,
            nodes: nodes as Record<Role, NodeState>,
            playerMap: {
                Retailer: null,
                Wholesaler: null,
                Distributor: null,
                Manufacturer: null
            },
            totalCost: 0,
            bullwhipIndex: null,
            currentRound: 0,
            roundPhase: 'ORDERING'
        };

        session.teams[teamId] = newTeam;
        return newTeam;
    },

    startGame: (session: GameSession) => {
        if (session.phase !== 'LOBBY') return;
        session.phase = 'PLAYING';
        session.currentRound = 1;
        session.roundPhase = 'ORDERING';

        // Initialize all teams to round 1
        Object.values(session.teams).forEach(team => {
            team.currentRound = 1;
            team.roundPhase = 'ORDERING';
        });

        // Reveal first demand
        const firstDemand = session.config.demandPattern[0] || 0;
        session.demandHistory = [firstDemand];

        // Start Timer (60s default) - kept for backward compat
        session.roundEndTime = Date.now() + 60 * 1000;
    },

    restartGame: (session: GameSession) => {
        const { startingInventory, startingBacklog, shipDelay } = session.config;

        // Reset session state
        session.phase = 'PLAYING';
        session.currentRound = 1;
        session.roundPhase = 'ORDERING';
        session.demandHistory = [session.config.demandPattern[0] || 0];
        session.roundEndTime = Date.now() + 60 * 1000;

        // Reset all teams
        Object.values(session.teams).forEach(team => {
            team.currentRound = 1;
            team.roundPhase = 'ORDERING';
            team.totalCost = 0;

            // Reset all nodes
            ROLES.forEach(role => {
                if (team.nodes[role]) {
                    team.nodes[role] = {
                        role,
                        onHandInventory: startingInventory,
                        backlog: startingBacklog,
                        lastOrderPlaced: 0,
                        lastDemandReceived: 0,
                        incomingShipments: Array(shipDelay).fill(null).map((_, i) => ({
                            id: `restart-${role}-${i}`,
                            amount: 10,
                            arrivalRound: i + 1,
                            fromRole: role === 'Manufacturer' ? 'Supplier' as const : ROLES[ROLES.indexOf(role) + 1],
                            toRole: role
                        })),
                        incomingOrders: [],
                        inventoryHistory: [startingInventory],
                        backlogHistory: [startingBacklog],
                        orderHistory: [],
                        costHolding: 0,
                        costStockout: 0
                    };
                }
            });
        });
    },

    // This function is called when the timer ends or admin forces next round
    processRound: (session: GameSession) => {
        if (session.phase !== 'PLAYING') return;

        const { infoDelay, shipDelay, holdingCost, backorderCost } = session.config;
        const currentR = session.currentRound;
        const nextR = currentR + 1;

        // Process each team
        Object.values(session.teams).forEach(team => {
            // 1. Determine Orders for each node (User Input OR Default)
            // We need to apply these orders to ONLY the UPSTREAM node's "Incoming Orders" pipeline.

            const teamOrders = session.pendingOrders[team.id] || {};

            ROLES.forEach(role => {
                const node = team.nodes[role];

                // --- ORDER SUBMISSION LOGIC ---
                let orderAmount = teamOrders[role];
                if (orderAmount === undefined) {
                    // Default Policy: Repeat last order (or 0 if none)
                    // Ideally we track last order. For MVP we might default to 10 or 0.
                    // Spec says "Repeat last order".
                    // Since we don't track history deeply here yet, let's use a safe default of 0 is bad, 
                    // 10 is neutral. Let's look at `node.lastOrderPlaced`.
                    orderAmount = node.lastOrderPlaced || 10;
                }
                node.lastOrderPlaced = orderAmount;

                // Place this order into the Upstream's pipeline
                // Determine Upstream
                const upstream = getUpstreamRole(role);

                if (upstream !== 'Supplier') {
                    // Normal node
                    const upstreamNode = team.nodes[upstream as Role];
                    upstreamNode.incomingOrders.push({
                        id: uuidv4(),
                        amount: orderAmount,
                        placedRound: currentR,
                        arrivalRound: currentR + infoDelay, // Visible/Active in Info Delay rounds
                        fromRole: role,
                        toRole: upstream as Role
                    });
                }
                // If 'Supplier', order disappears into void (infinite supply triggered later)
                if (role === 'Manufacturer') {
                    // Manufacturer orders from Supplier. Supplier ships immediately (plus delay).
                    // So we inject a Shipment entering Manufacturer pipeline.
                    node.incomingShipments.push({
                        id: uuidv4(),
                        amount: orderAmount,
                        arrivalRound: currentR + shipDelay, // Supplier ship delay
                        fromRole: 'Supplier',
                        toRole: 'Manufacturer'
                    });
                }
            });

            // 2. FULFILLMENT & INVENTORY UPDATES (Simulating the round that just passed)
            // We process strictly: Receive Shipment -> Fulfill Demand -> Update Cost

            // Note: In the "Order of Events" of the Spec:
            // "Node fulfills downstream demand from available inventory"
            // Demand comes from Downstream's order (arriving now) or Customer Demand (for Retailer)

            // We need to iterate Upstream -> Downstream or arbitrary? 
            // State is mostly independent in a single timestep except for shipment creation.

            ROLES.forEach(role => {
                const node = team.nodes[role];

                // A. Receive Shipments
                // Filter shipments that arrive THIS round (or earlier if somehow missed)
                const arrivingShips = node.incomingShipments.filter(s => s.arrivalRound <= currentR);
                const stockAdded = arrivingShips.reduce((sum, s) => sum + s.amount, 0);

                // Remove processed shipments
                node.incomingShipments = node.incomingShipments.filter(s => s.arrivalRound > currentR);

                // Update On Hand
                let available = node.onHandInventory + stockAdded;

                // B. Determine Demand
                let demand = 0;
                if (role === 'Retailer') {
                    // From Game Config
                    demand = session.config.demandPattern[currentR - 1] || 0;
                    // Note: Arrays are 0-indexed, Rounds are 1-indexed. round 1 -> index 0
                } else {
                    // From Downstream Orders that Arrived This Round
                    // Get valid orders
                    const validOrders = node.incomingOrders.filter(o => o.arrivalRound <= currentR);
                    demand = validOrders.reduce((sum, o) => sum + o.amount, 0);

                    // Cleanup orders
                    node.incomingOrders = node.incomingOrders.filter(o => o.arrivalRound > currentR);
                }

                node.lastDemandReceived = demand; // For UI

                // C. Fulfill
                const totalDemand = demand + node.backlog;
                const shipped = Math.min(available, totalDemand);

                const newBacklog = totalDemand - shipped;
                const newOnHand = available - shipped;

                node.onHandInventory = newOnHand;
                node.backlog = newBacklog;

                // D. Ship to Downstream
                // If I am NOT Retailer, I ship to Downstream Node.
                // Retailer "ships" to Customer (void).
                if (role !== 'Retailer') {
                    const downstreamRole = getDownstreamRole(role);
                    if (downstreamRole !== 'Customer') {
                        const downstreamNode = team.nodes[downstreamRole as Role];
                        downstreamNode.incomingShipments.push({
                            id: uuidv4(),
                            amount: shipped,
                            arrivalRound: currentR + shipDelay,
                            fromRole: role,
                            toRole: downstreamRole as Role
                        });
                    }
                }

                // E. Costs
                node.costHolding += newOnHand * holdingCost;
                node.costStockout += newBacklog * backorderCost;

                // F. Update History (For Analytics)
                node.orderHistory.push(node.lastOrderPlaced);
                node.inventoryHistory.push(newOnHand);
                node.backlogHistory.push(newBacklog);
            });

            // Update Team Total Cost
            team.totalCost = Object.values(team.nodes).reduce((sum, n) => sum + n.costHolding + n.costStockout, 0);

            // Advance team's round
            team.currentRound = nextR;
            if (nextR > session.totalRounds) {
                team.roundPhase = 'PROCESSING';
            } else {
                team.roundPhase = 'ORDERING';
            }
        });

        // Calculate Bullwhip (Simple MVP: Variance of Retailer Orders / Variance of Demand)
        // Need history... MVP maybe skip or implement simple

        // Clear Orders
        session.pendingOrders = {};

        // Check Game Over
        if (nextR > session.totalRounds) {
            session.phase = 'COMPLETED';
            session.roundPhase = 'PROCESSING'; // Stays done
        } else {
            session.currentRound = nextR;
            // Reveal Next Demand
            const nextDemand = session.config.demandPattern[session.currentRound - 1] || 0;
            session.demandHistory.push(nextDemand);

            // Reset Timer (60s)
            session.roundEndTime = Date.now() + 60 * 1000;
        }
    },

    // Process a single team's round (for independent pacing)
    processTeamRound: (session: GameSession, teamId: string) => {
        if (session.phase !== 'PLAYING') return;

        const team = session.teams[teamId];
        if (!team) return;

        // Check if team has already completed all rounds (allow processing up to totalRounds)
        if ((team.currentRound || 0) > session.totalRounds) return;

        const { infoDelay, shipDelay, holdingCost, backorderCost } = session.config;
        const currentR = team.currentRound;
        const nextR = currentR + 1;

        const teamOrders = session.pendingOrders[teamId] || {};

        // 1. Process Orders
        ROLES.forEach(role => {
            const node = team.nodes[role];

            let orderAmount = teamOrders[role];
            if (orderAmount === undefined) {
                orderAmount = node.lastOrderPlaced || 10;
            }
            node.lastOrderPlaced = orderAmount;

            const upstream = getUpstreamRole(role);

            if (upstream !== 'Supplier') {
                const upstreamNode = team.nodes[upstream as Role];
                upstreamNode.incomingOrders.push({
                    id: uuidv4(),
                    amount: orderAmount,
                    placedRound: currentR,
                    arrivalRound: currentR + infoDelay,
                    fromRole: role,
                    toRole: upstream as Role
                });
            }

            if (role === 'Manufacturer') {
                node.incomingShipments.push({
                    id: uuidv4(),
                    amount: orderAmount,
                    arrivalRound: currentR + shipDelay,
                    fromRole: 'Supplier',
                    toRole: 'Manufacturer'
                });
            }
        });

        // 2. Fulfillment & Inventory Updates
        ROLES.forEach(role => {
            const node = team.nodes[role];

            const arrivingShips = node.incomingShipments.filter(s => s.arrivalRound <= currentR);
            const stockAdded = arrivingShips.reduce((sum, s) => sum + s.amount, 0);
            node.incomingShipments = node.incomingShipments.filter(s => s.arrivalRound > currentR);

            let available = node.onHandInventory + stockAdded;

            let demand = 0;
            if (role === 'Retailer') {
                demand = session.config.demandPattern[currentR - 1] || 0;
            } else {
                const validOrders = node.incomingOrders.filter(o => o.arrivalRound <= currentR);
                demand = validOrders.reduce((sum, o) => sum + o.amount, 0);
                node.incomingOrders = node.incomingOrders.filter(o => o.arrivalRound > currentR);
            }

            node.lastDemandReceived = demand;

            const totalDemand = demand + node.backlog;
            const shipped = Math.min(available, totalDemand);

            const newBacklog = totalDemand - shipped;
            const newOnHand = available - shipped;

            node.onHandInventory = newOnHand;
            node.backlog = newBacklog;

            if (role !== 'Retailer') {
                const downstreamRole = getDownstreamRole(role);
                if (downstreamRole !== 'Customer') {
                    const downstreamNode = team.nodes[downstreamRole as Role];
                    downstreamNode.incomingShipments.push({
                        id: uuidv4(),
                        amount: shipped,
                        arrivalRound: currentR + shipDelay,
                        fromRole: role,
                        toRole: downstreamRole as Role
                    });
                }
            }

            node.costHolding += newOnHand * holdingCost;
            node.costStockout += newBacklog * backorderCost;

            node.orderHistory.push(node.lastOrderPlaced);
            node.inventoryHistory.push(newOnHand);
            node.backlogHistory.push(newBacklog);
        });

        team.totalCost = Object.values(team.nodes).reduce((sum, n) => sum + n.costHolding + n.costStockout, 0);

        // Clear this team's pending orders
        delete session.pendingOrders[teamId];

        // Advance team's round
        team.currentRound = nextR;
        if (nextR > session.totalRounds) {
            team.roundPhase = 'PROCESSING'; // Team is done
        } else {
            team.roundPhase = 'ORDERING';
        }

        // Ensure demandHistory has enough entries for all teams
        while (session.demandHistory.length < nextR && session.demandHistory.length < session.totalRounds) {
            const d = session.config.demandPattern[session.demandHistory.length] || 0;
            session.demandHistory.push(d);
        }

        // Check if ALL teams are done
        const allDone = Object.values(session.teams).every(t => t.currentRound > session.totalRounds || t.roundPhase === 'PROCESSING' && t.currentRound >= session.totalRounds);
        if (allDone) {
            session.phase = 'COMPLETED';
        }
    }
};

// HELPERS
function getUpstreamRole(role: Role): Role | 'Supplier' {
    switch (role) {
        case 'Retailer': return 'Wholesaler';
        case 'Wholesaler': return 'Distributor';
        case 'Distributor': return 'Manufacturer';
        case 'Manufacturer': return 'Supplier';
    }
}

function getDownstreamRole(role: Role): Role | 'Customer' {
    switch (role) {
        case 'Manufacturer': return 'Distributor';
        case 'Distributor': return 'Wholesaler';
        case 'Wholesaler': return 'Retailer';
        case 'Retailer': return 'Customer';
    }
}
