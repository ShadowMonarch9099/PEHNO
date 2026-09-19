/**
 * While any garment is still classifying, re-fetch those rows every few seconds.
 * Stops on its own once everything is complete/failed or the screen unfocuses.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWardrobeStore } from '../store';

const INTERVAL_MS = 3000;

export function usePendingPoll() {
  const pollPending = useWardrobeStore((s) => s.pollPending);
  const hasPending = useWardrobeStore((s) => s.garments.some((g) => g.classification_status === 'pending'));
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    if (!focused || !hasPending) return;
    let cancelled = false;
    const tick = async () => {
      const more = await pollPending();
      if (!cancelled && more) timer.current = setTimeout(tick, INTERVAL_MS);
    };
    timer.current = setTimeout(tick, INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [focused, hasPending, pollPending]);
}
