import React from 'react';

export default function BoothCard({ icon, title, location, time, onClick }) {
  return (
    <article 
      onClick={onClick}
      className="bg-white rounded-[24px] p-8 shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col w-full relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
    >
      <div className="flex items-center justify-between w-full relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-orange-600" style={{fontVariationSettings: "'FILL' 1"}}>{icon || 'storefront'}</span>
          </div>
          <div className="flex flex-col">
            <span className="inline-block w-fit px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-orange-50 text-orange-600 uppercase">BOOTH</span>
            <span className="font-lexend text-gray-400 text-[12px] mt-1 flex items-center gap-1">{time}</span>
          </div>
        </div>
        
        <div className="flex items-center">
          <span className="material-symbols-outlined text-gray-400 text-[24px] group-hover:text-orange-500 transition-colors">chevron_right</span>
        </div>
      </div>
      
      <div className="pt-2 relative z-10">
        <h2 className="text-[24px] font-bold text-gray-900 mt-1 font-cafe24">{title}</h2>
        <p className="text-[14px] text-gray-400 mt-1 font-lexend">{location}</p>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </article>
  )
}
