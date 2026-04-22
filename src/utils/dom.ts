/**
 * DOM Utilities
 *
 * simulateMouseClick: Dispatches a full mouse click event sequence
 * (mouseenter → mouseover → mousedown → click → mouseup)
 * Used to programmatically interact with Roam's DOM elements
 * (e.g., expanding collapsed blocks where no API exists)
 */
export const simulateMouseEvents = (element, events: string[] = []) => {
  events.forEach((mouseEventType) =>
    element.dispatchEvent(
      new MouseEvent(mouseEventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1,
      })
    )
  );
};
export const simulateMouseClick = (element) => {
  const mouseClickEvents = ['mouseenter', 'mouseover', 'mousedown', 'click', 'mouseup'];
  simulateMouseEvents(element, mouseClickEvents);
};

export const collapseBlockOnPage = (uid: string) => {
  const textareas = Array.from(document.querySelectorAll(`textarea[id="${uid}"]`));
  for (const textarea of textareas) {
    if (textarea.closest('[role="dialog"]')) continue;
    const blockContainer = textarea.closest('.rm-block-container');
    if (!blockContainer) continue;
    const caret = blockContainer.querySelector('.rm-caret-open');
    if (caret) simulateMouseClick(caret);
    break;
  }
};
