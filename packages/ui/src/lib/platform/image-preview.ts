type Image = { src: string; alt: string };
type Options = {
  blocks: unknown;
  enabled: boolean;
  open: (images: Image[], index: number) => void;
};

/** Give rendered content images a real keyboard-operable preview trigger. */
export function imagePreview(node: HTMLElement, initial: Options) {
  let cleanup = () => {};
  function setup(options: Options) {
    cleanup();
    const dispose: (() => void)[] = [];
    if (options.enabled) {
      const images = [...node.querySelectorAll<HTMLImageElement>('img')].filter(
        (image) => !image.closest('a, button, .gallery')
      );
      const sources = images.map((image) => ({ src: image.src, alt: image.alt }));
      images.forEach((image, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'image-preview-trigger';
        button.setAttribute('aria-label', image.alt || 'Open image');
        image.replaceWith(button);
        button.append(image);
        button.onclick = () => options.open(sources, index);
        dispose.push(() => {
          if (button.parentNode) button.replaceWith(image);
        });
      });
    }
    cleanup = () => dispose.forEach((fn) => fn());
  }
  setup(initial);
  return { update: setup, destroy: () => cleanup() };
}
