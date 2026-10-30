<script lang="ts">
  let { value, tooltip = value }: { value: string; tooltip?: string } = $props();
  let shortened = $state<string | null>(null);

  // Measure the real available width, preserving both ends without changing row height.
  function fit(node: HTMLSpanElement, text: string) {
    const context = document.createElement('canvas').getContext('2d');
    let active = true;
    function measure() {
      if (!active || !context) return;
      const style = getComputedStyle(node);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const width = node.clientWidth;
      if (context.measureText(text).width <= width) {
        shortened = text;
        return;
      }
      const letters = Array.from(
        new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
        (part) => part.segment
      );
      const candidate = (count: number) => {
        const prefix = Math.ceil(count / 2);
        const suffix = Math.floor(count / 2);
        return (
          letters.slice(0, prefix).join('') + '…' + (suffix ? letters.slice(-suffix).join('') : '')
        );
      };
      let low = 0;
      let high = Math.max(0, letters.length - 1);
      while (low < high) {
        const count = Math.ceil((low + high) / 2);
        if (context.measureText(candidate(count)).width <= width) low = count;
        else high = count - 1;
      }
      shortened = candidate(low);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    void document.fonts.ready.then(measure);
    measure();
    return {
      update(next: string) {
        text = next;
        measure();
      },
      destroy() {
        active = false;
        observer.disconnect();
      }
    };
  }
</script>

<span class="tree-name" title={tooltip} use:fit={value}>
  <span class="sr-only">{value}</span><span aria-hidden="true">{shortened ?? value}</span>
</span>

<style>
  .tree-name {
    display: block;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
