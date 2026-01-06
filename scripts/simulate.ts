
import { GameEngine } from '../lib/engine';
import { GameStorage } from '../lib/storage'; // We might mock this or use it
import { Role } from '../types/game';

// Mock Storage to avoid File IO issues or just use it if it works
const mockStorage = {
    save: (s: any) => { },
    get: (id: string) => null
};

async function runSimulation() {
    console.log("Starting Simulation...");

    // 1. Create Session
    const session = GameEngine.createSession();
    console.log(`Session Created: ${session.id}`);

    // 2. Add Team
    const team = GameEngine.addTeam(session, "SimTeam");
    console.log(`Team Added: ${team.name} (${team.id})`);

    // 3. Start Game
    GameEngine.startGame(session);
    console.log(`Game Started. Round: ${session.currentRound}`);

    // verify initial state
    if (session.currentRound !== 1) throw new Error("Round should be 1");
    if (session.phase !== 'PLAYING') throw new Error("Phase should be PLAYING");

    // 4. Simulate Round 1 Order
    // Retailer orders 15 (Demand is 10)
    console.log("Placing Orders for Round 1...");

    // Check pending orders init
    if (!session.pendingOrders) session.pendingOrders = {};
    if (!session.pendingOrders[team.id]) session.pendingOrders[team.id] = {};

    session.pendingOrders[team.id]['Retailer'] = 15;
    session.pendingOrders[team.id]['Wholesaler'] = 12;

    // 5. Advance Round
    GameEngine.processRound(session);
    console.log(`Advanced to Round: ${session.currentRound}`);

    // 6. Verify Logic
    // Retailer:
    // Started with 20. Demand was 10. Should have 10 left.
    // Incoming Shipment was 10 (from setup). So 20 + 10 - 10 = 20? 
    // Wait, startup pipeline: "10 arriving next round (Round 1)" -> Yes.
    // So Available = 20 (Start) + 10 (Arrived) = 30.
    // Demand = 10.
    // End Inventory = 20.

    const retailer = session.teams[team.id].nodes['Retailer'];
    console.log(`Retailer Inventory: ${retailer.onHandInventory}`);

    if (retailer.onHandInventory !== 20) {
        console.error(`FAILED: Expected 20, got ${retailer.onHandInventory}`);
    } else {
        console.log("PASSED: Inventory Logic correct.");
    }

    // Verify Upstream Order visibility
    // Retailer ordered 15. Info delay 1.
    // Wholesaler should see it in Round 1 + 1 = 2.
    // Currently we are in Round 2.
    // Let's check Wholesaler Incoming Orders.
    const wholesaler = session.teams[team.id].nodes['Wholesaler'];
    console.log("Wholesaler Incoming Orders:", wholesaler.incomingOrders);

    const foundOrder = wholesaler.incomingOrders.find(o => o.amount === 15 && o.fromRole === 'Retailer');
    if (foundOrder && foundOrder.arrivalRound === 2) {
        console.log("PASSED: Order Visibility Logic (Info Delay).");
    } else {
        console.error("FAILED: Wholesaler did not receive Retailer order correctly.");
    }

    console.log("Simulation Complete.");
}

runSimulation().catch(console.error);
