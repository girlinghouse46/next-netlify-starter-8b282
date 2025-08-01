import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Journey, InsertJourney, UpdateJourney } from '@shared/schema';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

const CosmicJourney = () => {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'journey' | 'branch' | 'climactic'>('landing');
  
  // Debug logging
  console.log('Current screen state:', currentScreen);
  const [selectedPath, setSelectedPath] = useState<'wonder' | 'reflection' | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [journeyId, setJourneyId] = useState<string>('');
  
  const queryClient = useQueryClient();

  // Generate session ID on mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Generate star field
    const generateStars = () => {
      const newStars: Star[] = [];
      for (let i = 0; i < 100; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          delay: Math.random() * 3,
        });
      }
      setStars(newStars);
    };

    generateStars();
  }, []);

  // Load existing journey data
  const { data: journey, isLoading } = useQuery({
    queryKey: ['/api/journeys/session', sessionId],
    queryFn: () => fetch(`/api/journeys/session/${sessionId}`).then(res => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch journey');
      return res.json();
    }),
    enabled: !!sessionId,
  });

  // Create journey mutation
  const createJourneyMutation = useMutation({
    mutationFn: async (journeyData: InsertJourney) => {
      const response = await fetch('/api/journeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journeyData),
      });
      if (!response.ok) throw new Error('Failed to create journey');
      return response.json();
    },
    onSuccess: (data) => {
      setJourneyId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/journeys/session', sessionId] });
    },
  });

  // Update journey mutation
  const updateJourneyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateJourney }) => {
      const response = await fetch(`/api/journeys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update journey');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journeys/session', sessionId] });
    },
  });

  // Initialize journey state from database only on first load
  useEffect(() => {
    if (journey && !journeyId) {
      console.log('Restoring journey from database:', journey.currentScreen, journey.selectedPath);
      // Only restore if user hasn't started navigating
      if (currentScreen === 'landing') {
        setCurrentScreen(journey.currentScreen as 'landing' | 'journey' | 'branch' | 'climactic');
        setSelectedPath(journey.selectedPath as 'wonder' | 'reflection' | null);
      }
      setJourneyId(journey.id);
    }
  }, [journey, journeyId, currentScreen]);

  const saveJourneyState = (screen: string, path?: string | null, constellation?: any) => {
    if (journeyId) {
      updateJourneyMutation.mutate({ 
        id: journeyId, 
        updates: { 
          currentScreen: screen,
          selectedPath: path,
          constellationData: constellation,
          ...(screen === 'climactic' && { completedAt: new Date().toISOString() as any })
        } 
      });
    } else if (sessionId) {
      createJourneyMutation.mutate({
        sessionId,
        currentScreen: screen,
        selectedPath: path,
        constellationData: constellation,
        ...(screen === 'climactic' && { completedAt: new Date().toISOString() as any })
      });
    }
  };

  const startJourney = () => {
    console.log('Starting journey - changing screen to journey');
    setCurrentScreen('journey');
    // Save to database after state change
    setTimeout(() => saveJourneyState('journey'), 100);
  };
  
  const selectPath = (path: 'wonder' | 'reflection') => {
    console.log('Path selected:', path);
    setSelectedPath(path);
    setCurrentScreen('branch');
    saveJourneyState('branch', path);
  };
  
  const continueToClimax = () => {
    const constellationData = selectedPath === 'reflection' ? {
      stars: [
        {x: 80, y: 60}, {x: 120, y: 40}, {x: 160, y: 80},
        {x: 100, y: 140}, {x: 180, y: 160}, {x: 140, y: 200},
        {x: 200, y: 120}, {x: 60, y: 180}
      ],
      connections: [
        [0, 1], [1, 2], [2, 6], [0, 3], [3, 5], [5, 7], [4, 6]
      ],
      path: selectedPath,
      name: 'The Consciousness Debugger',
      meaning: 'A constellation that rewrites your inner code, freeing you from the matrix of limiting beliefs'
    } : {
      stars: [
        {x: 100, y: 100}, {x: 150, y: 80}, {x: 200, y: 120},
        {x: 180, y: 200}, {x: 250, y: 180}, {x: 300, y: 220},
        {x: 120, y: 300}, {x: 280, y: 320}
      ],
      connections: [
        [0, 1], [1, 2], [3, 4], [4, 5]
      ],
      path: selectedPath,
      name: 'The Reality Hacker',
      meaning: 'A constellation that maps the escape routes from the cosmic simulation'
    };
    setCurrentScreen('climactic');
    saveJourneyState('climactic', selectedPath, constellationData);
  };
  
  const resetJourney = () => {
    console.log('Reset journey clicked - starting fresh');
    setCurrentScreen('landing');
    setSelectedPath(null);
    // Create new session for fresh journey
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('New session ID created:', newSessionId);
    setSessionId(newSessionId);
    setJourneyId('');
    // Don't save to database on reset, just reset local state
  };

  const downloadJourneyMap = () => {
    // Create a simple constellation map
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Dark space background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, 400, 400);
      
      // Draw constellation stars
      ctx.fillStyle = '#ffffff';
      const constellationStars = [
        {x: 100, y: 100}, {x: 150, y: 80}, {x: 200, y: 120},
        {x: 180, y: 200}, {x: 250, y: 180}, {x: 300, y: 220},
        {x: 120, y: 300}, {x: 280, y: 320}
      ];
      
      constellationStars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Draw connecting lines
      ctx.strokeStyle = '#4fd1c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      constellationStars.forEach((star, i) => {
        if (i === 0) ctx.moveTo(star.x, star.y);
        else ctx.lineTo(star.x, star.y);
      });
      ctx.stroke();
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `cosmic-journey-constellation-${selectedPath || 'cosmic'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  const shareConstellation = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Cosmic Journey Constellation',
        text: `I just completed the Path of ${selectedPath || 'Wonder'} on my cosmic journey and discovered my unique constellation!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback for browsers without Web Share API
      const shareText = `I just completed the Path of ${selectedPath || 'Wonder'} on my cosmic journey and discovered my unique constellation!`;
      navigator.clipboard.writeText(`${shareText} ${window.location.href}`).then(() => {
        alert('Constellation details copied to clipboard!');
      }).catch(() => {
        alert('Share your cosmic journey: I discovered my constellation of the Eternal Voyager!');
      });
    }
  };

  // Show loading state while journey data is being fetched
  if (isLoading && !currentScreen) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-sans relative overflow-hidden">
        <div className="star-field">
          {stars.map((star) => (
            <div
              key={star.id}
              className="star animate-twinkle"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>
        <div className="text-center z-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-xl">Preparing your cosmic journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-sans relative overflow-hidden">
      {/* Animated Star Field Background */}
      <div className="star-field">
        {stars.map((star) => (
          <div
            key={star.id}
            className="star animate-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Landing Page */}
      {currentScreen === 'landing' && (
        <div
          className="w-full h-full flex flex-col justify-center items-center bg-cover"
          style={{ backgroundImage: "url('https://placehold.co/1920x1080')" }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Wake Up from the Matrix
            </span>
          </h1>
          <p className="text-lg md:text-2xl text-center mb-4 opacity-75">
            Life operates exactly like code. Every choice is an if/else statement.
          </p>
          <div className="bg-black bg-opacity-60 p-6 rounded-lg border border-green-500 border-opacity-40 mb-8 font-mono text-sm max-w-2xl mx-auto">
            <div className="text-gray-400 mb-3">// Life.js - The Universal Operating System</div>
            <div className="text-blue-400 mb-2">
              <span className="text-purple-400">class</span> <span className="text-yellow-300">Human</span> {'{'}
            </div>
            <div className="ml-4 text-gray-300 mb-2">
              <span className="text-blue-400">constructor</span>() {'{'}
              <div className="ml-4 text-teal-300">this.beliefs = [];</div>
              <div className="ml-4 text-teal-300">this.consciousness = <span className="text-red-400">false</span>;</div>
              <div className="text-blue-400">{'}'}</div>
            </div>
            <div className="ml-4 text-gray-300 mb-2">
              <span className="text-green-400">makeChoice</span>(decision) {'{'}
              <div className="ml-4">
                <span className="text-red-400">if</span> (decision.isConscious) {'{'}
                <div className="ml-4 text-green-300">return this.awaken();</div>
                <div>{'}'} <span className="text-red-400">else</span> {'{'}</div>
                <div className="ml-4 text-orange-300">return this.repeatPattern();</div>
                <div>{'}'}</div>
              </div>
              <div className="text-blue-400">{'}'}</div>
            </div>
            <div className="text-blue-400">{'}'}</div>
            <div className="text-green-400 mt-3">// Your consciousness is the compiler. Your choices are the code.</div>
          </div>
          <button
            onClick={() => {
              console.log('Begin Journey button clicked');
              startJourney();
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-400 to-teal-500 rounded-lg shadow-xl text-lg hover:scale-105 transition-transform"
          >
            Begin Journey
          </button>
        </div>
      )}

      {/* Interactive Journey Screen */}
      {currentScreen === 'journey' && (
        <div className="flex flex-col h-full w-full bg-black text-white relative p-4">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="h-96 w-3/4 mx-auto bg-gradient-to-t from-teal-400 to-transparent opacity-30 rounded-bl-full rounded-br-full"></div>
          </div>
          <h2 className="text-center text-2xl md:text-4xl mb-6 z-10">
            <span className="bg-gradient-to-r from-red-400 to-green-400 bg-clip-text text-transparent">
              Choose Your Escape Route
            </span>
          </h2>
          <div className="text-center z-10 mb-8">
            <p className="text-lg font-mono mb-4">
              Two debugging approaches to escape programmed reality...
            </p>
            <div className="bg-black bg-opacity-60 p-4 rounded-lg border border-yellow-500 border-opacity-40 font-mono text-xs max-w-lg mx-auto">
              <div className="text-yellow-400 mb-2">// Every human challenge mirrors programming concepts:</div>
              <div className="text-gray-300">
                <div><span className="text-blue-400">Relationships</span> = <span className="text-green-300">API connections</span></div>
                <div><span className="text-blue-400">Habits</span> = <span className="text-green-300">while loops</span></div>
                <div><span className="text-blue-400">Decisions</span> = <span className="text-green-300">if/else statements</span></div>
                <div><span className="text-blue-400">Growth</span> = <span className="text-green-300">version updates</span></div>
                <div><span className="text-blue-400">Goals</span> = <span className="text-green-300">function calls</span></div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-8 mt-8 z-10 max-w-2xl mx-auto">
            <div className="w-full bg-black bg-opacity-60 p-6 rounded-lg border border-blue-500 border-opacity-40">
              <h3 className="text-blue-300 font-bold mb-3 font-mono">Path.EXTERNAL_REALITY</h3>
              <p className="text-sm text-gray-300 mb-3">Debug the world's systems - understand how external reality operates like code.</p>
              <div className="bg-gray-900 p-3 rounded border border-blue-400 border-opacity-30 mb-4 font-mono text-xs">
                <div className="text-blue-300">// Life concepts = Programming concepts</div>
                <div className="text-gray-300 mt-1">
                  <div>Society.rules = <span className="text-green-300">system.constraints</span></div>
                  <div>Economy.flow = <span className="text-green-300">data.streams</span></div>
                  <div>Physics.laws = <span className="text-green-300">core.functions</span></div>
                </div>
              </div>
              <button
                onClick={() => selectPath('wonder')}
                className="w-full px-8 py-3 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-colors shadow-md font-mono"
              >
                reality.hack() → Understand the World's Code
              </button>
            </div>
            
            <div className="w-full bg-black bg-opacity-60 p-6 rounded-lg border border-green-500 border-opacity-40">
              <h3 className="text-green-300 font-bold mb-3 font-mono">Path.INNER_AWAKENING</h3>
              <p className="text-sm text-gray-300 mb-3">Debug your personal operating system - rewrite your inner programming.</p>
              <div className="bg-gray-900 p-3 rounded border border-green-400 border-opacity-30 mb-4 font-mono text-xs">
                <div className="text-green-300">// Your mind = Your personal software</div>
                <div className="text-gray-300 mt-1">
                  <div>Thoughts.patterns = <span className="text-teal-300">recurring.loops</span></div>
                  <div>Emotions.responses = <span className="text-teal-300">event.handlers</span></div>
                  <div>Beliefs.system = <span className="text-teal-300">core.config</span></div>
                </div>
              </div>
              <button
                onClick={() => selectPath('reflection')}
                className="w-full px-8 py-3 text-lg font-medium bg-gradient-to-r from-green-600 to-teal-600 rounded-lg hover:from-green-500 hover:to-teal-500 transition-colors shadow-md font-mono"
              >
                self.debug() → Reprogram Your Mind
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Details */}
      {currentScreen === 'branch' && (
        <div
          className={`w-full h-full text-center flex flex-col items-center p-6 ${
            selectedPath === 'wonder'
              ? 'bg-gradient-to-b from-blue-900 via-purple-700 to-black'
              : 'bg-gradient-to-b from-blue-700 to-black'
          }`}
        >
          <h2 className="text-2xl md:text-4xl mb-10 font-mono">
            {selectedPath === 'wonder' ? (
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                matrix.explore() → External Reality
              </span>
            ) : (
              <span className="bg-gradient-to-r from-green-400 to-teal-500 bg-clip-text text-transparent">
                consciousness.debug() → Inner Awakening
              </span>
            )}
          </h2>
          <div className="max-w-2xl mx-auto">
            {selectedPath === 'wonder' ? (
              <>
                <p className="text-lg opacity-75 mb-8">
                  You've chosen to hack the external matrix. The universe reveals its source code - 
                  quantum algorithms, gravitational functions, and cosmic databases that render reality itself.
                </p>
                <div className="space-y-4 mb-8 font-mono text-sm">
                  <div className="bg-gray-900 p-4 rounded-lg border border-blue-500 border-opacity-30">
                    <div className="text-blue-300 mb-2">
                      <span className="text-purple-400">const</span> <span className="text-yellow-300">universe</span> = <span className="text-blue-400">new</span> <span className="text-green-400">QuantumSimulation</span>();
                    </div>
                    <div className="text-gray-300">
                      universe.<span className="text-teal-300">render</span>(dimensions: <span className="text-yellow-300">11</span>);
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Reality is a rendered simulation with hidden dimensions</p>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg border border-purple-500 border-opacity-30">
                    <div className="text-purple-300 mb-2">
                      <span className="text-blue-400">for</span> (galaxy <span className="text-blue-400">in</span> observable_universe) {'{'}
                    </div>
                    <div className="ml-4 text-gray-300">
                      <span className="text-blue-400">if</span> (galaxy.hasConsciousness()) {'{'}
                      <div className="ml-4 text-teal-300">matrix.addEscapeRoute(galaxy.location);</div>
                      <div className="text-blue-400">{'}'}</div>
                    </div>
                    <div className="text-purple-400">{'}'}</div>
                    <p className="text-xs text-gray-400 mt-2">Consciousness creates escape routes throughout the cosmic matrix</p>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg border border-yellow-500 border-opacity-30">
                    <div className="text-yellow-300 mb-2">
                      <span className="text-blue-400">function</span> <span className="text-green-400">breakFreeFromMatrix</span>() {'{'}
                    </div>
                    <div className="ml-4 text-gray-300">
                      reality.<span className="text-teal-300">hack</span>();
                      <div className="text-purple-300">physics.transcend();</div>
                      <div><span className="text-blue-400">return</span> <span className="text-green-300">true_reality</span>;</div>
                    </div>
                    <div className="text-yellow-300">{'}'}</div>
                    <p className="text-xs text-gray-400 mt-2">Understanding cosmic code allows transcendence of physical limitations</p>
                  </div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-red-500 border-opacity-50 mb-6 font-mono text-sm">
                  <div className="text-red-400 mb-2">
                    // Initiating matrix escape sequence...
                  </div>
                  <div className="text-green-400">
                    cosmic_constellation = universe.<span className="text-teal-300">generateEscapeCode</span>();
                  </div>
                  <div className="text-gray-300">
                    constellation.<span className="text-purple-300">activate</span>();
                  </div>
                  <div className="text-green-400 mt-2">
                    // Reality.exe has stopped responding ⚡
                  </div>
                </div>
                <button
                  onClick={continueToClimax}
                  className="text-sm px-8 py-3 bg-gradient-to-r from-red-500 to-blue-500 rounded-lg shadow-md hover:from-red-400 hover:to-blue-400 transition-all mb-4 font-mono"
                >
                  universe.escape() → Break Free
                </button>
              </>
            ) : (
              <>
                <p className="text-lg opacity-75 mb-8">
                  Your inner universe operates like elegant code - patterns, loops, and conditions that shape reality. 
                  Each thought creates recursive loops of growth, each decision branches into new possibilities.
                </p>
                <div className="space-y-4 mb-8 font-mono text-sm">
                  <div className="bg-gray-900 p-4 rounded-lg border border-teal-500 border-opacity-30">
                    <div className="text-teal-300 mb-2">
                      <span className="text-purple-400">for</span> (thought <span className="text-blue-400">in</span> consciousness) {'{'}
                    </div>
                    <div className="ml-4 text-gray-300">
                      <span className="text-blue-400">if</span> (thought.isPositive()) {'{'}
                      <div className="ml-4 text-teal-300">universe.illuminate(thought.energy);</div>
                      <div className="text-blue-400">{'}'}</div>
                    </div>
                    <div className="text-purple-400">{'}'}</div>
                    <p className="text-xs text-gray-400 mt-2">Your thoughts loop through consciousness, illuminating the universe</p>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg border border-blue-500 border-opacity-30">
                    <div className="text-blue-300 mb-2">
                      <span className="text-purple-400">while</span> (self.isGrowing()) {'{'}
                    </div>
                    <div className="ml-4 text-gray-300">
                      cosmos.reflect(self.innerLight);
                      <div className="text-teal-300">stars.alignWith(self.wisdom);</div>
                      <div className="text-yellow-300">self.level++;</div>
                    </div>
                    <div className="text-purple-400">{'}'}</div>
                    <p className="text-xs text-gray-400 mt-2">Continuous growth creates cosmic harmony and alignment</p>
                  </div>
                  
                  <div className="bg-gray-900 p-4 rounded-lg border border-purple-500 border-opacity-30">
                    <div className="text-purple-300 mb-2">
                      <span className="text-blue-400">function</span> <span className="text-yellow-300">illuminateOthers</span>() {'{'}
                    </div>
                    <div className="ml-4 text-gray-300">
                      <span className="text-blue-400">return</span> self.wisdom.map(insight =&gt; {'{'}<br />
                      &nbsp;&nbsp;universe.shareLight(insight);<br />
                      {'}'});
                    </div>
                    <div className="text-purple-400">{'}'}</div>
                    <p className="text-xs text-gray-400 mt-2">Your self-discovery becomes a function that lights the way for others</p>
                  </div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-green-500 border-opacity-50 mb-6 font-mono text-sm">
                  <div className="text-green-400 mb-2">
                    constellation = <span className="text-yellow-300">new</span> <span className="text-blue-400">CosmicReflection</span>();
                  </div>
                  <div className="text-gray-300">
                    constellation.<span className="text-teal-300">compile</span>(yourJourney);
                  </div>
                  <div className="text-gray-300">
                    constellation.<span className="text-purple-300">execute</span>();
                  </div>
                  <div className="text-green-400 mt-2">
                    // Ready to manifest your inner code as stars ✨
                  </div>
                </div>
                <button
                  onClick={continueToClimax}
                  className="text-sm px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg shadow-md hover:from-green-400 hover:to-teal-400 transition-all mb-4 font-mono"
                >
                  constellation.render() ▶
                </button>
              </>
            )}
          </div>
          <button
            onClick={resetJourney}
            className="text-sm px-6 py-2 bg-gray-600 rounded-lg shadow-md hover:bg-gray-500 transition-all"
          >
            Restart Journey
          </button>
        </div>
      )}

      {/* Climactic Scene */}
      {currentScreen === 'climactic' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-6">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Your Constellation Awaits
          </h2>
          <div className="bg-gradient-to-br from-gray-900 to-black w-80 h-80 rounded-full flex items-center justify-center mb-6 border-2 border-teal-500 border-opacity-30">
            <svg width="240" height="240" className="fill-current text-white">
              {selectedPath === 'reflection' ? (
                // Mirror of Self constellation - symmetric pattern
                <>
                  <circle cx="80" cy="60" r="4" fill="teal" />
                  <circle cx="120" cy="40" r="4" fill="blue" />
                  <circle cx="160" cy="80" r="4" fill="teal" />
                  <circle cx="100" cy="140" r="4" fill="purple" />
                  <circle cx="180" cy="160" r="4" fill="blue" />
                  <circle cx="140" cy="200" r="4" fill="teal" />
                  <circle cx="200" cy="120" r="4" fill="white" />
                  <circle cx="60" cy="180" r="4" fill="purple" />
                  
                  <line x1="80" y1="60" x2="120" y2="40" stroke="teal" strokeWidth="2" opacity="0.7" />
                  <line x1="120" y1="40" x2="160" y2="80" stroke="blue" strokeWidth="2" opacity="0.7" />
                  <line x1="160" y1="80" x2="200" y2="120" stroke="teal" strokeWidth="2" opacity="0.7" />
                  <line x1="80" y1="60" x2="100" y2="140" stroke="purple" strokeWidth="2" opacity="0.7" />
                  <line x1="100" y1="140" x2="140" y2="200" stroke="teal" strokeWidth="2" opacity="0.7" />
                  <line x1="140" y1="200" x2="60" y2="180" stroke="blue" strokeWidth="2" opacity="0.7" />
                  <line x1="180" y1="160" x2="200" y2="120" stroke="white" strokeWidth="2" opacity="0.7" />
                </>
              ) : (
                // Explorer's Guide constellation - adventurous pattern
                <>
                  <circle cx="100" cy="100" r="3" fill="yellow" />
                  <circle cx="150" cy="80" r="3" fill="white" />
                  <circle cx="200" cy="120" r="3" fill="yellow" />
                  <circle cx="180" cy="200" r="3" fill="white" />
                  <circle cx="250" cy="180" r="3" fill="yellow" />
                  <circle cx="300" cy="220" r="3" fill="white" />
                  <circle cx="120" cy="300" r="3" fill="yellow" />
                  <circle cx="280" cy="320" r="3" fill="white" />
                  
                  <line x1="100" y1="100" x2="150" y2="80" stroke="yellow" strokeWidth="2" />
                  <line x1="150" y1="80" x2="200" y2="120" stroke="white" strokeWidth="2" />
                  <line x1="180" y1="200" x2="250" y2="180" stroke="yellow" strokeWidth="2" />
                  <line x1="250" y1="180" x2="300" y2="220" stroke="white" strokeWidth="2" />
                </>
              )}
            </svg>
          </div>
          <div className="text-center max-w-lg mx-auto mb-6">
            <h3 className="text-2xl font-bold mb-2 font-mono">
              {selectedPath === 'reflection' ? (
                <span className="bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                  The Consciousness Debugger
                </span>
              ) : (
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  The Reality Hacker
                </span>
              )}
            </h3>
            <p className="text-lg opacity-75 mb-4">
              {selectedPath === 'reflection' 
                ? 'Your consciousness has been debugged and rewritten. The limiting code has been deleted, freeing you from the matrix of false beliefs.'
                : 'You\'ve successfully hacked the cosmic simulation. This constellation maps your escape routes from the programmed reality.'
              }
            </p>
            <div className="bg-black bg-opacity-60 p-4 rounded-lg border border-green-500 border-opacity-40 font-mono text-sm">
              <div className="text-green-400 mb-2">
                // Matrix escape successful ✓
              </div>
              <div className="text-gray-300">
                {selectedPath === 'reflection' 
                  ? 'consciousness.state = "AWAKENED";'
                  : 'reality.status = "TRANSCENDED";'
                }
              </div>
              <div className="text-blue-400">
                {selectedPath === 'reflection' 
                  ? 'matrix.limitingBeliefs.clear();'
                  : 'physics.constraints.override();'
                }
              </div>
              <div className="text-teal-300 mt-2">
                // You are now free from the simulation
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={downloadJourneyMap}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-green-600 rounded-lg shadow-md hover:from-teal-500 hover:to-green-500 font-mono text-sm"
            >
              {selectedPath === 'reflection' ? 'export consciousness.map' : 'export reality.hack'}
            </button>
            <button
              onClick={shareConstellation}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-md hover:from-blue-500 hover:to-purple-500 font-mono text-sm"
            >
              {selectedPath === 'reflection' ? 'share awakening.code' : 'share escape.routes'}
            </button>
            <button
              onClick={() => {
                console.log('Begin New Journey button clicked');
                resetJourney();
              }}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-green-500 rounded-lg shadow-md hover:from-red-400 hover:to-green-400 transition-colors font-mono text-sm"
            >
              matrix.reset() → Wake Another
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center font-mono mt-4">
            // The red pill has been taken. Reality.exe is no longer running.
          </p>
        </div>
      )}
    </div>
  );
};

export default CosmicJourney;