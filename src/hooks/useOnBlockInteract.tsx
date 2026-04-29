import React from 'react';

const SELECTOR = 'div.ls-block';

const useOnBlockInteract = ({
  onEnterCallback,
  onLeaveCallback,
}: {
  onEnterCallback: (_elm: HTMLElement) => void;
  onLeaveCallback: (_elm: HTMLElement) => void;
}) => {
  React.useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = (e.target as HTMLElement).closest(SELECTOR) as HTMLElement;
      if (target) {
        onEnterCallback(target);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = (e.target as HTMLElement).closest(SELECTOR) as HTMLElement;
      if (target) {
        onLeaveCallback(target);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [onEnterCallback, onLeaveCallback]);
};

export default useOnBlockInteract;
