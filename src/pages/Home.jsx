export default function Home() {
  return (
    <main className="w-full max-w-md mx-auto md:max-w-4xl pb-32">
      <div className="sticky top-0 z-40 bg-[#F8F9FA]/95 backdrop-blur-sm border-b border-gray-200/60 shadow-sm flex flex-col mb-8 items-center text-center px-5 pt-6 pb-5 w-full">
        <div className="w-4/5 max-w-[345px] aspect-[1.54] relative mb-6">
          <img alt="Medalist Logo" className="w-full h-full object-contain drop-shadow-lg" src="https://lh3.googleusercontent.com/aida/ADBb0uhmwCYQPn7Vku15jRDlmvR8snwBwpcjqnBhK9iuY8m772rYO4xAd_nLYFHO2-gs-59OWb7YzfX10--4VwNMzlIBOEy5-m-TUEA4kcnuXfEGq-R7OmiEEccql12DPj-tGwzeMLcK4ULvJ4hJf3jXoLdL4OakAT4aNYfVUCpKKIM4NHKjBwytDg4o4bdBnvwYRRUP-VWbigBf4k0mi6XKgy0h8y5RICJBAV2oqf12H9kEOfwDXs3GNj_Ww71L_xNhyfmhajrw9OReJg"/>
        </div>
        <div className="font-cafe24 text-3xl font-black mb-4 drop-shadow-sm text-black">우리들의 올림픽</div>
        <div className="flex items-center gap-2 justify-center">
          <span className="material-symbols-outlined text-pink-400 text-base" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
          <span className="font-lexend font-bold text-lg text-gray-800 tracking-wider">5/6 (WED)</span>
          <span className="material-symbols-outlined text-orange-400 text-base" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
        </div>
      </div>

      <section className="flex flex-col gap-4 px-5">
        <h2 className="font-cafe24 text-xl font-black text-gray-800 mb-1">현재 진행중</h2>
        
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#FFE8ED] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#FF4D97] text-3xl">sports_soccer</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="bg-[#FFE8ED] text-[#FF4D97] font-lexend font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider mb-2">SOCCER</span>
              <h3 className="text-2xl font-bold text-black tracking-tight font-cafe24">축구 결승전</h3>
              <span className="text-[#AFAFAF] font-lexend font-medium text-sm mt-1">10:30 - 11:30</span>
            </div>
          </div>
          <div className="flex items-center justify-center mt-2 bg-[#FDF2F5] rounded-xl py-4 px-10">
            <span className="text-base font-bold text-[#5B002D] flex-1 text-center font-cafe24">22학번</span>
            <span className="text-[#D0C0C6] font-lexend font-bold text-sm px-6">VS</span>
            <span className="text-base font-bold text-[#5B002D] flex-1 text-center font-cafe24">23학번</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#FFF0E8] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#9C4422] text-3xl">directions_run</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="bg-[#FFF0E8] text-[#9C4422] font-lexend font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider mb-2">RELAY</span>
              <h3 className="text-2xl font-bold text-black tracking-tight font-cafe24">400m 계주</h3>
              <span className="text-[#AFAFAF] font-lexend font-medium text-sm mt-1">11:30 - 12:00</span>
            </div>
          </div>
          <div className="flex items-center justify-center mt-2 bg-[#FFF8F5] rounded-xl py-4 px-10">
            <span className="text-base font-bold text-[#380C00] flex-1 text-center font-cafe24">3학년 대표</span>
            <span className="text-[#D0C0C6] font-lexend font-bold text-sm px-6">VS</span>
            <span className="text-base font-bold text-[#380C00] flex-1 text-center font-cafe24">교사 팀</span>
          </div>
        </div>
      </section>
    </main>
  )
}
