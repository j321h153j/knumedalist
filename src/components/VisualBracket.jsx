import React from 'react';

const getTeamColor = (name) => {
  if (!name) return 'bg-gray-100 text-gray-400 border-gray-200';
  if (name.includes('22')) return 'bg-[#1d4ed8] text-white border-blue-800'; // 진파랑
  if (name.includes('23')) return 'bg-[#bfdbfe] text-blue-900 border-blue-400'; // 연파랑
  if (name.includes('24')) return 'bg-[#3b82f6] text-white border-blue-600'; // 중간파랑
  if (name.includes('25')) return 'bg-[#ef4444] text-white border-red-700'; // 빨강
  if (name.includes('26')) return 'bg-[#f9a8d4] text-pink-900 border-pink-400'; // 핑크
  return 'bg-[#fef08a] text-yellow-800 border-yellow-400'; // 기타
};

const TeamCard = ({ teamId, teams, badge, isWinner, isLoser, score, defaultName }) => {
  const team = teams?.find(t => t.id === teamId);
  const name = team ? team.name : (defaultName || '미정');
  const colorClass = getTeamColor(team ? name : null);
  
  return (
    <div className={`flex flex-col flex-1 items-center gap-2 relative ${isLoser ? 'opacity-50 grayscale' : ''}`}>
      {badge && (
        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-lexend whitespace-nowrap absolute -top-5">
          {badge}
        </span>
      )}
      <div className={`w-full py-3 rounded-xl shadow-sm font-cafe24 text-sm md:text-base text-center border-b-4 transition-all ${colorClass} ${isWinner ? 'ring-2 ring-pink-400 ring-offset-2' : ''}`}>
        {name}
      </div>
      {(score != null || isWinner || isLoser) && (
        <div className="flex items-center gap-2 mt-1 min-h-[24px]">
          {score != null && <span className="font-lexend font-bold text-gray-800 text-lg">{score}</span>}
          {isWinner && <span className="bg-pink-100 text-pink-600 text-[10px] font-bold px-1.5 py-0.5 rounded">WIN</span>}
        </div>
      )}
    </div>
  );
};

const MatchBlock = ({ game, result, leftBadge, rightBadge, teams }) => {
  if (!game) return null;
  const isCompleted = game.status === 'completed';
  const isLeftWin = isCompleted && result?.winner_team_id === result?.left_team_id;
  const isRightWin = isCompleted && result?.winner_team_id === result?.right_team_id;

  return (
    <div className="flex flex-col relative bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-[0px_5px_15px_rgba(0,0,0,0.02)]">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs text-gray-400 font-lexend">{game.title}</span>
        {game.status === 'in_progress' && (
          <span className="text-[10px] text-green-600 font-bold flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
            </span>
            진행 중
          </span>
        )}
        {isCompleted && <span className="text-[10px] text-gray-400 font-bold">종료</span>}
      </div>
      
      <div className="flex items-start justify-center gap-3 md:gap-4">
        <TeamCard 
          teamId={result?.left_team_id} teams={teams} 
          badge={leftBadge} isWinner={isLeftWin} isLoser={isCompleted && !isLeftWin} score={result?.left_score}
        />
        <div className="flex flex-col items-center justify-center pt-2">
          <span className="font-lexend font-black text-gray-200 text-lg md:text-xl">VS</span>
        </div>
        <TeamCard 
          teamId={result?.right_team_id} teams={teams} 
          badge={rightBadge} isWinner={isRightWin} isLoser={isCompleted && !isRightWin} score={result?.right_score}
        />
      </div>
    </div>
  );
};

export default function VisualBracket({ games, results, advancements, teams }) {
  // 1. Identify Games by Round
  const finalGame = games.find(g => g.round === '결승');
  const semiGame = games.find(g => g.round === '부결승' || g.round === '준결승');
  const prelimGames = games.filter(g => g.round === '예선' || g.round === '8강' || g.round === '4강').filter(g => g.id !== semiGame?.id && g.id !== finalGame?.id);

  if (!finalGame) return <div className="text-center text-gray-400 font-cafe24 mt-4">대진표 데이터가 없습니다.</div>;

  // 2. Extract specific roles from advancements & results
  const finalRes = results.find(r => r.game_id === finalGame?.id);
  const semiRes = results.find(r => r.game_id === semiGame?.id);

  // 결승 직행자 (better_winner)가 배정되는 슬롯
  const finalBetterSlot = advancements?.find(a => a.to_game_id === finalGame?.id && a.rule_type === 'better_winner')?.to_slot || 'left';
  // 예선 승자 (weaker_winner)가 배정되는 부결승 슬롯
  const semiWeakerSlot = advancements?.find(a => a.to_game_id === semiGame?.id && a.rule_type === 'weaker_winner')?.to_slot || 'left';
  
  // 나머지 슬롯은 각각 부결승 승자(결승)와 예선 부전승 팀(부결승)
  const semiByeSlot = semiWeakerSlot === 'left' ? 'right' : 'left';

  // 실제 배정된 팀 ID
  const directToFinalTeamId = finalRes ? finalRes[`${finalBetterSlot}_team_id`] : null;
  const firstByeTeamId = semiRes ? semiRes[`${semiByeSlot}_team_id`] : null;

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '';

  return (
    <div className="w-full flex flex-col gap-6 py-2 pb-8 bg-[#fdfdfd] rounded-2xl">
      
      {/* 🏆 결승 블록 */}
      {finalGame && (
        <div className="flex flex-col gap-3 px-1 md:px-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl drop-shadow-sm">🏆</span>
            <h4 className="font-cafe24 text-lg text-gray-900">최종 결승</h4>
          </div>
          <MatchBlock 
            game={finalGame} result={finalRes} teams={teams}
            leftBadge={finalBetterSlot === 'left' ? "예선 득실차 1위" : "부결승 승리"}
            rightBadge={finalBetterSlot === 'right' ? "예선 득실차 1위" : "부결승 승리"}
          />
        </div>
      )}

      {/* 🚀 결승 직행팀 배너 */}
      {directToFinalTeamId && (
        <div className="flex items-center justify-center my-1 px-1 md:px-2">
          <div className="bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-100 rounded-xl px-4 py-3 shadow-sm flex items-start gap-3 w-full">
            <span className="text-xl">🚀</span>
            <div className="flex flex-col">
              <span className="font-lexend text-[11px] text-pink-500 font-bold mb-0.5">2차 부전승 (결승 직행)</span>
              <span className="font-cafe24 text-sm text-gray-800 leading-snug">
                <span className="text-pink-600 font-bold">{getTeamName(directToFinalTeamId)}</span>은(는) 예선 승자 중 더 좋은 성적으로 결승에 직행했습니다!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🥈 부결승 블록 */}
      {semiGame && (
        <div className="flex flex-col gap-3 mt-2 px-1 md:px-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl drop-shadow-sm">🥈</span>
            <h4 className="font-cafe24 text-lg text-gray-900">부결승</h4>
          </div>
          <MatchBlock 
            game={semiGame} result={semiRes} teams={teams}
            leftBadge={semiWeakerSlot === 'left' ? "예선 승리팀" : "1차 부전승 직행팀"}
            rightBadge={semiWeakerSlot === 'right' ? "예선 승리팀" : "1차 부전승 직행팀"}
          />
        </div>
      )}

      {/* 🎁 1차 부전승 배너 */}
      {firstByeTeamId && (
        <div className="flex items-center justify-center my-1 px-1 md:px-2">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 shadow-sm flex items-start gap-3 w-full">
            <span className="text-xl">🎁</span>
            <div className="flex flex-col">
              <span className="font-lexend text-[11px] text-blue-500 font-bold mb-0.5">1차 부전승 (예선 면제)</span>
              <span className="font-cafe24 text-sm text-gray-800 leading-snug">
                <span className="text-blue-600 font-bold">{getTeamName(firstByeTeamId)}</span>은(는) 사전 추첨을 통해 부결승으로 직행했습니다.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 🥉 예선 블록 */}
      {prelimGames.length > 0 && (
        <div className="flex flex-col gap-3 mt-2 px-1 md:px-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl drop-shadow-sm">🥉</span>
            <h4 className="font-cafe24 text-lg text-gray-900">예선전</h4>
          </div>
          <div className="flex flex-col gap-4">
            {prelimGames.map(pg => (
              <MatchBlock 
                key={pg.id}
                game={pg} result={results.find(r => r.game_id === pg.id)} teams={teams}
                leftBadge="예선 참가" rightBadge="예선 참가"
              />
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}
