import React from 'react';

export default function EventCard({ icon, sportType, time, title, matchup, location, scoreLeft, scoreRight, status, relayRankings, getTeamName, onClick }) {
  // 진행 완료(completed)일 때만 점수 표시
  const showScore = status === 'completed';
  const isInProgress = status === 'in_progress';
  const hasRelayResults = relayRankings && relayRankings.length > 0;

  return (
    <article 
      onClick={onClick}
      className={`bg-white rounded-[24px] p-8 shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border flex flex-col w-full relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer ${
      isInProgress 
        ? 'border-transparent ring-2 ring-pink-500 shadow-[0px_0px_24px_rgba(255,77,151,0.25)]' 
        : 'border-gray-100'
    }`}>
      
      {isInProgress && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold font-cafe24 text-[13px] tracking-widest px-5 py-2 rounded-bl-[24px] z-20 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          진행중
        </div>
      )}

      <div className="flex items-center justify-between w-full relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-pink-600 text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>{icon || 'sports_soccer'}</span>
          </div>
          <div className="flex flex-col">
            <span className="inline-block w-fit bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">{sportType}</span>
            <span className="font-lexend text-gray-400 text-[12px] mt-1 flex items-center gap-1">{time}</span>
          </div>
        </div>
      </div>
      
      <div className="pt-2 relative z-10">
        <h2 className="text-[24px] font-bold text-gray-900 mt-1 font-cafe24">{title}</h2>
        {matchup && <p className="text-pink-600 font-cafe24 text-[15px] mt-0.5">{matchup}</p>}
        {location && <p className="text-[14px] text-gray-400 mt-1 font-lexend">{location}</p>}
      </div>
      
      {/* 계주 순위 미니 프리뷰 */}
      {hasRelayResults && (
        <div className="bg-gradient-to-r from-pink-50 to-orange-50 rounded-xl py-3 px-4 mt-4 relative z-10">
          <div className="flex flex-col gap-1.5">
            {relayRankings.slice(0, 3).map((rank) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={rank.id || rank.team_id} className="flex items-center gap-2">
                  <span className="text-base w-6 text-center">{medals[rank.rank_order - 1]}</span>
                  <span className="font-cafe24 text-sm font-bold text-gray-800 flex-1">{getTeamName?.(rank.team_id) || '팀 미정'}</span>
                  {rank.record_value && (
                    <span className="font-lexend text-[11px] text-gray-400">{rank.record_value}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1:1 경기 점수 (계주가 아닌 경우에만) */}
      {showScore && !hasRelayResults && (
        <div className="bg-[#FDF3F5] rounded-xl py-4 px-6 flex items-center justify-center mt-4 relative z-10">
          <p className="flex items-center gap-4 text-[18px] font-bold text-[#5B002D] font-cafe24">
            <span className="text-[24px] font-bold">{scoreLeft} : {scoreRight}</span>
          </p>
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </article>
  )
}
