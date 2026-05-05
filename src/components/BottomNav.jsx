import { motion } from 'framer-motion';

export default function BottomNav({ currentTab, setCurrentTab }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'events', icon: 'sports_basketball', label: 'Events' },
    { id: 'booths', icon: 'storefront', label: 'Booths' },
    { id: 'rankings', icon: 'leaderboard', label: 'Rankings' },
    { id: 'info', icon: 'map', label: 'Info' },
  ]

  const currentIndex = tabs.findIndex(t => t.id === currentTab);
  const isHome = currentTab === 'home';

  const navBg = isHome 
    ? 'border-gray-900 shadow-[0_-10px_40px_rgba(236,72,153,0.15)]' 
    : 'border-gray-100 shadow-[0px_-4px_20px_rgba(0,0,0,0.05)]';
  const navStyle = {
    backgroundColor: isHome ? 'rgba(10, 10, 10, 0.92)' : 'rgba(255, 255, 255, 0.96)',
  };

  const activeIndicatorColor = isHome ? '#f472b6' : '#ec4899'; // Lighter pink in dark mode
  const inactiveIndicatorColor = isHome ? '#374151' : '#d1d5db';

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 w-full z-50 flex flex-col items-center px-4 pb-safe border-t rounded-t-2xl backdrop-blur-xl transition-colors duration-300 ${navBg}`}
      style={navStyle}
    >
      {/* Tab Indicator Dots */}
      <div className="flex items-center gap-2 pt-2 pb-1">
        {tabs.map((tab, idx) => (
          <motion.div
            key={tab.id}
            animate={{
              width: idx === currentIndex ? 16 : 6,
              backgroundColor: idx === currentIndex ? activeIndicatorColor : inactiveIndicatorColor,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="h-[5px] rounded-full"
          />
        ))}
      </div>

      {/* Nav Buttons */}
      <div className="flex justify-around items-center w-full h-16">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          
          let btnClass = '';
          if (isHome) {
            btnClass = isActive 
              ? 'text-pink-400 bg-pink-500/10 shadow-[inset_0_0_10px_rgba(236,72,153,0.2)] rounded-xl' 
              : 'text-gray-500 hover:text-pink-300';
          } else {
            btnClass = isActive 
              ? 'text-pink-500 bg-pink-50 rounded-xl' 
              : 'text-gray-400 hover:text-pink-400';
          }

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center px-1 sm:px-2 py-1.5 mx-0.5 sm:mx-1 transition-all duration-300 active:scale-90 ${btnClass}`}
            >
              <span 
                className="material-symbols-outlined mb-1 transition-colors duration-300" 
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
      </div>
    </nav>
  )
}
