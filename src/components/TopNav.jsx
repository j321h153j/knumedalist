export default function TopNav({ currentTab, setCurrentTab }) {
  return (
    <header className="hidden md:flex sticky top-0 w-full z-50 px-5 h-16 items-center justify-between bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 font-lexend font-bold tracking-tight">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-pink-500" style={{ fontVariationSettings: "'FILL' 1" }}>sports_score</span>
        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">SPORTS FESTIVAL</span>
      </div>
      <div className="flex items-center gap-4">
        <nav className="flex gap-6">
          {['home', 'events', 'booths', 'rankings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`font-bold transition-opacity active:scale-95 duration-200 uppercase ${
                currentTab === tab ? 'text-pink-600' : 'text-gray-500 hover:opacity-80'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-500 text-sm">person</span>
        </div>
      </div>
    </header>
  )
}
