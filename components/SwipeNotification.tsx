// frontend/components/SwipeNotification.tsx
import { useState, useRef } from 'react';

interface SwipeNotificationProps {
  message: any;
  onSwipe: () => void;
}

export default function SwipeNotification({ message, onSwipe }: SwipeNotificationProps) {
  const [slideX, setSlideX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    setSlideX(Math.max(0, Math.min(diff, 200)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (slideX > 150) {
      onSwipe();
      setSlideX(0);
    } else {
      setSlideX(0);
    }
  };

  return (
    <div className="swipe-container" style={{ margin: '10px 0' }}>
      <div style={{ position: 'relative', background: '#4CAF50', height: '60px', borderRadius: '8px', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '60px',
            height: '100%',
            background: '#fff',
            transform: `translateX(${slideX}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span style={{ fontSize: '24px' }}>👉</span>
        </div>
        <div style={{ position: 'absolute', left: '80px', top: '50%', transform: 'translateY(-50%)', color: '#fff', fontWeight: 'bold' }}>
          {message.message}
        </div>
        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#fff' }}>
          {message.next_status}
        </div>
      </div>
    </div>
  );
}