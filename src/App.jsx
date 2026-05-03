import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Home from './pages/Home'
import Events from './pages/Events'
import Booths from './pages/Booths'
import Rankings from './pages/Rankings'
import BottomNav from './components/BottomNav'
import TopNav from './components/TopNav'

export default function App() {
  const [currentTab, setCurrentTab] = useState('home')
  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.rpc('get_public_event_context')
      if (error) {
        console.error('Error fetching data:', error)
      } else {
        setEventData(data)
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
      case 'rankings': return <Rankings data={eventData} />
      default: return <Home data={eventData} />
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-lexend">
      <TopNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="flex-1 pb-safe relative z-10">
        {renderTab()}
      </div>
      <BottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  )
}
