/**
 * useOnVisibilityStateChange Hook
 *
 * Triggers a callback when the browser tab becomes visible again.
 * Used to refresh practice data when the user returns to Roam.
 */
import * as React from 'react';

const useOnVisibilityStateChange = (callback: () => void) => {
  // useRef: 存储 callback 引用，避免 callback 变化导致事件监听器频繁重新注册
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
};

export default useOnVisibilityStateChange;
