/**
 * Sliding pill for groups where exactly one option is selected (segmented
 * controls, editor tabs). The pill itself is drawn by `[data-slider]::before`
 * in platform-kit.css; this action only measures the selected option and
 * publishes its box as CSS variables, so the pill glides between options.
 *
 *   <div class="segmented-control" use:slider> … </div>
 *
 * The selected option is the first descendant matching `selected`.
 */
const SELECTED = ".active, [aria-pressed='true'], [aria-selected='true']";

export function slider(node: HTMLElement, selected: string = SELECTED) {
  node.dataset.slider = '';

  const measure = () => {
    const option = node.querySelector<HTMLElement>(selected);
    if (!option || !option.offsetWidth) {
      node.style.setProperty('--slider-w', '0px');
      return;
    }
    node.style.setProperty('--slider-x', `${option.offsetLeft}px`);
    node.style.setProperty('--slider-y', `${option.offsetTop}px`);
    node.style.setProperty('--slider-w', `${option.offsetWidth}px`);
    node.style.setProperty('--slider-h', `${option.offsetHeight}px`);
  };

  const resize = new ResizeObserver(measure);
  resize.observe(node);
  for (const child of node.children) resize.observe(child);

  const mutations = new MutationObserver(measure);
  mutations.observe(node, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-pressed', 'aria-selected']
  });

  measure();
  // Transitions are enabled only after the first placement so the pill does not
  // fly in from the origin on mount.
  const ready = requestAnimationFrame(() => (node.dataset.sliderReady = ''));
  void document.fonts?.ready.then(measure);

  return {
    destroy() {
      cancelAnimationFrame(ready);
      resize.disconnect();
      mutations.disconnect();
      delete node.dataset.slider;
      delete node.dataset.sliderReady;
    }
  };
}
