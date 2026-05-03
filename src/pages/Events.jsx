import React from 'react';
import PageHeader from '../components/PageHeader';
import EventCard from '../components/EventCard';

const formatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default function Events({ data }) {
  const games = data?.games || [];
  const teams = data?.teams || [];
  const results = data?.game_results || [];

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '팀 미정';
  
  const getMatchup = (gameId) => {
    const res = results.find(r => r.game_id === gameId);
    if (!res) return '대진표 미정';
    return `${getTeamName(res.left_team_id)} vs ${getTeamName(res.right_team_id)}`;
  };

  const getScore = (gameId) => {
    const res = results.find(r => r.game_id === gameId);
    if (!res) return { left: 0, right: 0 };
    return { left: res.left_score || 0, right: res.right_score || 0 };
  };

  const getIcon = (sport) => {
    if (!sport) return 'emoji_events';
    const s = sport.toLowerCase();
    if (s.includes('농구') || s.includes('basketball')) return 'sports_basketball';
    if (s.includes('축구') || s.includes('풋살') || s.includes('soccer')) return 'sports_soccer';
    if (s.includes('피구') || s.includes('dodgeball')) return 'sports_volleyball'; 
    if (s.includes('줄다리기')) return 'front_hand';
    if (s.includes('계주') || s.includes('달리기') || s.includes('relay')) return 'directions_run';
    return 'emoji_events';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      return formatter.format(new Date(timeString));
    } catch(e) { return ''; }
  };

  const sortedGames = [...games].sort((a, b) => new Date(a.scheduled_start_time) - new Date(b.scheduled_start_time));

  return (
    <main className="w-full max-w-md mx-auto px-5 pt-8 pb-32">
      <PageHeader title="경기 종목" />
      
      <div className="flex flex-col gap-4">
        {sortedGames.length === 0 ? (
          <p className="text-center text-gray-400 font-cafe24">예정된 경기가 없습니다.</p>
        ) : (
          sortedGames.map((game) => {
            const scores = getScore(game.id);
            const timeStr = formatTime(game.scheduled_start_time) ? `${formatTime(game.scheduled_start_time)} - ${formatTime(game.scheduled_end_time)}` : '시간 미정';
            return (
              <EventCard 
                key={game.id} 
                icon={getIcon(game.sport)}
                sportType={game.sport || 'EVENT'}
                title={game.title}
                matchup={getMatchup(game.id)}
                location={game.location || '장소 미정'}
                time={timeStr}
                status={game.status}
                scoreLeft={scores.left}
                scoreRight={scores.right}
              />
            )
          })
        )}
      </div>
    </main>
  )
}
