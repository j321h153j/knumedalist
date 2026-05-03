import React from 'react';

export default function PageHeader({ title, subtitle, date }) {
  return (
    <div className="flex flex-col items-center mb-8 pt-6 w-full">
      <div className="w-4/5 max-w-[345px] aspect-[1.54] relative mb-6">
        <img alt="Medalist 2026 Sports Festival Logo" className="w-full h-full object-contain drop-shadow-lg" src="https://lh3.googleusercontent.com/aida/ADBb0uhmwCYQPn7Vku15jRDlmvR8snwBwpcjqnBhK9iuY8m772rYO4xAd_nLYFHO2-gs-59OWb7YzfX10--4VwNMzlIBOEy5-m-TUEA4kcnuXfEGq-R7OmiEEccql12DPj-tGwzeMLcK4ULvJ4hJf3jXoLdL4OakAT4aNYfVUCpKKIM4NHKjBwytDg4o4bdBnvwYRRUP-VWbigBf4k0mi6XKgy0h8y5RICJBAV2oqf12H9kEOfwDXs3GNj_Ww71L_xNhyfmhajrw9OReJg"/>
      </div>
      <div className="font-cafe24 text-3xl font-black drop-shadow-sm text-black">{title}</div>
      {subtitle && <p className="text-[14px] text-gray-500 text-center font-cafe24 mt-2">{subtitle}</p>}
      {date && (
        <div className="flex items-center gap-2 justify-center mt-4">
          <span className="material-symbols-outlined text-pink-400 text-base" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
          <span className="font-lexend font-bold text-lg text-gray-800 tracking-wider">{date}</span>
          <span className="material-symbols-outlined text-orange-400 text-base" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
        </div>
      )}
    </div>
  )
}
