/**
 * Async Utilities
 *
 * sleep: Promise-based delay
 * debounce: Delay function execution until after a period of inactivity
 */
export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const debounce = (func, timeout = 300) => {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
  // cancel: 允许在组件卸载时取消待执行的延迟调用
  debounced.cancel = () => {
    clearTimeout(timer);
  };
  return debounced;
};
