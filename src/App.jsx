import { useState } from 'react'
import Home from './pages/Home'
import Events from './pages/Events'
import Booths from './pages/Booths'
import Rankings from './pages/Rankings'
import BottomNav from './components/BottomNav'
import TopNav from './components/TopNav'

export default function App() {
  const [currentTab, setCurrentTab] = useState('home')

  const renderTab = () => {
    switch(currentTab) {
      case 'home': return <Home />
      case 'events': return <Events />
      case 'booths': return <Booths />
      case 'rankings': return <Rankings />
      default: return <Home />
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
