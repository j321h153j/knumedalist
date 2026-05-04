import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SwipeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // localStorage로 최초 1회만 표시
    const hasSeenHint = localStorage.getItem('swipe_hint_seen');
    if (!hasSeenHint) {
      // 약간의 딜레이 후 표시 (페이지 로딩 완료 후)
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('swipe_hint_seen', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={dismiss}
          className="md:hidden fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-white rounded-[28px] px-8 py-10 mx-8 flex flex-col items-center gap-6 shadow-2xl max-w-[320px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 스와이프 제스처 애니메이션 */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* 좌우 화살표 트랙 */}
              <div className="absolute w-full h-[2px] bg-gray-200 rounded-full" />
              
              {/* 왼쪽 화살표 */}
              <motion.span
                animate={{ x: [-8, -16, -8], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="material-symbols-outlined text-gray-400 text-[24px] absolute left-0"
              >
                chevron_left
              </motion.span>

              {/* 움직이는 손가락 */}
              <motion.div
                animate={{ x: [0, 30, 0, -30, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                className="relative z-10"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>swipe</span>
                </div>
              </motion.div>

              {/* 오른쪽 화살표 */}
              <motion.span
                animate={{ x: [8, 16, 8], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="material-symbols-outlined text-gray-400 text-[24px] absolute right-0"
              >
                chevron_right
              </motion.span>
            </div>

            {/* 텍스트 */}
            <div className="text-center">
              <p className="font-cafe24 text-lg text-gray-900 font-bold">좌우로 스와이프해 보세요!</p>
              <p className="font-lexend text-sm text-gray-400 mt-2">탭 사이를 빠르게 이동할 수 있어요</p>
            </div>

            {/* 닫기 버튼 */}
            <button 
              onClick={dismiss}
              className="bg-gradient-to-r from-pink-500 to-orange-400 text-white font-cafe24 font-bold px-8 py-3 rounded-full text-sm shadow-md active:scale-95 transition-transform"
            >
              알겠어요!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
