import React from 'react';
import PageHeader from '../components/PageHeader';
import BoothCard from '../components/BoothCard';

export default function Booths({ data }) {
  const booths = data?.booths || [];

  return (
    <main className="w-full max-w-md mx-auto px-5 pt-8 pb-32">
      <PageHeader title="부스 안내" />

      <div className="flex flex-col gap-4">
        {booths.length === 0 ? (
          <p className="text-center text-gray-400 font-cafe24">준비된 부스가 없습니다.</p>
        ) : (
          booths.map((booth) => {
            let timeStr = '상태 미상';
            if (booth.status === 'in_progress') timeStr = '운영 중';
            else if (booth.status === 'scheduled') timeStr = '준비 중';
            else if (booth.status === 'completed') timeStr = '운영 종료';
            else if (booth.status === 'paused') timeStr = '일시 중지';
            else if (booth.status === 'cancelled') timeStr = '취소됨';
            
            return (
              <BoothCard 
                key={booth.id} 
                title={booth.name}
                location={booth.location || '위치 미정'}
                time={timeStr}
                icon="storefront"
              />
            )
          })
        )}
      </div>
    </main>
  )
}
