export default function BottomNav({ currentTab, setCurrentTab }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'events', icon: 'sports_basketball', label: 'Events' },
    { id: 'booths', icon: 'storefront', label: 'Booths' },
    { id: 'rankings', icon: 'leaderboard', label: 'Rankings' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-safe h-20 bg-white border-t border-gray-100 shadow-[0px_-4px_20px_rgba(0,0,0,0.05)] rounded-t-2xl">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex flex-col items-center justify-center px-4 py-1.5 transition-all duration-150 active:scale-90 ${
              isActive 
                ? 'text-pink-500 bg-pink-50 rounded-xl' 
                : 'text-gray-400 hover:text-pink-400'
            }`}
          >
            <span 
              className="material-symbols-outlined mb-1" 
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            <span className="font-lexend text-[10px] font-medium uppercase tracking-wider">
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
