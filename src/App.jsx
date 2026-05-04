import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './supabase'
import Home from './pages/Home'
import Events from './pages/Events'
import Booths from './pages/Booths'
import Rankings from './pages/Rankings'
import Info from './pages/Info'
import BottomNav from './components/BottomNav'
import TopNav from './components/TopNav'
import SwipeHint from './components/SwipeHint'

const MobileStickyHeader = ({ currentTab }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentTab]);

  const tabInfo = {
    events: { title: '경기 종목' },
    booths: { title: '부스 안내' },
    rankings: { title: '종합 순위' },
    info: { title: '안내 및 지도' }
  };

  const info = tabInfo[currentTab];
  if (!info) return null;

  // 스크롤이 40px ~ 100px 일 때 서서히 나타남
  const progress = Math.min(Math.max((scrollY - 40) / 60, 0), 1);

  return (
    <div 
      className="md:hidden fixed top-0 left-0 w-full z-40 pointer-events-none"
      style={{
        transform: `translateY(${(progress - 1) * 100}%)`,
      }}
    >
      <div 
        className="relative px-5 h-14 flex items-center justify-center gap-2 pointer-events-auto border-b border-gray-200/50 shadow-sm"
        style={{
          backgroundColor: '#F8F9FA',
          backgroundImage: 'linear-gradient(135deg, rgba(255, 177, 200, 0.04) 0%, rgba(255, 181, 156, 0.04) 100%)'
        }}
      >
        <img 
          src="https://lh3.googleusercontent.com/aida/ADBb0uhmwCYQPn7Vku15jRDlmvR8snwBwpcjqnBhK9iuY8m772rYO4xAd_nLYFHO2-gs-59OWb7YzfX10--4VwNMzlIBOEy5-m-TUEA4kcnuXfEGq-R7OmiEEccql12DPj-tGwzeMLcK4ULvJ4hJf3jXoLdL4OakAT4aNYfVUCpKKIM4NHKjBwytDg4o4bdBnvwYRRUP-VWbigBf4k0mi6XKgy0h8y5RICJBAV2oqf12H9kEOfwDXs3GNj_Ww71L_xNhyfmhajrw9OReJg" 
          alt="로고" 
          className="w-auto h-7 object-contain"
        />
        <span className="font-ginsaeng text-2xl font-black text-gray-900 mt-1.5 tracking-tight">{info.title}</span>
        
        {/* 상단바 아래쪽 컨텐츠가 흐려지며 사라지는 마스크 효과 */}
        <div 
          className="absolute top-full left-0 w-full h-8 pointer-events-none"
          style={{
            backgroundColor: '#F8F9FA',
            backgroundImage: 'linear-gradient(135deg, rgba(255, 177, 200, 0.04) 0%, rgba(255, 181, 156, 0.04) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
            maskImage: 'linear-gradient(to bottom, black, transparent)'
          }}
        ></div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('home')
  const [eventData, setEventData] = useState(null)
  const [scoreboardData, setScoreboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tabKey, setTabKey] = useState(0)

  const handleTabChange = (tab) => {
    if (tab === currentTab) {
      setTabKey(k => k + 1); // 같은 탭 → 컴포넌트 초기화 (부스 상세 → 부스 목록 복귀 등)
      window.scrollTo({ top: 0, behavior: 'smooth' }); // 같은 탭 누르면 맨 위로 스크롤
    } else {
      setCurrentTab(tab);
      window.scrollTo({ top: 0 }); // 다른 탭으로 이동 시 맨 위로
    }
  };

  const tabs = ['home', 'events', 'booths', 'rankings', 'info']
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.indexOf(currentTab)
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        setCurrentTab(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        setCurrentTab(tabs[currentIndex - 1])
      }
    }
  }

  useEffect(() => {
    async function fetchData() {
      const [eventRes, scoreRes] = await Promise.all([
        supabase.rpc('get_public_event_context'),
        supabase.rpc('get_scoreboard')
      ]);
      
      if (eventRes.error) {
        console.error('Error fetching event data:', eventRes.error)
      } else {
        setEventData({ ...eventRes.data, game_advancements: eventRes.data.game_advancements || [] })
      }
      
      if (scoreRes.error) {
        console.error('Error fetching scoreboard:', scoreRes.error)
      } else {
        setScoreboardData(scoreRes.data)
      }
      
      setLoading(false)
    }
    
    fetchData()
    
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderTab = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      )
    }
    
    switch(currentTab) {
      case 'home': return <Home data={eventData} />
      case 'events': return <Events data={eventData} />
      case 'booths': return <Booths data={eventData} />
      case 'rankings': return <Rankings data={eventData} scoreboard={scoreboardData} />
      case 'info': return <Info />
      default: return <Home data={eventData} />
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col font-lexend"
      onTouchStart={onTouchStart} 
      onTouchMove={onTouchMove} 
      onTouchEnd={onTouchEndHandler}
    >
      <TopNav currentTab={currentTab} setCurrentTab={handleTabChange} />
      <MobileStickyHeader currentTab={currentTab} />
      <div className="flex-1 pb-safe">
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${currentTab}-${tabKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav currentTab={currentTab} setCurrentTab={handleTabChange} />
      <SwipeHint />
    </div>
  )
}
