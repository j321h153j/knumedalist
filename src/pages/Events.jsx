export default function Events() {
  const schedule = [
    { icon: 'sports_soccer', type: 'Soccer', time: '10:30 - 11:30', title: '축구 결승전', desc: '22학번 vs 23학번' },
    { icon: 'sports_basketball', type: 'Basketball', time: '13:00 - 14:30', title: '농구 4강전', desc: '컴퓨터공학과 vs 전자공학과' },
    { icon: 'directions_run', type: 'Relay', time: '15:00 - 16:00', title: '계주 예선', desc: '전체 학과 참여' },
    { icon: 'sports_tennis', type: 'Badminton', time: '16:30 - 18:00', title: '배드민턴 혼합복식', desc: '경영학과 vs 경제학과' },
  ]

  return (
    <main className="max-w-3xl mx-auto px-5 pt-8">
      <div className="flex flex-col items-center mb-8 gap-4">
        <img alt="Logo" className="w-48 h-auto object-contain" src="https://lh3.googleusercontent.com/aida/ADBb0uhmwCYQPn7Vku15jRDlmvR8snwBwpcjqnBhK9iuY8m772rYO4xAd_nLYFHO2-gs-59OWb7YzfX10--4VwNMzlIBOEy5-m-TUEA4kcnuXfEGq-R7OmiEEccql12DPj-tGwzeMLcK4ULvJ4hJf3jXoLdL4OakAT4aNYfVUCpKKIM4NHKjBwytDg4o4bdBnvwYRRUP-VWbigBf4k0mi6XKgy0h8y5RICJBAV2oqf12H9kEOfwDXs3GNj_Ww71L_xNhyfmhajrw9OReJg"/>
        <h1 className="font-cafe24 text-3xl text-gray-800 tracking-tight">경기 종목</h1>
      </div>

      <div className="flex flex-col gap-4">
        {schedule.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] flex items-center gap-4 transition-transform hover:scale-[1.01]">
            <div className="w-16 h-16 rounded-full bg-pink-100 flex-shrink-0 flex items-center justify-center text-pink-600 shadow-sm">
              <span className="material-symbols-outlined text-[32px]" style={{fontVariationSettings: "'FILL' 1"}}>{item.icon}</span>
            </div>
            <div className="flex flex-col flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-lexend font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-[10px] uppercase">{item.type}</span>
                <span className="font-lexend text-gray-500 text-[12px] flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>{item.time}
                </span>
              </div>
              <h3 className="font-cafe24 text-xl text-gray-900 mb-1">{item.title}</h3>
              <p className="font-lexend text-sm text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
