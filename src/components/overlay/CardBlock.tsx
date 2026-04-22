import * as React from 'react';
import { Breadcrumbs as BreadcrumbsType } from '~/queries';
import styled from '@emotion/styled';
import * as domUtils from '~/utils/dom';
import * as asyncUtils from '~/utils/async';
import { Icon } from '@blueprintjs/core';
import useCloze from '~/hooks/useCloze';
import { colors } from '~/theme';

const CardBlock = ({
  refUid,
  showAnswers,
  setHasCloze,
  breadcrumbs,
  showBreadcrumbs,
  onRenderComplete,
  hideChildren,
}: {
  refUid: string;
  showAnswers: boolean;
  setHasCloze: (hasCloze: boolean) => void;
  breadcrumbs: BreadcrumbsType[];
  showBreadcrumbs: boolean;
  onRenderComplete?: () => void;
  hideChildren?: boolean;
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [renderedBlockElm, setRenderedBlockElm] = React.useState<HTMLElement | null>(null);
  useCloze({ renderedBlockElm: renderedBlockElm as HTMLElement, hasClozeCallback: setHasCloze });

  const [forceUpdate, setForceUpdate] = React.useState(0);

  const refUidRef = React.useRef(refUid);

  const observerRef = React.useRef<MutationObserver | null>(null);

  const registeredTextareasRef = React.useRef<Set<HTMLTextAreaElement>>(new Set());

  React.useEffect(() => {
    refUidRef.current = refUid;
  }, [refUid]);

  const debouncedFnRef = React.useRef<(() => void) | null>(null);

  const handleBlockBlur = React.useCallback(() => {
    const dialog = ref.current?.closest('[role="dialog"]');
    if (dialog) return;

    setForceUpdate((prev) => {
      return prev + 1;
    });
  }, []);

  React.useEffect(() => {
    const renderBlock = async () => {
      const currentRefUid = refUidRef.current;
      if (!ref.current) return;

      await window.roamAlphaAPI.ui.components.unmountNode({ el: ref.current });
      await window.roamAlphaAPI.ui.components.renderBlock({ uid: currentRefUid, el: ref.current });

      const roamBlockElm = ref.current.querySelector('.rm-block') as HTMLElement | null;
      setRenderedBlockElm(roamBlockElm);
      const isCollapsed = roamBlockElm?.classList.contains('rm-block--closed');
      if (isCollapsed) {
        const expandControlBtn = ref.current.querySelector('.block-expand .rm-caret');
        domUtils.simulateMouseClick(expandControlBtn);
        await asyncUtils.sleep(100);
        domUtils.simulateMouseClick(expandControlBtn);
      }

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof HTMLElement) {
                const newTextareas = node.querySelectorAll('textarea');
                if (newTextareas.length > 0) {
                  newTextareas.forEach((textarea) => {
                  textarea.removeEventListener('blur', handleBlockBlur);
                  textarea.addEventListener('blur', handleBlockBlur);
                  registeredTextareasRef.current.add(textarea);
                });
                }
              }
            });
          }
        });
      });

      observer.observe(ref.current, { childList: true, subtree: true });
      observerRef.current = observer;

      onRenderComplete?.();
    };

    debouncedFnRef.current = asyncUtils.debounce(renderBlock, 100);

    return () => {
      debouncedFnRef.current = null;

      registeredTextareasRef.current.forEach((textarea) => {
        textarea.removeEventListener('blur', handleBlockBlur);
      });
      registeredTextareasRef.current.clear();

      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [handleBlockBlur]);

  React.useEffect(() => {
    if (debouncedFnRef.current) {
      debouncedFnRef.current();
    }
  }, [refUid, forceUpdate]);

  return (
    <div>
      {breadcrumbs && showBreadcrumbs && <Breadcrumbs breadcrumbs={breadcrumbs} />}
      <ContentWrapper ref={ref} showAnswers={showAnswers} hideChildren={hideChildren}></ContentWrapper>
    </div>
  );
};

const ContentWrapper = styled.div<{
  showAnswers: boolean;
  hideChildren?: boolean;
}>`
  position: relative;
  left: -14px;
  width: calc(100% + 19px);

  & .rm-block-children {
    display: ${(props) => (props.showAnswers && !props.hideChildren) ? 'flex' : 'none'};
  }

  & .rm-block-separator {
    min-width: unset;
  }

  .roam-memo-cloze {
    background-color: ${(props) => (props.showAnswers ? colors.clozeVisible : colors.clozeHidden)};
    color: ${(props) => (props.showAnswers ? 'inherit' : 'transparent')};
    overflow: hidden;
    border-radius: 2px;
    padding: 0;
    margin: 0;
  }
`;

const Breadcrumbs = ({ breadcrumbs }) => {
  const items = breadcrumbs.map((breadcrumb, index) => ({
    current: index === breadcrumbs.length - 1,
    text: breadcrumb.title || breadcrumb.string,
  }));
  return (
    <BreadCrumbWrapper className="rm-zoom zoom-path-view">
      {items.map((item, i) => (
        <div key={i} className="rm-zoom-item">
          <span className="rm-zoom-item-content">{item.text}</span>{' '}
          {i !== items.length - 1 && <Icon icon="chevron-right" />}
        </div>
      ))}
    </BreadCrumbWrapper>
  );
};

const BreadCrumbWrapper = styled.div`
  opacity: 0.7;
  margin-left: 8px !important;
  margin-top: -4px !important;

  &.rm-zoom-item {
    cursor: auto !important;
  }
`;

export default React.memo(CardBlock);
