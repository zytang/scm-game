
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GameSession } from '@/types/game';
import { Play, BarChart } from 'lucide-react';

export default function AdminControl() {
    const { id } = useParams();
    const [session, setSession] = useState<GameSession | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [forceAdvanceTeamId, setForceAdvanceTeamId] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);

    const fetchState = async () => {
        try {
            const res = await fetch(`/api/game/${id}/state`);
            if (res.ok) setSession(await res.json());
            else console.error("Admin: Failed to fetch state", res.status);
        } catch (e) {
            console.error("Admin: Network error", e);
        }
    };

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 2000);
        return () => clearInterval(interval);
    }, [id]);

    const handleAdvance = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/game/${id}/advance`, { method: 'POST' });
            if (!res.ok) {
                const data = await res.json();
                alert(`Error: ${data.error || 'Failed to advance game'}`);
            }
        } catch (e) {
            alert("Network error: Could not reach the server.");
        } finally {
            await fetchState();
            setLoading(false);
        }
    };

    const handleForceAdvanceTeam = async (teamId: string) => {
        try {
            const res = await fetch(`/api/game/${id}/advance-team`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId })
            });
            if (!res.ok) alert("Failed to advance team");
        } catch (e) {
            alert("Network error");
        }
        fetchState();
    };

    const handleRestart = async () => {
        if (!confirm('Are you sure you want to restart the game? All progress will be reset.')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/game/${id}/restart`, { method: 'POST' });
            if (!res.ok) alert("Failed to restart game");
        } catch (e) {
            alert("Network error");
        } finally {
            await fetchState();
            setLoading(false);
        }
    };

    if (!session) return <div className="p-8 text-blue-400">Loading Control Room...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Sidebar Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <GlassCard className="space-y-4">
                        <h2 className="text-xl font-bold text-blue-300">Control Panel</h2>
                        {(() => {
                            const teamList = Object.values(session.teams);
                            const teamRounds = teamList.map(t => Math.min(t.currentRound || 0, session.totalRounds));
                            const minRound = teamRounds.length > 0 ? Math.min(...teamRounds) : 0;
                            const maxRound = teamRounds.length > 0 ? Math.max(...teamRounds) : 0;
                            const teamsCompleted = teamRounds.filter(r => r >= session.totalRounds).length;

                            return (
                                <>
                                    <div className="text-3xl font-mono font-black">
                                        {teamList.length === 0 ? '0' : minRound === maxRound ? minRound : `${minRound}-${maxRound}`}
                                        <span className="text-sm font-normal text-gray-400"> / {session.totalRounds}</span>
                                    </div>
                                    {teamList.length > 0 && (
                                        <div className="text-xs text-white/50">
                                            {teamsCompleted} of {teamList.length} teams completed
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                        <div className="text-xs uppercase tracking-widest text-blue-400 mb-4">{session.phase} • {session.roundPhase}</div>

                        <Button
                            onClick={handleAdvance}
                            className="w-full"
                            disabled={loading || session.phase === 'COMPLETED' || session.phase === 'PLAYING'}
                        >
                            {loading ? 'Starting...' : session.phase === 'LOBBY' ? 'Start Game' : 'Game Running'}
                            {loading ? (
                                <div className="ml-2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Play className="w-4 h-4 ml-2" />
                            )}
                        </Button>

                        {/* Per-Team Force Advance */}
                        {session.phase === 'PLAYING' && Object.keys(session.teams).length > 0 && (
                            <div className="pt-4 border-t border-white/10">
                                <div className="text-xs text-white/50 mb-2">Force Advance Team</div>
                                <div className="flex gap-2">
                                    <select
                                        value={forceAdvanceTeamId || ''}
                                        onChange={(e) => setForceAdvanceTeamId(e.target.value || null)}
                                        className="flex-1 bg-slate-800 text-white text-sm px-2 py-2 rounded border border-white/20 focus:outline-none focus:border-blue-400"
                                    >
                                        <option value="">Select Team</option>
                                        {Object.values(session.teams).map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.currentRound > session.totalRounds ? 'Done' : `R${t.currentRound}`})
                                            </option>
                                        ))}
                                    </select>
                                    <Button
                                        onClick={() => forceAdvanceTeamId && handleForceAdvanceTeam(forceAdvanceTeamId)}
                                        disabled={!forceAdvanceTeamId}
                                        className="px-3"
                                    >
                                        <Play className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Restart Game Button */}
                        {(session.phase === 'PLAYING' || session.phase === 'COMPLETED') && (
                            <div className="pt-4 border-t border-white/10">
                                <Button
                                    onClick={handleRestart}
                                    variant="secondary"
                                    className="w-full text-amber-400 hover:text-amber-300 border-amber-500/30"
                                >
                                    ↺ Restart Game
                                </Button>
                            </div>
                        )}
                    </GlassCard>

                    <GlassCard>
                        <div className="text-sm font-bold mb-2">Join Code</div>
                        <div className="text-4xl font-mono text-center tracking-widest select-all cursor-pointer bg-black/20 p-2 rounded">
                            {session.joinCode || String(session.id).slice(0, 4).toUpperCase()}
                        </div>
                    </GlassCard>
                </div>

                {/* Main Dashboard */}
                <div className="lg:col-span-3 space-y-6">
                    <GlassCard className="h-[350px] md:h-[450px] flex flex-col relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4 z-10">
                            <h3 className="text-base md:text-lg font-bold text-blue-200">Inventory & Backlog Over Time</h3>
                            <div className="flex gap-4 text-[10px] md:text-xs">
                                <span className="text-emerald-400 font-bold">— Inventory</span>
                                <span className="text-red-400 font-bold">— Backlog</span>
                            </div>

                            {/* Team Selector */}
                            <select
                                value={selectedTeamId || ''}
                                onChange={(e) => setSelectedTeamId(e.target.value || null)}
                                className="bg-slate-800 text-white text-sm px-3 py-1 rounded border border-white/20 focus:outline-none focus:border-blue-400"
                            >
                                {Object.values(session.teams).map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Chart Area with HTML Labels */}
                        <div className="flex-1 w-full relative flex overflow-hidden">
                            {/* Y-Axis Label */}
                            <div className="flex items-center justify-center w-8 shrink-0">
                                <span className="text-xs text-white/50 -rotate-90 whitespace-nowrap">Units</span>
                            </div>

                            {/* Chart + X-Axis */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 relative min-h-0">
                                    {/* Y-Axis HTML Labels */}
                                    {(() => {
                                        const teams = Object.values(session.teams);
                                        const team = selectedTeamId
                                            ? teams.find(t => t.id === selectedTeamId) || teams[0]
                                            : teams[0];
                                        if (!team) return null;

                                        const roles = ['Retailer', 'Wholesaler', 'Distributor', 'Manufacturer'] as const;
                                        const retailerInvHistory = team.nodes['Retailer']?.inventoryHistory;
                                        if (!retailerInvHistory || retailerInvHistory.length < 2) return null;

                                        const aggInv: number[] = [];
                                        const aggBack: number[] = [];
                                        for (let i = 0; i < retailerInvHistory.length; i++) {
                                            aggInv.push(roles.reduce((sum, r) => sum + (team.nodes[r]?.inventoryHistory?.[i] || 0), 0));
                                            aggBack.push(roles.reduce((sum, r) => sum + (team.nodes[r]?.backlogHistory?.[i] || 0), 0));
                                        }

                                        const aggMax = Math.max(20, ...aggInv, ...aggBack);
                                        const getNiceMax = (val: number) => {
                                            if (val <= 50) return Math.ceil(val / 10) * 10;
                                            if (val <= 100) return Math.ceil(val / 20) * 20;
                                            if (val <= 200) return Math.ceil(val / 50) * 50;
                                            return Math.ceil(val / 100) * 100;
                                        };
                                        const yMax = getNiceMax(aggMax) || 100;
                                        // Cap display history length at totalRounds + 1 (initial + all rounds)
                                        const historyLen = Math.min(retailerInvHistory.length, (session.totalRounds || 12) + 1);

                                        return (
                                            <>
                                                {/* Y-Axis tick labels as HTML */}
                                                <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between text-right pr-1 text-xs text-white/60 pointer-events-none" style={{ paddingTop: '2%', paddingBottom: '12%' }}>
                                                    <span>{yMax}</span>
                                                    <span>{yMax / 2}</span>
                                                    <span>0</span>
                                                </div>
                                                {/* X-Axis tick labels as HTML */}
                                                <div className="absolute bottom-0 left-10 right-0 flex justify-between text-xs text-white uppercase font-bold pointer-events-none" style={{ paddingBottom: '2px' }}>
                                                    <span>0</span>
                                                    <span className="text-blue-300">Week {historyLen - 1}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    <div className="absolute inset-0" style={{ left: '40px', bottom: '20px' }}>
                                        {(() => {
                                            const teams = Object.values(session.teams);
                                            const team = selectedTeamId
                                                ? teams.find(t => t.id === selectedTeamId) || teams[0]
                                                : teams[0];
                                            if (!team) return <div className="text-center mt-20 text-white/20">No data available</div>;

                                            const roles = ['Retailer', 'Wholesaler', 'Distributor', 'Manufacturer'] as const;

                                            const retailerInvHistory = team.nodes['Retailer']?.inventoryHistory;
                                            if (!retailerInvHistory || retailerInvHistory.length < 2) return <div className="text-center mt-20 text-white/20">Waiting for round data...</div>;
                                            // Show aggregated (sum of all roles) inventory and backlog
                                            const historyLength = Math.min(retailerInvHistory.length, (session.totalRounds || 12) + 1);
                                            const aggInv: number[] = [];
                                            const aggBack: number[] = [];
                                            for (let i = 0; i < historyLength; i++) {
                                                aggInv.push(roles.reduce((sum, r) => sum + (team.nodes[r]?.inventoryHistory?.[i] || 0), 0));
                                                aggBack.push(roles.reduce((sum, r) => sum + (team.nodes[r]?.backlogHistory?.[i] || 0), 0));
                                            }

                                            const aggMax = Math.max(20, ...aggInv, ...aggBack);
                                            const getNiceMax = (val: number) => {
                                                if (val <= 50) return Math.ceil(val / 10) * 10;
                                                if (val <= 100) return Math.ceil(val / 20) * 20;
                                                if (val <= 200) return Math.ceil(val / 50) * 50;
                                                return Math.ceil(val / 100) * 100;
                                            };
                                            const yMax = getNiceMax(aggMax) || 100;

                                            const getAggCmd = (hist: number[]) => {
                                                return hist.map((val, i) => {
                                                    const x = (i / (historyLength - 1)) * 100;
                                                    const y = 100 - (val / yMax) * 100;
                                                    return `${x},${y}`;
                                                }).join(' ');
                                            };

                                            return (
                                                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                                                    {/* Y-Axis */}
                                                    <line x1="0" y1="0" x2="0" y2="100" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

                                                    {/* X-Axis */}
                                                    <line x1="0" y1="100" x2="100" y2="100" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

                                                    {/* Mid Grid Line */}
                                                    <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" />

                                                    {/* Inventory Line (Green) */}
                                                    <polyline
                                                        points={getAggCmd(aggInv)}
                                                        fill="none"
                                                        stroke="#34D399"
                                                        strokeWidth="2"
                                                        vectorEffect="non-scaling-stroke"
                                                        className="drop-shadow-lg"
                                                    />

                                                    {/* Backlog Line (Red) */}
                                                    <polyline
                                                        points={getAggCmd(aggBack)}
                                                        fill="none"
                                                        stroke="#F87171"
                                                        strokeWidth="2"
                                                        vectorEffect="non-scaling-stroke"
                                                        className="drop-shadow-lg"
                                                    />
                                                </svg>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* X-Axis Label - outside the chart area */}
                                <div className="text-center text-xs text-white/50 py-2 shrink-0">Weeks</div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Team Analytics */}
                    <div className="grid grid-cols-1 gap-6">
                        {Object.values(session.teams).map(team => {
                            const roles = ['Retailer', 'Wholesaler', 'Distributor', 'Manufacturer'] as const;
                            const roleColors = {
                                Retailer: 'text-blue-400',
                                Wholesaler: 'text-emerald-400',
                                Distributor: 'text-violet-400',
                                Manufacturer: 'text-amber-400'
                            };

                            // Calculate Bullwhip Index (Variance of Manufacturer Orders / Variance of Demand)
                            const demandHistory = session.demandHistory || [];
                            const manuHistory = team.nodes?.['Manufacturer']?.orderHistory || [];

                            const variance = (arr: number[]) => {
                                if (arr.length < 2) return 0;
                                const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
                                return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
                            };

                            const demandVar = variance(demandHistory);
                            const manuVar = variance(manuHistory);

                            // Calculate bullwhip index or show alternative when demand is constant
                            let bullwhipDisplay: string;
                            let bullwhipColor: string;
                            if (demandVar > 0) {
                                const ratio = manuVar / demandVar;
                                bullwhipDisplay = ratio.toFixed(2);
                                bullwhipColor = ratio > 2 ? 'text-red-400' : 'text-emerald-400';
                            } else if (manuVar > 0) {
                                // Constant demand but manufacturer orders vary - show order variance
                                bullwhipDisplay = `σ²=${manuVar.toFixed(1)}`;
                                bullwhipColor = 'text-amber-400';
                            } else {
                                bullwhipDisplay = 'Stable';
                                bullwhipColor = 'text-emerald-400';
                            }

                            return (
                                <GlassCard key={team.id} className="p-6 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold">{team.name}</h3>
                                            <span className={`text-sm px-2 py-1 rounded ${(team.currentRound || 0) > session.totalRounds
                                                ? 'bg-green-500/20 text-green-400'
                                                : (team.currentRound || 0) === session.totalRounds
                                                    ? 'bg-amber-500/20 text-amber-300'
                                                    : 'bg-blue-500/20 text-blue-300'
                                                }`}>
                                                Round {Math.min(team.currentRound || 0, session.totalRounds)} / {session.totalRounds}
                                            </span>
                                        </div>
                                        <div className="flex gap-6 text-sm">
                                            <div className="text-center">
                                                <div className="text-2xl font-mono font-bold text-green-400">${team.totalCost}</div>
                                                <div className="text-xs text-white/50">Total Cost</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`text-2xl font-mono font-bold ${bullwhipColor}`}>
                                                    {bullwhipDisplay}
                                                </div>
                                                <div className="text-xs text-white/50">Bullwhip Index</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Per-Role Breakdown */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                        {roles.map(role => {
                                            const node = team.nodes?.[role];
                                            if (!node) return null;
                                            return (
                                                <div key={role} className="bg-black/20 p-3 rounded-lg text-center">
                                                    <div className={`text-sm font-bold mb-2 ${roleColors[role]}`}>{role}</div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <div className="text-white/40">Inv</div>
                                                            <div className="font-mono font-bold">{node.onHandInventory}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-white/40">Back</div>
                                                            <div className="font-mono font-bold text-red-400">{node.backlog}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-white/40">Inv$</div>
                                                            <div className="font-mono">${node.costHolding}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-white/40">Back$</div>
                                                            <div className="font-mono">${node.costStockout}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Order Variance Bar Chart */}
                                    <div className="pt-4 border-t border-white/10">
                                        <div className="text-xs text-white/50 mb-2">Order Variance by Role (Higher = More Bullwhip)</div>
                                        <div className="flex gap-2 items-end h-16">
                                            {roles.map(role => {
                                                const hist = team.nodes?.[role]?.orderHistory || [];
                                                const v = variance(hist);
                                                const maxV = Math.max(1, ...roles.map(r => variance(team.nodes?.[r]?.orderHistory || [])));
                                                const heightPct = (v / maxV) * 100;
                                                return (
                                                    <div key={role} className="flex-1 flex flex-col items-center">
                                                        <div
                                                            className={`w-full rounded-t transition-all duration-500 ${role === 'Retailer' ? 'bg-blue-500' :
                                                                role === 'Wholesaler' ? 'bg-emerald-500' :
                                                                    role === 'Distributor' ? 'bg-violet-500' : 'bg-amber-500'
                                                                }`}
                                                            style={{ height: `${Math.max(4, heightPct)}%` }}
                                                        />
                                                        <div className="text-[10px] text-white/50 mt-1">{role.slice(0, 3)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
