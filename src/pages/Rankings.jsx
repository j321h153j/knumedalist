export default function Rankings() {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-5 pb-8 pt-4">
      <header className="w-full flex justify-center py-6 mt-4">
        <img alt="Sports Festival Logo" className="object-contain h-20" src="https://lh3.googleusercontent.com/aida/ADBb0uhmwCYQPn7Vku15jRDlmvR8snwBwpcjqnBhK9iuY8m772rYO4xAd_nLYFHO2-gs-59OWb7YzfX10--4VwNMzlIBOEy5-m-TUEA4kcnuXfEGq-R7OmiEEccql12DPj-tGwzeMLcK4ULvJ4hJf3jXoLdL4OakAT4aNYfVUCpKKIM4NHKjBwytDg4o4bdBnvwYRRUP-VWbigBf4k0mi6XKgy0h8y5RICJBAV2oqf12H9kEOfwDXs3GNj_Ww71L_xNhyfmhajrw9OReJg"/>
      </header>

      <div className="mb-4 flex justify-center">
        <h2 className="font-cafe24 text-2xl text-gray-900">종합 순위</h2>
      </div>

      <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
        {/* Top 3 */}
        <div className="bg-gradient-to-br from-pink-50 to-white p-5 border-b border-gray-100 flex items-end justify-center gap-4 pt-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center gap-2 relative top-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center relative z-10">
              <span className="font-lexend font-bold text-xl text-gray-500">2</span>
            </div>
            <div className="text-center">
              <p className="font-cafe24 text-base text-gray-900">23학번</p>
              <p className="font-lexend text-sm text-pink-600 font-bold">1,850</p>
            </div>
          </div>
          {/* 1st Place */}
          <div className="flex flex-col items-center gap-2 relative -top-4 z-20">
            <div className="material-symbols-outlined text-yellow-400 absolute -top-8 text-3xl drop-shadow-md" style={{fontVariationSettings: "'FILL' 1"}}>workspace_premium</div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 border-4 border-white shadow-md flex items-center justify-center">
              <span className="font-lexend font-bold text-2xl text-white">1</span>
            </div>
            <div className="text-center">
              <p className="font-cafe24 text-lg text-gray-900">22학번</p>
              <p className="font-lexend text-xl text-pink-600 font-bold">2,100</p>
            </div>
          </div>
          {/* 3rd Place */}
          <div className="flex flex-col items-center gap-2 relative top-6">
            <div className="w-14 h-14 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center relative z-10">
              <span className="font-lexend font-bold text-xl text-gray-500">3</span>
            </div>
            <div className="text-center">
              <p className="font-cafe24 text-base text-gray-900">24학번</p>
              <p className="font-lexend text-sm text-pink-600 font-bold">1,620</p>
            </div>
          </div>
        </div>
        {/* List */}
        <div className="flex flex-col px-4 py-2">
          <div className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors px-2 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="font-lexend font-bold text-xl text-gray-400 w-8 text-center">4</span>
              <span className="font-cafe24 text-lg text-gray-900">25학번</span>
            </div>
            <span className="font-lexend text-sm text-gray-500 font-semibold">1,450 pts</span>
          </div>
          <div className="flex items-center justify-between py-4 hover:bg-gray-50 transition-colors px-2 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="font-lexend font-bold text-xl text-gray-400 w-8 text-center">5</span>
              <span className="font-cafe24 text-lg text-gray-900">26학번</span>
            </div>
            <span className="font-lexend text-sm text-gray-500 font-semibold">1,200 pts</span>
          </div>
        </div>
      </div>
    </main>
  )
}
