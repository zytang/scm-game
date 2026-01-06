
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { GameSession, TeamState, ROLES, Role } from '@/types/game';
import { Users, Truck, Factory, ShoppingCart, Store, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

// Icon Map
const RoleIcons = {
    Retailer: ShoppingCart,
    Wholesaler: Store,
    Distributor: Truck,
    Manufacturer: Factory
};

export default function Lobby() {
    const { id } = useParams(); // Session ID
    const router = useRouter();

    const [session, setSession] = useState<GameSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [newTeamName, setNewTeamName] = useState('');

    // Polling for State
    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await fetch(`/api/game/${id}/state`);
                if (res.ok) {
                    const data = await res.json();
                    setSession(data);

                    // If game started, redirect to game view (logic to be added later based on joined role)
                    // For now, let's just show lobby until manually navigated or role is picked
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchState();
        const interval = setInterval(fetchState, 3000);
        return () => clearInterval(interval);
    }, [id]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        await fetch('/api/session/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: id, teamName: newTeamName })
        });
        setNewTeamName('');
    };

    const handleJoinRole = (teamId: string, role: Role) => {
        // Use sessionStorage to allow multiple tabs/roles for the same game
        sessionStorage.setItem(`scm_session_${id}`, JSON.stringify({ teamId, role }));
        router.push(`/game/${id}`);
    };

    if (loading) return <div className="min-h-screen grid place-items-center text-blue-400">Loading Lobby...</div>;
    if (!session) return <div className="min-h-screen grid place-items-center text-red-400">Session Not Found</div>;

    return (
        <main className="min-h-screen p-6 bg-[hsl(var(--background))]">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            Session: {(session.joinCode || String(id).slice(0, 4)).toUpperCase()}
                        </h1>
                        <p className={clsx("text-sm", session.phase === 'LOBBY' ? "text-blue-200/60" : "text-amber-400 font-bold")}>
                            {session.phase === 'LOBBY' ? "Waiting for teams to assemble..." : "Game in Progress - Registration Closed"}
                        </p>
                    </div>

                    {/* New Team Form */}
                    {session.phase === 'LOBBY' ? (
                        <form onSubmit={handleCreateTeam} className="flex gap-2 w-full md:w-auto">
                            <Input
                                placeholder="New Team Name"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="min-w-[200px]"
                            />
                            <Button type="submit" disabled={!newTeamName}>
                                <Users className="w-4 h-4 mr-2" />
                                Create Team
                            </Button>
                        </form>
                    ) : (
                        <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300 text-sm">
                            Session Locked
                        </div>
                    )}
                </div>

                {/* Teams Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.values(session.teams).map((team) => (
                        <GlassCard key={team.id} className="relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                            <h2 className="text-xl font-bold mb-4 pl-2">{team.name}</h2>

                            <div className="grid grid-cols-2 gap-3">
                                {ROLES.map(role => {
                                    const Icon = RoleIcons[role];
                                    const isTaken = false; // We don't really track exact player IDs in MVP yet

                                    return (
                                        <button
                                            key={role}
                                            onClick={() => handleJoinRole(team.id, role)}
                                            className={clsx(
                                                "flex flex-col items-center justify-center p-4 rounded-lg border transition-all",
                                                isTaken
                                                    ? "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
                                                    : "bg-white/5 border-white/10 hover:bg-blue-500/20 hover:border-blue-400/50"
                                            )}
                                        >
                                            <Icon className={clsx("w-6 h-6 mb-2", {
                                                'text-blue-400': role === 'Retailer',
                                                'text-emerald-400': role === 'Wholesaler',
                                                'text-violet-400': role === 'Distributor',
                                                'text-amber-400': role === 'Manufacturer',
                                            })} />
                                            <span className="text-sm font-medium text-blue-100">{role}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </GlassCard>
                    ))}

                    {Object.keys(session.teams).length === 0 && (
                        <div className="col-span-full py-20 text-center text-blue-200/40 border-2 border-dashed border-white/10 rounded-xl">
                            No teams yet. Create one to get started!
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
