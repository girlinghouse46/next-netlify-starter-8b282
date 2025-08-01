import { useQuery } from '@tanstack/react-query';
import type { Journey } from '@shared/schema';

const JourneyAdmin = () => {
  const { data: journeys, isLoading } = useQuery({
    queryKey: ['/api/journeys'],
    queryFn: () => fetch('/api/journeys').then(res => {
      if (!res.ok) throw new Error('Failed to fetch journeys');
      return res.json() as Promise<Journey[]>;
    }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-xl">Loading cosmic journeys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Cosmic Journey Admin
          </span>
        </h1>
        
        <div className="mb-6 text-center">
          <p className="text-gray-400">Total Journeys: {journeys?.length || 0}</p>
        </div>

        {journeys && journeys.length > 0 ? (
          <div className="grid gap-6">
            {journeys.map((journey) => (
              <div 
                key={journey.id} 
                className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {journey.selectedPath ? `Path of ${journey.selectedPath.charAt(0).toUpperCase() + journey.selectedPath.slice(1)}` : 'Journey Started'}
                    </h3>
                    <p className="text-gray-400 text-sm">Session: {journey.sessionId}</p>
                  </div>
                  <div className="text-right mt-4 md:mt-0">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      journey.currentScreen === 'climactic' ? 'bg-green-600 text-white' :
                      journey.currentScreen === 'branch' ? 'bg-blue-600 text-white' :
                      journey.currentScreen === 'journey' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {journey.currentScreen.charAt(0).toUpperCase() + journey.currentScreen.slice(1)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <p>{new Date(journey.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Updated:</span>
                    <p>{new Date(journey.updatedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Completed:</span>
                    <p>{journey.completedAt ? new Date(journey.completedAt).toLocaleString() : 'In Progress'}</p>
                  </div>
                </div>

                {journey.constellationData && (
                  <div className="mt-4 p-3 bg-gray-800 rounded">
                    <span className="text-gray-400 text-sm">Constellation Data:</span>
                    <div className="mt-2 text-xs text-gray-300 font-mono">
                      {JSON.stringify(journey.constellationData, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌌</div>
            <h2 className="text-2xl font-semibold mb-2">No Journeys Yet</h2>
            <p className="text-gray-400">When users start their cosmic journeys, they'll appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JourneyAdmin;