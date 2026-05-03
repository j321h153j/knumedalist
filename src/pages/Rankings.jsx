import React from 'react';
import PageHeader from '../components/PageHeader';

export default function Rankings({ data }) {
  const rankings = data?.scoreboard?.rankings || [];
  const teams = data?.teams || [];

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '팀 미정';

  // Make sure we have enough data to show top 3
  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];
  const others = rankings.slice(3);

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-32">
      <PageHeader title="종합 순위" />

      {rankings.length === 0 ? (
        <p className="text-center text-gray-400 font-cafe24 mt-8">아직 집계된 순위가 없습니다.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
          {/* Top 3 */}
          <div className="bg-gradient-to-br from-pink-50 to-white p-5 border-b border-gray-100 flex items-end justify-center gap-4 pt-8">
            {/* 2nd Place */}
            {top2 && (
              <div className="flex flex-col items-center gap-2 relative top-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center relative z-10">
                  <span className="font-lexend font-bold text-xl text-gray-500">2</span>
                </div>
                <div className="text-center">
                  <p className="font-cafe24 text-base text-gray-900">{getTeamName(top2.team_id)}</p>
                  <p className="font-lexend text-sm text-pink-600 font-bold">{top2.total_points}</p>
                </div>
              </div>
            )}
            
            {/* 1st Place */}
            {top1 && (
              <div className="flex flex-col items-center gap-2 relative -top-4 z-20">
                <div className="material-symbols-outlined text-yellow-400 absolute -top-8 text-3xl drop-shadow-md" style={{fontVariationSettings: "'FILL' 1"}}>workspace_premium</div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 border-4 border-white shadow-md flex items-center justify-center">
                  <span className="font-lexend font-bold text-2xl text-white">1</span>
                </div>
                <div className="text-center">
                  <p className="font-cafe24 text-lg text-gray-900">{getTeamName(top1.team_id)}</p>
                  <p className="font-lexend text-xl text-pink-600 font-bold">{top1.total_points}</p>
                </div>
              </div>
            )}
            
            {/* 3rd Place */}
            {top3 && (
              <div className="flex flex-col items-center gap-2 relative top-6">
                <div className="w-14 h-14 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center relative z-10">
                  <span className="font-lexend font-bold text-xl text-gray-500">3</span>
                </div>
                <div className="text-center">
                  <p className="font-cafe24 text-base text-gray-900">{getTeamName(top3.team_id)}</p>
                  <p className="font-lexend text-sm text-pink-600 font-bold">{top3.total_points}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* List */}
          {others.length > 0 && (
            <div className="flex flex-col px-4 py-2">
              {others.map((rank, idx) => (
                <div key={rank.team_id} className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors px-2 rounded-lg last:border-0">
                  <div className="flex items-center gap-4">
                    <span className="font-lexend font-bold text-xl text-gray-400 w-8 text-center">{idx + 4}</span>
                    <span className="font-cafe24 text-lg text-gray-900">{getTeamName(rank.team_id)}</span>
                  </div>
                  <span className="font-lexend text-sm text-gray-500 font-semibold">{rank.total_points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
