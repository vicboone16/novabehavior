import { useSwipeable } from 'react-swipeable';
import { useLongPress } from 'use-long-press';
import { useCallback, useRef, useState } from 'react';

export type SwipeDirection = 'right' | 'left' | 'up';
export type GestureFeedback = 'correct' | 'incorrect' | 'prompted' | 'duration' | null;

interface UseGestureDataOptions {
  onSwipeRight?: () => void;  // correct
  onSwipeLeft?: () => void;   // incorrect / no-response
  onSwipeUp?: () => void;     // prompted
  onLongPress?: () => void;   // duration toggle
  onTwoFingerTap?: () => void; // ABC popup
  disabled?: boolean;
}

export function useGestureData({
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  onLongPress,
  onTwoFingerTap,
  disabled = false,
}: UseGestureDataOptions) {
  const [feedback, setFeedback] = useState<GestureFeedback>(null);
  const touchCountRef = useRef(0);

  const flash = (type: GestureFeedback) => {
    setFeedback(type);
    setTimeout(() => setFeedback(null), 400);
    if (navigator.vibrate) navigator.vibrate(type === 'incorrect' ? [30, 20, 30] : 25);
  };

  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (disabled || !onSwipeRight) return;
      flash('correct');
      onSwipeRight();
    },
    onSwipedLeft: () => {
      if (disabled || !onSwipeLeft) return;
      flash('incorrect');
      onSwipeLeft();
    },
    onSwipedUp: () => {
      if (disabled || !onSwipeUp) return;
      flash('prompted');
      onSwipeUp();
    },
    delta: 40,
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
  });

  const longPressHandlers = useLongPress(
    useCallback(() => {
      if (disabled || !onLongPress) return;
      flash('duration');
      onLongPress();
    }, [disabled, onLongPress]),
    {
      threshold: 500,
      onStart: () => {
        if (navigator.vibrate) navigator.vibrate(10);
      },
    }
  );

  // Two-finger tap via onTouchStart
  const twoFingerProps = onTwoFingerTap
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          touchCountRef.current = e.touches.length;
        },
        onTouchEnd: (e: React.TouchEvent) => {
          if (touchCountRef.current === 2 && !disabled) {
            e.preventDefault();
            onTwoFingerTap();
          }
          touchCountRef.current = 0;
        },
      }
    : {};

  return { swipeHandlers, longPressHandlers, twoFingerProps, feedback };
}

export const FEEDBACK_STYLES: Record<NonNullable<GestureFeedback>, string> = {
  correct: 'ring-2 ring-green-500 bg-green-100 dark:bg-green-900/30',
  incorrect: 'ring-2 ring-red-500 bg-red-100 dark:bg-red-900/30',
  prompted: 'ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/30',
  duration: 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/30',
};
