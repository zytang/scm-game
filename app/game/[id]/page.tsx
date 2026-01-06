
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Role, GameSession } from '@/types/game';
import { ArrowUp, ArrowDown, Lock } from 'lucide-react';
import { clsx } from 'clsx';

export default function GameRoom() {
    const { id } = useParams();
    const router = useRouter();

    const [session, setSession] = useState<GameSession | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [teamId, setTeamId] = useState<string | null>(null);

    const [orderAmount, setOrderAmount] = useState<number>(10);
    const [submitted, setSubmitted] = useState(false);
    const [lastSubmittedRound, setLastSubmittedRound] = useState(0);

    // Load Role from Session Storage (allows multi-tab multi-role)
    useEffect(() => {
        const saved = sessionStorage.getItem(`scm_session_${id}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            setRole(parsed.role);
            setTeamId(parsed.teamId);
        } else {
            router.push(`/lobby/${id}`);
        }
    }, [id, router]);

    // Poll State
    useEffect(() => {
        if (!teamId || !role) return;

        const fetchState = async () => {
            try {
                const res = await fetch(`/api/game/${id}/state`);
                if (res.ok) {
                    const data = await res.json();
                    setSession(data);

                    // Check if we submitted this round
                    // If round advanced, session.pendingOrders would be cleared by engine
                    // So if we see our ID in there, it means we submitted for THIS round
                    const myTeamOrders = data.pendingOrders[teamId];
                    if (myTeamOrders && myTeamOrders[role] !== undefined) {
                        setSubmitted(true);
                        setOrderAmount(myTeamOrders[role]!);
                        setLastSubmittedRound(data.teams[teamId]?.currentRound || data.currentRound);
                    } else if ((data.teams[teamId]?.currentRound || data.currentRound) > lastSubmittedRound) {
                        // New round and no pending order -> Reset
                        setSubmitted(false);
                        // Optional: Reset orderAmount to default or previous?
                    }
                }
            } catch (e) { console.error(e); }
        };

        fetchState();
        const interval = setInterval(fetchState, 1000);
        return () => clearInterval(interval);
    }, [id, teamId, role, lastSubmittedRound]);

    // Reset submitted on round change
    useEffect(() => {
        if (session && session.currentRound > lastSubmittedRound) {
            setSubmitted(false);
        }
    }, [session?.currentRound, lastSubmittedRound]);

    const handleSubmit = async () => {
        if (!teamId || !role || !session) return;

        const res = await fetch(`/api/game/${id}/order`, {
            method: 'POST',
            body: JSON.stringify({ teamId, role, amount: orderAmount })
        });

        if (res.ok) {
            setSubmitted(true);
            setLastSubmittedRound(session.currentRound);
        }
    };

    const [timeLeft, setTimeLeft] = useState<number>(60);

    // Timer Logic
    useEffect(() => {
        if (!session?.roundEndTime) return;

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((session.roundEndTime! - now) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [session?.roundEndTime]);

    if (!session || !role || !teamId) return <div className="p-8 text-blue-400">Loading Game...</div>;

    const myTeam = session.teams[teamId];
    const myNode = myTeam.nodes[role];
    const teamRound = myTeam.currentRound || session.currentRound;
    const isRoundActive = session.phase === 'PLAYING' && (myTeam.roundPhase === 'ORDERING' || session.roundPhase === 'ORDERING');

    // Calculate Incoming Demand (Visible this round)
    let incomingDemand = 0;
    if (role === 'Retailer') {
        // Retailer sees Customer Demand (from history)
        if (session.demandHistory.length >= teamRound) {
            incomingDemand = session.demandHistory[teamRound - 1];
        }
    } else {
        // Others see incoming orders that have arrived
        const validOrders = myNode.incomingOrders.filter(o => o.arrivalRound <= teamRound);
        incomingDemand = validOrders.reduce((sum, o) => sum + o.amount, 0);
    }

    return (
        <main className="min-h-screen bg-slate-950 p-4 md:p-8 flex flex-col gap-6">
            {/* Top Bar */}
            <header className="flex justify-between items-center text-white mb-4">
                <div>
                    <div className="text-sm text-blue-300 uppercase tracking-widest">{myTeam.name}</div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        {role} Node
                        <span className="text-[10px] md:text-xs bg-blue-600 px-2 py-1 rounded ml-2 whitespace-nowrap">Round {teamRound}</span>
                    </h1>
                </div>
                <div className="text-right">
                    <div className={clsx("text-4xl font-mono font-bold tabular-nums", timeLeft < 10 ? "text-red-500 animate-pulse" : "text-white/90")}>
                        00:{String(timeLeft).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-white/40">Time Remaining</div>
                </div>
            </header>

            {/* Supply Chain Visualization */}
            <GlassCard className="py-2 px-2 md:px-6 relative overflow-visible mb-2">
                <div className="max-w-4xl mx-auto relative h-24 md:h-36 flex items-center">
                    {/* SVG Flow layer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 800 100" preserveAspectRatio="none">
                        <defs>
                            <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#F87171" />
                            </marker>
                            <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#60A5FA" />
                            </marker>

                            {/* Particle Animation */}
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Demand Paths (Retailer -> Wholesaler -> Distributor -> Manufacturer) */}
                        <path id="path-demand-1" d="M 120 35 Q 190 10 260 35" stroke="#F87171" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead-red)" />
                        <path id="path-demand-2" d="M 340 35 Q 410 10 480 35" stroke="#F87171" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead-red)" />
                        <path id="path-demand-3" d="M 560 35 Q 630 10 700 35" stroke="#F87171" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead-red)" />

                        {/* Supply Paths (Manufacturer -> Distributor -> Wholesaler -> Retailer) */}
                        <path id="path-supply-1" d="M 700 65 Q 630 90 560 65" stroke="#60A5FA" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead-blue)" />
                        <path id="path-supply-2" d="M 480 65 Q 410 90 340 65" stroke="#60A5FA" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead-blue)" />
                        <path id="path-supply-3" d="M 260 65 Q 190 90 120 65" stroke="#60A5FA" strokeWidth="2" fill="none" opacity="0.4" markerEnd="url(#arrowhead-blue)" />

                        {/* Animated Particles for Demand */}
                        <circle r="3" fill="#F87171" filter="url(#glow)">
                            <animateMotion dur="2s" repeatCount="indefinite">
                                <mpath href="#path-demand-1" />
                            </animateMotion>
                        </circle>
                        <circle r="3" fill="#F87171" filter="url(#glow)">
                            <animateMotion dur="2s" repeatCount="indefinite">
                                <mpath href="#path-demand-2" />
                            </animateMotion>
                        </circle>
                        <circle r="3" fill="#F87171" filter="url(#glow)">
                            <animateMotion dur="2s" repeatCount="indefinite">
                                <mpath href="#path-demand-3" />
                            </animateMotion>
                        </circle>

                        {/* Animated Particles for Supply */}
                        <circle r="3" fill="#60A5FA" filter="url(#glow)">
                            <animateMotion dur="2s" repeatCount="indefinite">
                                <mpath href="#path-supply-1" />
                            </animateMotion>
                        </circle>
                        <circle r="3" fill="#60A5FA" filter="url(#glow)">
                            <animateMotion dur="2s" repeatCount="indefinite">
                                <mpath href="#path-supply-2" />
                            </animateMotion>
                        </circle>
                        <circle r="3" fill="#60A5FA" filter="url(#glow)">
                            <animateMotion dur="2s" repeatCount="indefinite">
                                <mpath href="#path-supply-3" />
                            </animateMotion>
                        </circle>
                    </svg>

                    {/* Labels Layer */}
                    <div className="absolute top-[-5px] left-0 w-full flex justify-center pointer-events-none">
                        <span className="bg-red-500/80 text-white text-[8px] md:text-[10px] px-3 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-lg">Demand Flow</span>
                    </div>
                    <div className="absolute bottom-[-5px] left-0 w-full flex justify-center pointer-events-none">
                        <span className="bg-blue-500/80 text-white text-[8px] md:text-[10px] px-3 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-lg">Supply Flow</span>
                    </div>

                    {/* Nodes Grid */}
                    <div className="flex items-center justify-between w-full relative z-10 px-2 md:px-8">
                        {[
                            { id: 'Retailer', label: 'Retailer', img: '/images/retailer.png' },
                            { id: 'Wholesaler', label: 'Wholesaler', img: '/images/wholesaler.png' },
                            { id: 'Distributor', label: 'Distributor', img: '/images/distributor.png' },
                            { id: 'Manufacturer', label: 'Manufacturer', img: '/images/manufacturer.png' }
                        ].map((node) => (
                            <div key={node.id} className="flex flex-col items-center gap-1 transition-all duration-700">
                                <div className={clsx(
                                    "relative w-10 h-10 md:w-20 md:h-20 rounded-xl transition-all duration-500 p-1 bg-black/60 border-2 overflow-visible",
                                    role === node.id
                                        ? "scale-110 shadow-[0_0_30px_rgba(59,130,246,0.6)] border-blue-400"
                                        : "opacity-40 border-white/10 grayscale-[0.5]"
                                )}>
                                    <img src={node.img} alt={node.label} className="w-full h-full object-contain" />
                                    {role === node.id && (
                                        <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-[8px] md:text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg uppercase tracking-tighter z-20">
                                            You
                                        </div>
                                    )}
                                </div>
                                <span className={clsx(
                                    "text-[7px] md:text-xs font-bold uppercase tracking-tighter transition-colors",
                                    role === node.id ? "text-white" : "text-white/30"
                                )}>
                                    {node.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            <div className="grid md:grid-cols-3 gap-6 flex-1">
                {/* Incoming (Pipeline) */}
                <GlassCard className="col-span-1 border-t-4 border-t-emerald-500 bg-emerald-950/20">
                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                        <ArrowDown className="w-4 h-4" /> Incoming Shipments
                    </h3>
                    <div className="space-y-3">
                        {myNode.incomingShipments.map(ship => (
                            <div key={ship.id} className="flex justify-between p-3 bg-black/20 rounded">
                                <span>From {ship.fromRole}</span>
                                <span className="font-mono font-bold text-emerald-300">+{ship.amount}</span>
                                <span className="text-xs text-white/40">Arrives Rd {ship.arrivalRound}</span>
                            </div>
                        ))}
                        {myNode.incomingShipments.length === 0 && <div className="text-white/20 italic text-sm">Nothing on the road</div>}
                    </div>
                </GlassCard>

                {/* Core Status (Mid) */}
                <GlassCard className="col-span-1 md:col-span-1 border-t-4 border-t-blue-500 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-blue-500/10 rounded-lg">
                            <div className="text-3xl font-bold text-white mb-1">{myNode.onHandInventory}</div>
                            <div className="text-xs text-blue-300 uppercase">On Hand</div>
                        </div>
                        <div className="p-4 bg-red-500/10 rounded-lg">
                            <div className="text-3xl font-bold text-red-400 mb-1">{myNode.backlog}</div>
                            <div className="text-xs text-red-300 uppercase">Backlog</div>
                        </div>
                    </div>

                    <div className="h-px bg-white/10" />

                    {/* Order Input */}
                    <div className={clsx("space-y-4 transition-all duration-300",
                        !isRoundActive && "opacity-50 pointer-events-none",
                        submitted && "opacity-90"
                    )}>
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-blue-200 uppercase">Place Order</label>
                            {role === 'Manufacturer'
                                ? <span className="text-xs text-amber-400">Ordering Raw Materials</span>
                                : <span className="text-xs text-blue-300">Ordering from Upstream</span>
                            }
                        </div>

                        {!submitted ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <Button variant="secondary" onClick={() => setOrderAmount(Math.max(0, orderAmount - 1))}>-</Button>
                                    <Input
                                        type="number"
                                        value={orderAmount}
                                        onChange={(e) => setOrderAmount(Number(e.target.value))}
                                        className="text-center font-mono text-xl"
                                    />
                                    <Button variant="secondary" onClick={() => setOrderAmount(orderAmount + 1)}>+</Button>
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    className="w-full py-4 text-lg"
                                    disabled={!isRoundActive}
                                >
                                    Submit Order
                                </Button>
                            </>
                        ) : (
                            <div className="p-6 bg-green-500/20 border border-green-500/50 rounded-lg text-center animate-pulse">
                                <div className="text-xl font-bold text-green-400 mb-2">Order Submitted</div>
                                <div className="text-sm text-green-200">
                                    You ordered <span className="font-bold text-white">{orderAmount}</span> units.
                                </div>
                                <div className="text-xs text-green-200/60 mt-2">
                                    Waiting for round to process...
                                </div>
                            </div>
                        )}

                        {!isRoundActive && !submitted && (
                            <div className="text-center text-amber-300 text-sm flex items-center justify-center gap-2">
                                <Lock className="w-3 h-3" /> Round Locked / Processing
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Outgoing (Downstream Demand) */}
                <GlassCard className="col-span-1 border-t-4 border-t-amber-500 bg-amber-950/20">
                    <h3 className="text-amber-400 font-bold mb-4 flex items-center gap-2">
                        <ArrowUp className="w-4 h-4" /> Demand Information
                    </h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-black/20 rounded text-center">
                            <div className="text-xs text-white/50 mb-1">Incoming Demand (This Round)</div>
                            <div className="text-2xl font-bold text-white">{incomingDemand}</div>
                        </div>

                        <div className="text-xs text-white/40 leading-relaxed p-2">
                            {role === 'Retailer'
                                ? "This is the current customer demand you need to fulfill."
                                : "This is the order amount received from your downstream partner."
                            }
                        </div>
                    </div>
                </GlassCard>
            </div>
        </main>
    );
}
