export default function TopNav({ currentTab, setCurrentTab }) {
  const isHome = currentTab === 'home';

  const navBg = isHome 
    ? 'border-gray-900 shadow-[0_10px_40px_rgba(236,72,153,0.15)]' 
    : 'border-gray-100 shadow-sm';
  const navStyle = {
    backgroundColor: isHome ? 'rgba(10, 10, 10, 0.92)' : 'rgba(255, 255, 255, 0.96)',
  };

  const profileBg = isHome ? 'bg-gray-800' : 'bg-gray-200';
  const profileIcon = isHome ? 'text-gray-400' : 'text-gray-500';

  return (
    <header
      className={`hidden md:flex sticky top-0 w-full z-50 px-5 h-16 items-center justify-between backdrop-blur-md border-b font-lexend font-bold tracking-tight transition-colors duration-300 ${navBg}`}
      style={navStyle}
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-pink-500 transition-colors duration-300" style={{ fontVariationSettings: "'FILL' 1" }}>sports_score</span>
        <span className="text-2xl font-ginsaeng tracking-widest mt-1">
          <span className={`transition-colors duration-300 ${isHome ? 'text-white/50' : 'text-gray-400'}`}>우리들의 </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">올림픽</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <nav className="flex gap-6">
          {['home', 'events', 'booths', 'rankings', 'info'].map((tab) => {
            const isActive = currentTab === tab;
            let textStyle = '';
            if (isHome) {
              textStyle = isActive ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'text-gray-500 hover:text-pink-300';
            } else {
              textStyle = isActive ? 'text-pink-600' : 'text-gray-500 hover:text-pink-400';
            }

            return (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`font-bold transition-all active:scale-95 duration-300 uppercase ${textStyle}`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
        <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-colors duration-300 ${profileBg}`}>
          <span className={`material-symbols-outlined text-sm transition-colors duration-300 ${profileIcon}`}>person</span>
        </div>
      </div>
    </header>
  )
}
