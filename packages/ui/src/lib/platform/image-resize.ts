import { clampImageWidth, minimumImageWidth } from 'shared/markdown-images';

type ResizeOptions = {
  blocks?: unknown;
  onresize?: (index: number, width: number) => void;
};
/** Enhance only editable previews. Published Markdown has no editing controls. */
export function imageResize(node: HTMLElement, options: ResizeOptions) {
  let cleanup = () => {};
  let focusAfterResize: number | undefined;
  function setup(current: ResizeOptions) {
    cleanup();
    const disposers: (() => void)[] = [];
    if (current.onresize) {
      for (const image of node.querySelectorAll<HTMLImageElement>('img[data-ksi-image]')) {
        const index = Number(image.dataset.ksiImage);
        const wrapper = image.closest<HTMLElement>('.markdown-image-frame');
        if (!wrapper) continue;
        wrapper.classList.add('image-resize-frame');
        const originalFrameWidth = wrapper.style.width;
        const originalWidth = image.style.width;
        wrapper.style.width = `${image.getBoundingClientRect().width || Number(image.getAttribute('width')) || Math.min(node.clientWidth, 480)}px`;
        image.style.width = '100%';
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'image-resize-handle';
        handle.setAttribute('aria-label', 'Zmień szerokość obrazu (strzałki w lewo i w prawo)');
        handle.title = handle.getAttribute('aria-label')!;
        wrapper.append(handle);
        if (focusAfterResize === index) {
          handle.focus({ preventScroll: true });
          focusAfterResize = undefined;
        }
        let drag: { pointerId: number; x: number; width: number } | undefined;
        const maximum = () => Math.max(minimumImageWidth, node.clientWidth);
        const width = () => Math.round(wrapper.getBoundingClientRect().width);
        const update = (next: number) => {
          wrapper.style.width = `${Math.min(maximum(), clampImageWidth(next))}px`;
        };
        const commit = () => current.onresize?.(index, width());
        handle.onpointerdown = (event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          drag = { pointerId: event.pointerId, x: event.clientX, width: width() };
          handle.setPointerCapture(event.pointerId);
        };
        handle.onpointermove = (event) => {
          if (drag?.pointerId === event.pointerId) update(drag.width + event.clientX - drag.x);
        };
        handle.onpointerup = (event) => {
          if (drag?.pointerId !== event.pointerId) return;
          drag = undefined;
          handle.releasePointerCapture(event.pointerId);
          commit();
        };
        handle.onpointercancel = () => {
          if (drag) update(drag.width);
          drag = undefined;
        };
        handle.onkeydown = (event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          focusAfterResize = index;
          update(width() + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 50 : 10));
          commit();
        };
        disposers.push(() => {
          handle.remove();
          wrapper.classList.remove('image-resize-frame');
          wrapper.style.width = originalFrameWidth;
          image.style.width = originalWidth;
        });
      }
    }
    cleanup = () => {
      for (const dispose of disposers) dispose();
    };
  }
  setup(options);
  return { update: setup, destroy: () => cleanup() };
}
