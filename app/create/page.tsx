
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { ROLES } from '@/types/game';

// Demand patterns (mirrored from engine.ts for display)
const DEMAND_PATTERNS = {
    A: { name: 'Stable', description: 'Constant demand - Level 1 baseline' },
    B: { name: 'Mild Noise', description: 'Slight variation - Intro-friendly' },
    C: { name: 'Realistic Noise', description: 'Unpredictable variation - Level 2' },
    D: { name: 'Step Change', description: 'Classic bullwhip demonstration' },
    E: { name: 'Spike & Revert', description: 'Tests overreaction to one-time spike' },
    F: { name: 'Promotion Wave', description: 'Batching effect demonstration' },
    G: { name: 'Seasonal Ramp', description: 'Gradual increase - Forecasting lesson' },
    H: { name: 'Misleading Calm', description: 'Stable early, turbulent later' }
};

export default function CreateSession() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [demandPatternKey, setDemandPatternKey] = useState('D'); // Default to Step Change

    // Configuration State
    const [config, setConfig] = useState({
        holdingCost: 1,
        backorderCost: 4,
        infoDelay: 1,
        shipDelay: 2,
        startingInventory: 20,
        totalRounds: 12
    });

    const handleCreate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, demandPatternKey })
            });

            const data = await res.json();
            if (data.sessionId) {
                router.push(`/admin/${data.sessionId}`);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 relative">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b from-slate-900 to-black" />

            <GlassCard className="z-10 w-full max-w-2xl space-y-8">
                <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                    <Button variant="secondary" onClick={() => router.back()} className="px-3">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Create Session</h1>
                        <p className="text-blue-200/60 text-sm">Configure your simulation parameters</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Delays */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-blue-300">Delays (Rounds)</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Information Delay (Ordering)</label>
                            <input
                                type="number" min="0" max="5"
                                value={config.infoDelay}
                                onChange={e => setConfig({ ...config, infoDelay: Number(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Shipping Delay (Fulfillment)</label>
                            <input
                                type="number" min="0" max="5"
                                value={config.shipDelay}
                                onChange={e => setConfig({ ...config, shipDelay: Number(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                            />
                        </div>
                    </div>

                    {/* Costs */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-amber-300">Costs ($)</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Holding Cost (per unit/round)</label>
                            <input
                                type="number" min="0" step="0.5"
                                value={config.holdingCost}
                                onChange={e => setConfig({ ...config, holdingCost: Number(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Backorder Cost (per unit/round)</label>
                            <input
                                type="number" min="0" step="0.5"
                                value={config.backorderCost}
                                onChange={e => setConfig({ ...config, backorderCost: Number(e.target.value) })}
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                            />
                        </div>
                    </div>

                    {/* Demand Pattern */}
                    <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-lg font-bold text-purple-300">Demand Pattern</h3>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Customer Demand Scenario</label>
                            <select
                                value={demandPatternKey}
                                onChange={e => setDemandPatternKey(e.target.value)}
                                className="w-full bg-slate-800 border border-white/20 rounded p-3 text-white"
                            >
                                {Object.entries(DEMAND_PATTERNS).map(([key, p]) => (
                                    <option key={key} value={key} className="bg-slate-800 text-white">
                                        Pattern {key}: {p.name} - {p.description}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-white/40">
                                {DEMAND_PATTERNS[demandPatternKey as keyof typeof DEMAND_PATTERNS]?.description}
                            </p>
                        </div>
                    </div>

                    {/* Simulation Settings */}
                    <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-lg font-bold text-emerald-300">Simulation Settings</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Starting Inventory</label>
                                <input
                                    type="number" min="0"
                                    value={config.startingInventory}
                                    onChange={e => setConfig({ ...config, startingInventory: Number(e.target.value) })}
                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">Total Rounds</label>
                                <input
                                    type="number" min="5" max="50"
                                    value={config.totalRounds}
                                    onChange={e => setConfig({ ...config, totalRounds: Number(e.target.value) })}
                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6">
                    <Button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full text-lg py-4"
                    >
                        {loading ? 'Creating Session...' : (
                            <>
                                Launch Session <Play className="w-5 h-5 ml-2 fill-current" />
                            </>
                        )}
                    </Button>
                </div>
            </GlassCard>
        </main>
    );
}
