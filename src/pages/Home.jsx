import React from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main className="relative w-full h-[100dvh] md:h-[calc(100vh-64px)] bg-black flex flex-col items-center justify-center overflow-hidden">
      
      {/* 배경 포스터 (흐릿하게 처리하여 감성적인 분위기 연출) */}
      <div className="absolute inset-0 z-0 opacity-40 blur-[4px]">
        <img 
          src="/poster.jpg" 
          className="w-full h-full object-cover md:object-contain scale-110" 
          alt="festival background" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/70 to-black" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg"
      >
        {/* 축하 아이콘 애니메이션 */}
        <motion.div 
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          className="w-[15vw] h-[15vw] max-w-[80px] max-h-[80px] min-w-[60px] min-h-[60px] bg-white/10 backdrop-blur-3xl rounded-[30%] border border-white/20 flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(236,72,153,0.3)]"
        >
          <span className="material-symbols-outlined text-[32px] md:text-[40px] text-pink-400" style={{fontVariationSettings: "'FILL' 1"}}>celebration</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full"
        >
          <h1 className="font-cafe24 text-[7.5vw] md:text-5xl font-black text-white mb-6 tracking-tighter leading-tight drop-shadow-2xl whitespace-nowrap" style={{ fontSize: 'clamp(24px, 7.5vw, 52px)' }}>
            운동회가 종료되었습니다
          </h1>
        </motion.div>

        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "80%" }}
          transition={{ delay: 0.8, duration: 1 }}
          className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-12 mx-auto" 
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="flex flex-col items-center"
        >
          <h2 className="font-cafe24 text-[6vw] md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-orange-400 to-pink-400 animate-gradient-x mb-3 whitespace-nowrap" style={{ fontSize: 'clamp(18px, 6vw, 32px)' }}>
            내년에 다시 만나요!
          </h2>
          <p className="font-lexend text-[2.5vw] md:text-[12px] text-white/40 uppercase tracking-[0.4em] font-black" style={{ fontSize: 'clamp(8px, 2.5vw, 12px)' }}>
            See you next year
          </p>
        </motion.div>
      </motion.div>

    </main>
  );
}

