export default function Booths() {
  const booths = [
    { icon: 'brush', title: '페이스 페인팅', location: '다목적구장', time: '10:30 - 17:30' },
    { icon: 'icecream', title: '추억의 간식', location: '다목적구장', time: '10:30 - 17:30' },
    { icon: 'shopping_bag', title: '에코백 만들기', location: '다목적구장', time: '10:30 - 17:30' },
    { icon: 'style', title: '타로 카드', location: '다목적구장', time: '10:30 - 17:30' },
  ]

  return (
    <main className="max-w-[400px] mx-auto w-full px-5 pt-8 pb-8 md:pt-12">
      <div className="flex flex-col items-center mb-8">
        <div className="w-32 h-auto mb-4">
          <img alt="Medalist Logo" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/ADBb0uhmwCYQPn7Vku15jRDlmvR8snwBwpcjqnBhK9iuY8m772rYO4xAd_nLYFHO2-gs-59OWb7YzfX10--4VwNMzlIBOEy5-m-TUEA4kcnuXfEGq-R7OmiEEccql12DPj-tGwzeMLcK4ULvJ4hJf3jXoLdL4OakAT4aNYfVUCpKKIM4NHKjBwytDg4o4bdBnvwYRRUP-VWbigBf4k0mi6XKgy0h8y5RICJBAV2oqf12H9kEOfwDXs3GNj_Ww71L_xNhyfmhajrw9OReJg"/>
        </div>
        <h1 className="text-[32px] text-gray-900 text-center tracking-tight mb-2 font-cafe24">부스 안내</h1>
        <p className="text-[14px] text-gray-500 text-center font-cafe24">다양한 즐길 거리가 준비되어 있습니다</p>
      </div>

      <div className="flex flex-col gap-4">
        {booths.map((booth, idx) => (
          <article key={idx} className="bg-white rounded-[24px] p-6 shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100 flex w-full flex-row items-center justify-between cursor-pointer group relative overflow-hidden">
            <div className="flex-1 flex flex-col relative z-10">
              <div className="flex items-center gap-[12px] mb-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-orange-50">
                  <span className="material-symbols-outlined text-[28px] text-orange-600">{booth.icon}</span>
                </div>
                <div className="flex flex-col">
                  <span className="inline-block w-fit px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-orange-50 text-orange-600">BOOTH</span>
                  <span className="flex items-center gap-1 text-gray-400 text-[12px] mt-1 font-lexend">{booth.time}</span>
                </div>
              </div>
              <div>
                <h2 className="text-[24px] text-gray-900 mt-1 font-cafe24">{booth.title}</h2>
                <p className="text-[14px] text-gray-400 mt-1 font-cafe24">{booth.location}</p>
              </div>
            </div>
            <div className="flex items-center ml-4 relative z-10">
              <span className="material-symbols-outlined text-gray-400 text-[24px] group-hover:text-pink-600 transition-colors">chevron_right</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </article>
        ))}
      </div>
    </main>
  )
}
