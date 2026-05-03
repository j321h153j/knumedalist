import React from 'react';

export default function EventCard({ icon, sportType, time, title, matchup, location, scoreLeft, scoreRight, status }) {
  // 진행 완료(completed) 또는 진행 중(in_progress)일 때 점수 표시
  const showScore = status === 'completed' || status === 'in_progress';

  return (
    <article className="bg-white rounded-[24px] p-8 shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col w-full relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
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
        <p className="text-[18px] font-bold text-[#5B002D] mt-1 font-cafe24">{matchup}</p>
        <p className="text-[14px] text-gray-400 mt-1 font-lexend">{location}</p>
      </div>
      
      {showScore && (
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
