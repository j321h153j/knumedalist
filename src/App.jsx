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
  const [cardNewsData, setCardNewsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabKey, setTabKey] = useState(0)

  const handleTabChange = (tab) => {
    if (tab === currentTab) {
      setTabKey(k => k + 1); // 같은 탭 → 컴포넌트 초기화 (부스 상세 → 부스 목록 복귀 등)
      window.scrollTo({ top: 0, behavior: 'smooth' }); // 같은 탭 누르면 맨 위로 스크롤
    } else {
      // 홈이 아닌 탭으로 이동 시 히스토리에 기록 (뒤로가기 제어용)
      if (tab !== 'home') {
        window.history.pushState({ tab }, '');
      }
      setCurrentTab(tab);
      window.scrollTo({ top: 0 }); // 다른 탭으로 이동 시 맨 위로
    }
  };

  useEffect(() => {
    const handlePopState = (e) => {
      // 1. 만약 뒤로가기 결과가 '모달' 상태라면, 해당 컴포넌트에서 처리하도록 둡니다.
      if (e.state?.modal) return;

      // 2. 만약 히스토리에 특정 '탭' 정보가 있다면 해당 탭으로 이동합니다.
      if (e.state?.tab) {
        setCurrentTab(e.state.tab);
      } 
      // 3. 히스토리 상태가 없거나(초기 상태) 다른 경우, 현재 홈이 아니라면 홈으로 복귀합니다.
      else if (currentTab !== 'home') {
        setCurrentTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentTab]);

  const tabs = ['home', 'events', 'booths', 'rankings', 'info']
  const [touchStart, setTouchStart] = useState({ x: null, y: null })
  const [touchEnd, setTouchEnd] = useState({ x: null, y: null })

  const minSwipeDistance = 70 // 스와이프 민감도 약간 하향

  const onTouchStart = (e) => {
    setTouchEnd({ x: null, y: null })
    setTouchStart({ 
      x: e.targetTouches[0].clientX, 
      y: e.targetTouches[0].clientY 
    })
  }

  const onTouchMove = (e) => {
    setTouchEnd({ 
      x: e.targetTouches[0].clientX, 
      y: e.targetTouches[0].clientY 
    })
  }

  const onTouchEndHandler = () => {
    if (!touchStart.x || !touchEnd.x || !touchStart.y || !touchEnd.y) return
    
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    
    // 수평 이동 거리가 수직 이동 거리보다 확실히 클 때만 (대략 2배) 스와이프로 인정
    // 이렇게 하면 수직 스크롤 중에 실수로 탭이 넘어가는 것을 방지할 수 있습니다.
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY) * 2

    if (isHorizontal && (isLeftSwipe || isRightSwipe)) {
      const currentIndex = tabs.indexOf(currentTab)
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        handleTabChange(tabs[currentIndex + 1])
      }
      if (isRightSwipe && currentIndex > 0) {
        handleTabChange(tabs[currentIndex - 1])
      }
    }
  }

  useEffect(() => {
    async function fetchData() {
      const [eventRes, scoreRes, cardRes] = await Promise.all([
        supabase.rpc('get_public_event_context'),
        supabase.rpc('get_scoreboard'),
        supabase.from('card_news').select('*').order('order_index', { ascending: true })
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

      if (cardRes.error) {
        console.error('Error fetching card news:', cardRes.error)
      } else {
        setCardNewsData(cardRes.data)
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
      case 'info': return <Info cardNews={cardNewsData} />
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
