
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { ArrowRight, Box, Users } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    router.push('/create');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    // For now, just navigate to lobby. 
    // Ideally we check if session exists here or let lobby handle it.
    router.push(`/lobby/${joinCode}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="z-10 max-w-4xl w-full flex flex-col items-center text-center gap-12">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-8xl font-black bg-gradient-to-br from-blue-400 via-white to-purple-400 bg-clip-text text-transparent drop-shadow-2xl tracking-tighter">
            SCM GAME
          </h1>
          <p className="text-xl md:text-2xl text-blue-100/70 font-light tracking-wide">
            Master the Supply Chain. Conquer the Bullwhip.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
          {/* Join Session */}
          <GlassCard className="flex flex-col gap-6 items-center text-center hover:border-blue-400/30">
            <div className="p-4 rounded-full bg-blue-500/10 mb-2">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Student Join</h2>
              <p className="text-blue-200/60 text-sm">Enter the code provided by your instructor to join a team.</p>
            </div>

            <form onSubmit={handleJoin} className="w-full space-y-4">
              <Input
                placeholder="Enter Session Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="text-center text-lg tracking-widest uppercase font-mono"
              />
              <Button type="submit" className="w-full group" disabled={!joinCode}>
                Join Session
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </GlassCard>

          {/* Create Session */}
          <GlassCard className="flex flex-col gap-6 items-center text-center hover:border-purple-400/30">
            <div className="p-4 rounded-full bg-purple-500/10 mb-2">
              <Box className="w-8 h-8 text-purple-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Instructor</h2>
              <p className="text-blue-200/60 text-sm">Create a new game session and monitor student progress.</p>
            </div>
            <div className="flex-1" />
            <Button variant="secondary" onClick={handleCreate} className="w-full">
              Create New Session
            </Button>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
