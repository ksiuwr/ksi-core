<script lang="ts">
  import { tick } from 'svelte';
  import {
    ChevronLeft,
    ChevronRight,
    ImageOff,
    LoaderCircle,
    X,
    ZoomIn,
    ZoomOut
  } from '@lucide/svelte';
  import {
    LIGHTBOX_DOUBLE_TAP_ZOOM,
    LIGHTBOX_MAX_ZOOM,
    LIGHTBOX_MIN_ZOOM,
    LIGHTBOX_SLIDE_GAP,
    clampPan,
    clampZoom,
    dismissSwipeProgress,
    resolveSwipeAxis,
    shouldCommitDismissSwipe,
    shouldCommitHorizontalSwipe,
    stepZoom,
    wrapLightboxIndex,
    zoomAtPoint,
    type LightboxItem,
    type LightboxPoint,
    type LightboxSize,
    type LightboxView
  } from './lightbox.js';

  let {
    items,
    index = $bindable(0),
    open = $bindable(false),
    label = 'Galeria',
    onclose
  }: {
    items: LightboxItem[];
    index?: number;
    open?: boolean;
    label?: string;
    onclose?: () => void;
  } = $props();

  const uid = $props.id();
  const labels = $derived({
    close: 'Zamknij',
    prev: 'Poprzednie zdjęcie',
    next: 'Następne zdjęcie',
    zoomIn: 'Powiększ',
    zoomOut: 'Pomniejsz',
    zoomReset: 'Przywróć 100%',
    description: 'Opis zdjęcia',
    image: 'Zdjęcie',
    loading: 'Ładowanie zdjęcia…',
    error: 'Obraz niedostępny',
    status: 'Zdjęcie'
  });
  // @wc-ignore
  const keys = {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    home: 'Home',
    end: 'End',
    plus: '+',
    equals: '=',
    minus: '-',
    underscore: '_',
    zero: '0'
  };

  let dialog = $state<HTMLDialogElement>();
  let stage = $state<HTMLDivElement>();
  let trackEl = $state<HTMLDivElement>();
  let mediaEl = $state<HTMLDivElement>();
  let imgEl = $state<HTMLImageElement>();
  let filmstrip = $state<HTMLDivElement>();

  let scale = $state(LIGHTBOX_MIN_ZOOM);
  let pan = $state<LightboxPoint>({ x: 0, y: 0 });
  let content = $state<LightboxSize>({ width: 0, height: 0 });
  let ready = $state(false);
  let failed = $state(false);
  let dragging = $state(false);
  let animateZoom = $state(false);
  let navDirection = $state<-1 | 0 | 1>(0);
  let jumpId = $state(0);
  let dragOffsetX = $state(0);
  let dragOffsetY = $state(0);
  let snapping = $state(false);
  let slideMs = $state(220);
  let pendingSlide = $state<{ target: number; direction: -1 | 1 } | null>(null);
  let pendingClose = $state(false);
  let dismissed = $state(false);

  const loadedSrcs = new Set<string>();
  let trackTimer: ReturnType<typeof setTimeout> | undefined;

  function itemDescription(item: LightboxItem | undefined): string {
    const text = item?.description ?? '';
    return text.trim() ? text : '';
  }

  const current = $derived(wrapLightboxIndex(index, items.length));
  const active = $derived(items[current]);
  const slideKey = $derived(active ? `${current}:${active.src}` : '');
  const multi = $derived(items.length > 1);
  const prevIndex = $derived(multi ? wrapLightboxIndex(current - 1, items.length) : current);
  const nextIndex = $derived(multi ? wrapLightboxIndex(current + 1, items.length) : current);
  const prevItem = $derived(multi ? items[prevIndex] : undefined);
  const nextItem = $derived(multi ? items[nextIndex] : undefined);
  const zoomed = $derived(scale > LIGHTBOX_MIN_ZOOM);
  const description = $derived(itemDescription(active));
  const prevDescription = $derived(itemDescription(prevItem));
  const nextDescription = $derived(itemDescription(nextItem));
  const dismissProgress = $derived.by(() => {
    if (pendingClose) return 1;
    return dismissSwipeProgress(dragOffsetY, stage?.clientHeight || 400);
  });
  const backdropOpacity = $derived(pendingClose ? 0 : 1 - dismissProgress * 0.85);
  const chromeOpacity = $derived(pendingClose ? 0 : Math.max(0, 1 - dismissProgress * 2.2));
  const dismissScale = $derived(pendingClose ? 0.84 : 1 - dismissProgress * 0.12);

  let lastFocused: HTMLElement | null = null;

  function clearTrackTimer() {
    if (trackTimer !== undefined) {
      clearTimeout(trackTimer);
      trackTimer = undefined;
    }
  }
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function restoreFocus() {
    if (lastFocused?.isConnected) lastFocused.focus();
    lastFocused = null;
  }
  function resetView(animate = false) {
    clearTrackTimer();
    pendingSlide = null;
    pendingClose = false;
    animateZoom = animate;
    scale = LIGHTBOX_MIN_ZOOM;
    pan = { x: 0, y: 0 };
    dragOffsetX = 0;
    dragOffsetY = 0;
    snapping = false;
  }
  function close() {
    clearTrackTimer();
    pendingSlide = null;
    pendingClose = false;
    if (!open && !dialog?.open) return;
    if (dialog?.open) dialog.close();
    open = false;
    navDirection = 0;
    onclose?.();
    restoreFocus();
  }

  // Keep the native dialog in sync with `open`, closing cleanly when the
  // gallery becomes empty while open and restoring focus if unmounted open.
  $effect(() => {
    if (open && items.length > 0) {
      if (dialog && !dialog.open) {
        lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dismissed = false;
        navDirection = 0;
        resetView();
        dialog.showModal();
      }
      return () => {
        clearTrackTimer();
        if (!open || items.length === 0) return;
        if (dialog?.open) dialog.close();
        restoreFocus();
      };
    } else if (open) {
      close();
    } else if (dialog?.open) {
      clearTrackTimer();
      pendingSlide = null;
      pendingClose = false;
      dialog.close();
      navDirection = 0;
      restoreFocus();
    }
  });

  // Normalize the index whenever the gallery changes.
  $effect(() => {
    const total = items.length;
    if (total === 0) return;
    const wrapped = wrapLightboxIndex(index, total);
    if (wrapped !== index) index = wrapped;
  });

  // Lock background scrolling while the lightbox is open.
  $effect(() => {
    if (!open || items.length === 0) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  });

  // Per-slide loading state; images already preloaded in neighbor slots skip the
  // fade/spinner so carousel handoffs are seamless without a blank frame.
  $effect(() => {
    const key = slideKey;
    const src = active?.src ?? '';
    resetView();
    failed = !src;
    ready = Boolean(src && loadedSrcs.has(src));
    content = { width: 0, height: 0 };
    if (!src) return;
    void tick().then(() => {
      if (slideKey !== key) return;
      if (imgEl?.complete && imgEl.naturalWidth > 0) {
        loadedSrcs.add(src);
        ready = true;
        measure();
      }
    });
  });

  function mediaSize(): LightboxSize {
    const el = mediaEl ?? stage;
    return { width: el?.clientWidth ?? 0, height: el?.clientHeight ?? 0 };
  }
  function mediaPoint(clientX: number, clientY: number): LightboxPoint {
    const rect = (mediaEl ?? stage)?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  }
  // Fitted image size at scale 1, matching the max-width/max-height CSS.
  function measure() {
    if (!(mediaEl ?? stage) || !imgEl || !imgEl.naturalWidth) return;
    const viewport = mediaSize();
    const ratio = Math.min(
      viewport.width / imgEl.naturalWidth,
      viewport.height / imgEl.naturalHeight,
      1
    );
    const nextContent = { width: imgEl.naturalWidth * ratio, height: imgEl.naturalHeight * ratio };
    if (content.width !== nextContent.width || content.height !== nextContent.height) {
      content = nextContent;
    }
    const nextPan = clampPan(pan, scale, nextContent, viewport);
    if (pan.x !== nextPan.x || pan.y !== nextPan.y) {
      pan = nextPan;
    }
  }

  $effect(() => {
    const el = mediaEl ?? stage;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  });

  // Wheel zoom needs a non-passive listener to prevent page scroll.
  $effect(() => {
    const el = stage;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (event.target instanceof Element && event.target.closest('.description')) return;
      event.preventDefault();
      animateZoom = false;
      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * (el.clientHeight || 800)
            : event.deltaY;
      zoomTo(scale * Math.exp(-delta * 0.002), mediaPoint(event.clientX, event.clientY), false);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  function currentView(): LightboxView {
    return { scale, x: pan.x, y: pan.y };
  }
  function applyView(view: LightboxView) {
    scale = view.scale;
    pan = { x: view.x, y: view.y };
  }
  function zoomTo(nextScale: number, point: LightboxPoint = { x: 0, y: 0 }, animate = true) {
    if (!ready || failed || pendingSlide || pendingClose) return;
    animateZoom = animate;
    applyView(zoomAtPoint(currentView(), nextScale, point, content, mediaSize()));
  }
  function zoomBy(direction: 1 | -1) {
    zoomTo(stepZoom(scale, direction), { x: 0, y: 0 }, true);
  }
  function toggleZoom(point: LightboxPoint) {
    if (zoomed) resetView(true);
    else zoomTo(LIGHTBOX_DOUBLE_TAP_ZOOM, point, true);
  }

  function scheduleTrackSettle(ms: number) {
    clearTrackTimer();
    trackTimer = setTimeout(finishTrackTransition, ms + 60);
  }
  function finishTrackTransition() {
    clearTrackTimer();
    if (pendingSlide) {
      const { target } = pendingSlide;
      pendingSlide = null;
      snapping = false;
      dragOffsetX = 0;
      dragOffsetY = 0;
      navDirection = 0;
      index = target;
      return;
    }
    if (pendingClose) {
      pendingClose = false;
      dismissed = true;
      close();
      return;
    }
    snapping = false;
  }
  function trackTransitionEnd(event: TransitionEvent) {
    if (event.target !== trackEl || event.propertyName !== 'transform') return;
    if (!snapping && !pendingSlide && !pendingClose) return;
    finishTrackTransition();
  }
  function snapBack() {
    if (dragOffsetX === 0 && dragOffsetY === 0) {
      snapping = false;
      return;
    }
    if (prefersReducedMotion()) {
      dragOffsetX = 0;
      dragOffsetY = 0;
      snapping = false;
      return;
    }
    slideMs = 180;
    snapping = true;
    dragOffsetX = 0;
    dragOffsetY = 0;
    scheduleTrackSettle(180);
  }
  function slideBy(direction: -1 | 1) {
    if (!multi || pendingClose) return;
    if (pendingSlide) {
      const nextTarget = wrapLightboxIndex(pendingSlide.target + direction, items.length);
      clearTrackTimer();
      pendingSlide = null;
      snapping = false;
      dragOffsetX = 0;
      dragOffsetY = 0;
      navDirection = 0;
      index = nextTarget;
      return;
    }
    const target = wrapLightboxIndex(current + direction, items.length);
    if (target === current) return;
    const width = stage?.clientWidth ?? 0;
    if (prefersReducedMotion() || width <= 0) {
      dragOffsetX = 0;
      dragOffsetY = 0;
      snapping = false;
      navDirection = 0;
      index = target;
      return;
    }
    if (scale !== LIGHTBOX_MIN_ZOOM) {
      animateZoom = false;
      scale = LIGHTBOX_MIN_ZOOM;
      pan = { x: 0, y: 0 };
    }
    const stride = width + LIGHTBOX_SLIDE_GAP;
    const targetX = -direction * stride;
    if (Math.abs(targetX - dragOffsetX) < 1) {
      dragOffsetX = 0;
      dragOffsetY = 0;
      snapping = false;
      navDirection = 0;
      index = target;
      return;
    }
    const remaining = Math.max(0, Math.min(1, Math.abs(targetX - dragOffsetX) / stride));
    const ms = Math.round(140 + remaining * 100);
    slideMs = ms;
    pendingSlide = { target, direction };
    snapping = true;
    dragOffsetX = targetX;
    dragOffsetY = 0;
    scheduleTrackSettle(ms);
  }
  function dismissBySwipe() {
    if (pendingClose) return;
    if (prefersReducedMotion()) {
      close();
      return;
    }
    const height = stage?.clientHeight || window.innerHeight || 400;
    slideMs = 180;
    pendingClose = true;
    snapping = true;
    dragOffsetX = 0;
    dragOffsetY = Math.max(dragOffsetY + 140, Math.round(height * 0.55));
    scheduleTrackSettle(180);
  }
  function goTo(target: number, direction?: -1 | 0 | 1) {
    if (items.length === 0 || pendingClose) return;
    const targetIndex = wrapLightboxIndex(target, items.length);
    if (targetIndex === current) return;
    if (!pendingSlide && multi) {
      if (items.length === 2) {
        slideBy(direction === -1 ? -1 : direction === 1 ? 1 : targetIndex > current ? 1 : -1);
        return;
      }
      if (targetIndex === nextIndex) {
        slideBy(1);
        return;
      }
      if (targetIndex === prevIndex) {
        slideBy(-1);
        return;
      }
    }
    clearTrackTimer();
    pendingSlide = null;
    snapping = false;
    dragOffsetX = 0;
    dragOffsetY = 0;
    navDirection = direction ?? (targetIndex > current ? 1 : -1);
    jumpId += 1;
    index = targetIndex;
  }
  function prev() {
    slideBy(-1);
  }
  function next() {
    slideBy(1);
  }

  // ── Pointer gestures: pan, swipe, pinch and double-tap ─────────────────────
  type Gesture = {
    mode: 'pan' | 'swipe' | 'pinch';
    axis?: 'x' | 'y' | 'none';
    fromPinch: boolean;
    startTime: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
    captured: boolean;
    onImage: boolean;
    startScale: number;
    startPan: LightboxPoint;
    startDist: number;
    startMid: LightboxPoint;
  };
  const pointers = new Map<number, LightboxPoint>();
  let gesture: Gesture | undefined;
  let lastPressTarget: EventTarget | null = null;
  let suppressClick = false;
  let lastTap: { time: number; x: number; y: number } | undefined;
  let lastTouchZoom = 0;

  function capturePointer(pointerId: number) {
    try {
      stage?.setPointerCapture(pointerId);
    } catch {
      // Ignore races where the pointer has already ended.
    }
  }
  function singleGesture(
    x: number,
    y: number,
    moved: boolean,
    onImage: boolean,
    startTime: number,
    fromPinch = false
  ): Gesture {
    return {
      mode: scale > LIGHTBOX_MIN_ZOOM ? 'pan' : 'swipe',
      fromPinch,
      startTime,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      moved,
      captured: false,
      onImage,
      startScale: scale,
      startPan: { ...pan },
      startDist: 0,
      startMid: { x: 0, y: 0 }
    };
  }
  function isStageSurface(target: EventTarget | null) {
    return target === stage || target === mediaEl;
  }
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || pendingClose) return;
    if (!isStageSurface(event.target) && event.target !== imgEl) return;
    if (pendingSlide) finishTrackTransition();
    else if (snapping) {
      clearTrackTimer();
      snapping = false;
    }
    suppressClick = false;
    lastPressTarget = event.target;
    animateZoom = false;
    dragOffsetX = 0;
    dragOffsetY = 0;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      gesture = singleGesture(
        event.clientX,
        event.clientY,
        false,
        event.target === imgEl,
        event.timeStamp
      );
      dragging = scale > LIGHTBOX_MIN_ZOOM;
    } else if (pointers.size === 2) {
      for (const id of pointers.keys()) capturePointer(id);
      const [a, b] = [...pointers.values()] as [LightboxPoint, LightboxPoint];
      gesture = {
        ...singleGesture(event.clientX, event.clientY, true, false, event.timeStamp, true),
        mode: 'pinch',
        captured: true,
        startDist: Math.hypot(a.x - b.x, a.y - b.y),
        startMid: mediaPoint((a.x + b.x) / 2, (a.y + b.y) / 2)
      };
      dragging = true;
    }
  }
  function pointerMove(event: PointerEvent) {
    const tracked = pointers.get(event.pointerId);
    if (!tracked || !gesture) return;
    tracked.x = event.clientX;
    tracked.y = event.clientY;
    if (gesture.mode === 'pinch' && pointers.size >= 2) {
      const [a, b] = [...pointers.values()] as [LightboxPoint, LightboxPoint];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesture.startDist <= 0 || dist <= 0) return;
      const nextScale = clampZoom(gesture.startScale * (dist / gesture.startDist));
      const mid = mediaPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      const ratio = nextScale / gesture.startScale;
      scale = nextScale;
      pan = clampPan(
        {
          x: mid.x - (gesture.startMid.x - gesture.startPan.x) * ratio,
          y: mid.y - (gesture.startMid.y - gesture.startPan.y) * ratio
        },
        nextScale,
        content,
        mediaSize()
      );
      return;
    }
    if (pointers.size !== 1) return;
    if (
      !gesture.moved &&
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 6
    )
      return;
    if (!gesture.captured) {
      // Defer capture until dragging begins so plain clicks keep their real target.
      capturePointer(event.pointerId);
      gesture.captured = true;
    }
    gesture.moved = true;
    if (gesture.mode === 'pan' && scale > LIGHTBOX_MIN_ZOOM) {
      pan = clampPan(
        { x: pan.x + event.clientX - gesture.lastX, y: pan.y + event.clientY - gesture.lastY },
        scale,
        content,
        mediaSize()
      );
    } else if (gesture.mode === 'swipe' && !gesture.fromPinch && scale === LIGHTBOX_MIN_ZOOM) {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (!gesture.axis) gesture.axis = resolveSwipeAxis(dx, dy, multi) ?? 'none';
      if (gesture.axis === 'x' && multi) {
        const stride = (stage?.clientWidth || window.innerWidth || 400) + LIGHTBOX_SLIDE_GAP;
        dragOffsetX = Math.max(-stride, Math.min(stride, dx));
        dragOffsetY = 0;
      } else if (gesture.axis === 'y') {
        dragOffsetY = Math.max(0, dy);
        dragOffsetX = 0;
      }
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  }
  function pointerLostCapture(event: PointerEvent) {
    // Touch pointers have implicit capture on the initial target (e.g. <img>).
    // Transferring capture to `stage` fires a bubbling `lostpointercapture` from
    // that child, which must not abort the active gesture.
    if (event.target !== stage) return;
    pointerEnd(event);
  }
  function pointerEnd(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    // One finger lifted mid-pinch: continue as a pan without jumping or swiping.
    if (gesture?.mode === 'pinch' && pointers.size === 1) {
      const [remaining] = [...pointers.values()] as [LightboxPoint];
      gesture = singleGesture(remaining.x, remaining.y, true, false, event.timeStamp, true);
      gesture.captured = true;
      dragging = scale > LIGHTBOX_MIN_ZOOM;
      return;
    }
    if (pointers.size > 0) return;
    const finished = gesture;
    gesture = undefined;
    dragging = false;
    suppressClick = finished?.moved ?? false;
    if (
      finished?.mode === 'swipe' &&
      !finished.fromPinch &&
      finished.moved &&
      scale === LIGHTBOX_MIN_ZOOM
    ) {
      const elapsed = Math.max(1, event.timeStamp - finished.startTime);
      if (finished.axis === 'x' && multi) {
        const dx = event.clientX - finished.startX;
        if (
          event.type === 'pointerup' &&
          shouldCommitHorizontalSwipe(dx, elapsed, stage?.clientWidth || 400)
        ) {
          slideBy(dx < 0 ? 1 : -1);
          return;
        }
        snapBack();
        return;
      }
      if (finished.axis === 'y') {
        const dy = event.clientY - finished.startY;
        if (
          event.type === 'pointerup' &&
          shouldCommitDismissSwipe(dy, elapsed, stage?.clientHeight || 400)
        ) {
          dismissBySwipe();
          return;
        }
        snapBack();
        return;
      }
    }
    if (dragOffsetX !== 0 || dragOffsetY !== 0) {
      snapBack();
    }
    if (!finished || event.type !== 'pointerup') return;
    if (!finished.moved && finished.onImage && event.pointerType === 'touch') {
      const now = Date.now();
      if (
        lastTap &&
        now - lastTap.time < 300 &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 30
      ) {
        lastTap = undefined;
        lastTouchZoom = now;
        toggleZoom(mediaPoint(event.clientX, event.clientY));
      } else {
        lastTap = { time: now, x: event.clientX, y: event.clientY };
      }
    }
  }

  function stageClick(event: MouseEvent) {
    const pressTarget = lastPressTarget;
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    // Only a plain click starting and ending on the empty stage closes the lightbox.
    if (isStageSurface(event.target) && (pressTarget === null || isStageSurface(pressTarget)))
      close();
  }
  function doubleClick(event: MouseEvent) {
    if (event.target !== imgEl && lastPressTarget !== imgEl) return;
    // Touch double-taps are handled in pointerEnd; skip the synthetic dblclick.
    if (Date.now() - lastTouchZoom < 500) return;
    toggleZoom(mediaPoint(event.clientX, event.clientY));
  }

  function keydown(event: KeyboardEvent) {
    // Never hijack browser shortcuts (Ctrl/Cmd zoom, Alt+Arrow browser navigation).
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const inDescription =
      event.target instanceof HTMLElement && Boolean(event.target.closest('.description'));
    if (event.key === keys.left && multi) {
      event.preventDefault();
      prev();
    } else if (event.key === keys.right && multi) {
      event.preventDefault();
      next();
    } else if (event.key === keys.home && multi && !inDescription) {
      event.preventDefault();
      goTo(0);
    } else if (event.key === keys.end && multi && !inDescription) {
      event.preventDefault();
      goTo(items.length - 1);
    } else if (event.key === keys.plus || event.key === keys.equals) {
      event.preventDefault();
      zoomBy(1);
    } else if (event.key === keys.minus || event.key === keys.underscore) {
      event.preventDefault();
      zoomBy(-1);
    } else if (event.key === keys.zero) {
      event.preventDefault();
      resetView(true);
    }
  }

  // Keep the active thumbnail in view.
  $effect(() => {
    const strip = filmstrip;
    const i = current;
    if (!strip || !multi) return;
    const thumb = strip.children[i] as HTMLElement | undefined;
    if (!thumb) return;
    const reduced = prefersReducedMotion();
    strip.scrollTo({
      left: thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2,
      behavior: reduced ? 'auto' : 'smooth'
    });
  });
</script>

<dialog
  bind:this={dialog}
  class="lightbox"
  class:dismissed
  aria-label={label}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onkeydown={keydown}
>
  <div
    class="backdrop"
    class:snapping
    style:--slide-ms={`${slideMs}ms`}
    style:opacity={backdropOpacity}
    aria-hidden="true"
  ></div>
  <div
    class="chrome"
    class:snapping
    class:has-filmstrip={multi}
    class:dismissing={pendingClose || dismissProgress > 0.1}
    style:--slide-ms={`${slideMs}ms`}
    style:--chrome-opacity={chromeOpacity}
  >
    <header class="toolbar">
      {#if multi}<span class="counter" aria-hidden="true">{current + 1} / {items.length}</span>{/if}
      <div class="tools">
        <button
          type="button"
          class="tool"
          onclick={() => zoomBy(-1)}
          disabled={!ready || failed || scale <= LIGHTBOX_MIN_ZOOM}
          aria-label={labels.zoomOut}><ZoomOut size={18} aria-hidden="true" /></button
        >
        <button
          type="button"
          class="tool percent"
          onclick={() => resetView(true)}
          disabled={!zoomed}
          aria-label={labels.zoomReset}>{Math.round(scale * 100)}%</button
        >
        <button
          type="button"
          class="tool"
          onclick={() => zoomBy(1)}
          disabled={!ready || failed || scale >= LIGHTBOX_MAX_ZOOM}
          aria-label={labels.zoomIn}><ZoomIn size={18} aria-hidden="true" /></button
        >
        <button type="button" class="tool" onclick={close} aria-label={labels.close}
          ><X size={18} aria-hidden="true" /></button
        >
      </div>
    </header>
    <!-- svelte-ignore a11y_click_events_have_key_events (Keyboard navigation and zoom are handled on the dialog.) -->
    <!-- svelte-ignore a11y_no_static_element_interactions (Gesture surface only; the image inside carries the alt text.) -->
    <div
      class="stage"
      class:zoomed
      class:dragging
      class:animate-zoom={animateZoom}
      bind:this={stage}
      onpointerdown={pointerDown}
      onpointermove={pointerMove}
      onpointerup={pointerEnd}
      onpointercancel={pointerEnd}
      onlostpointercapture={pointerLostCapture}
      onclick={stageClick}
      ondblclick={doubleClick}
    >
      {#if active}
        <div
          class="track"
          class:snapping
          bind:this={trackEl}
          ontransitionend={trackTransitionEnd}
          style:--slide-ms={`${slideMs}ms`}
          style:--slide-gap={`${LIGHTBOX_SLIDE_GAP}px`}
          style:opacity={pendingClose ? 0 : 1}
          style:transform={`translate3d(${dragOffsetX}px, ${dragOffsetY}px, 0)${dismissScale !== 1 ? ` scale(${dismissScale})` : ''}`}
        >
          {#if open && multi && prevItem}
            <div
              class="slide slide-neighbor slide-prev-slot"
              class:hidden-neighbor={zoomed && !pendingSlide}
              aria-hidden="true"
            >
              <div class="slide-media">
                <img
                  src={prevItem.src}
                  alt=""
                  draggable="false"
                  onload={() => loadedSrcs.add(prevItem.src)}
                />
              </div>
              {#if prevDescription}
                <div class="description description-neighbor">{prevDescription}</div>
              {/if}
            </div>
          {/if}
          {#key jumpId}
            <div
              class="slide slide-active"
              class:slide-next={ready && navDirection > 0}
              class:slide-prev={ready && navDirection < 0}
            >
              <div class="slide-media" bind:this={mediaEl}>
                <img
                  bind:this={imgEl}
                  src={active.src}
                  alt={active.alt ?? ''}
                  aria-describedby={description ? `${uid}-desc` : undefined}
                  draggable="false"
                  decoding="sync"
                  class:ready
                  style:transform={`translate(${pan.x}px, ${pan.y}px) scale(${scale})`}
                  onload={(event) => {
                    if (event.currentTarget !== imgEl) return;
                    if (active?.src) loadedSrcs.add(active.src);
                    ready = true;
                    failed = false;
                    measure();
                  }}
                  onerror={(event) => {
                    if (event.currentTarget !== imgEl) return;
                    if (active?.src) loadedSrcs.delete(active.src);
                    failed = true;
                    ready = false;
                  }}
                />
                {#if failed}<span class="image-status" role="status"
                    ><ImageOff size={28} aria-hidden="true" />{labels.error}</span
                  >
                {:else if !ready}<span class="image-status" aria-hidden="true"
                    ><span class="spinner"><LoaderCircle size={28} aria-hidden="true" /></span
                    >{labels.loading}</span
                  >{/if}
              </div>
              {#if description}
                <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable description needs keyboard focus.) -->
                <div
                  id={`${uid}-desc`}
                  class="description"
                  class:description-animate={navDirection !== 0}
                  role="region"
                  aria-label={labels.description}
                  tabindex="0"
                >
                  {description}
                </div>
              {/if}
            </div>
          {/key}
          {#if open && multi && nextItem}
            <div
              class="slide slide-neighbor slide-next-slot"
              class:hidden-neighbor={zoomed && !pendingSlide}
              aria-hidden="true"
            >
              <div class="slide-media">
                <img
                  src={nextItem.src}
                  alt=""
                  draggable="false"
                  onload={() => loadedSrcs.add(nextItem.src)}
                />
              </div>
              {#if nextDescription}
                <div class="description description-neighbor">{nextDescription}</div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
    {#if multi}
      <button type="button" class="nav prev" onclick={prev} aria-label={labels.prev}
        ><ChevronLeft size={24} aria-hidden="true" /></button
      >
      <button type="button" class="nav next" onclick={next} aria-label={labels.next}
        ><ChevronRight size={24} aria-hidden="true" /></button
      >
      <footer class="bottom">
        <div class="filmstrip" bind:this={filmstrip}>
          {#each items as item, i (item.src + i)}
            {@const thumbDetail = item.description?.trim() || item.alt?.trim()}
            <button
              type="button"
              class="thumb"
              class:active={i === current}
              onclick={() => goTo(i)}
              aria-label={thumbDetail
                ? `${labels.image} ${i + 1}: ${thumbDetail}`
                : `${labels.image} ${i + 1}`}
              aria-current={i === current}
            >
              <img src={item.src} alt="" loading="lazy" draggable="false" />
            </button>
          {/each}
        </div>
      </footer>
    {/if}
  </div>
  <span class="sr-only" aria-live="polite">{labels.status} {current + 1} z {items.length}</span>
</dialog>

<style>
  .lightbox {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #f4f5f7;
    overflow: hidden;
    overscroll-behavior: contain;
    opacity: 0;
    /* Neutralize the shared :where(dialog) scale/translate entrance so the
       full-viewport layout never shifts; keep a gentle opacity fade. */
    scale: 1;
    translate: 0 0;
    transition:
      opacity 160ms ease-out,
      display 160ms allow-discrete,
      overlay 160ms allow-discrete;
  }
  .lightbox[open] {
    display: flex;
    opacity: 1;
  }
  .lightbox.dismissed {
    opacity: 0;
    transition: none;
  }
  .lightbox::backdrop {
    background: transparent;
  }
  @starting-style {
    .lightbox[open] {
      opacity: 0;
    }
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(10, 12, 14, 0.92);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    pointer-events: none;
  }
  .backdrop.snapping {
    transition: opacity var(--slide-ms, 220ms) ease-out;
  }
  .chrome {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
  }
  .chrome.dismissing .toolbar,
  .chrome.dismissing .bottom,
  .chrome.dismissing .nav {
    pointer-events: none;
  }
  .toolbar,
  .bottom,
  .nav {
    opacity: var(--chrome-opacity, 1);
  }
  .chrome.snapping .toolbar,
  .chrome.snapping .bottom,
  .chrome.snapping .nav {
    transition: opacity var(--slide-ms, 220ms) ease-out;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
  }
  .counter {
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-md, 6px);
    background: rgba(13, 15, 18, 0.72);
    font-family: var(--mono, ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    white-space: nowrap;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }
  .tool,
  .nav,
  .thumb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(13, 15, 18, 0.72);
    color: #f4f5f7;
    font: inherit;
    cursor: pointer;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    user-select: none;
    -webkit-user-select: none;
  }
  .tool {
    min-width: 44px;
    height: 44px;
    padding: 0 10px;
    border-radius: var(--radius-md, 6px);
  }
  .tool.percent {
    font-family: var(--mono, ui-monospace, monospace);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
  }
  .tool:hover:not(:disabled),
  .nav:hover,
  .thumb:hover {
    background: rgba(32, 36, 42, 0.85);
    border-color: rgba(255, 255, 255, 0.28);
  }
  .tool:disabled {
    cursor: default;
    opacity: 0.4;
  }
  .tool:focus-visible,
  .nav:focus-visible,
  .thumb:focus-visible,
  .description:focus-visible {
    outline: 2px solid var(--accent, #ed8a6d);
    outline-offset: 2px;
  }
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .stage.zoomed .slide-active .slide-media {
    cursor: grab;
  }
  .stage.dragging .slide-active .slide-media {
    cursor: grabbing;
  }
  .track {
    position: relative;
    width: 100%;
    height: 100%;
    pointer-events: none;
    will-change: transform;
  }
  .track.snapping {
    transition:
      transform var(--slide-ms, 220ms) cubic-bezier(0.22, 1, 0.36, 1),
      opacity var(--slide-ms, 220ms) ease-out;
  }
  .slide {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    pointer-events: none;
  }
  .chrome:not(.has-filmstrip) .slide {
    padding-bottom: 12px;
  }
  .slide-media {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    pointer-events: none;
  }
  .slide-active .slide-media {
    pointer-events: auto;
    touch-action: none;
  }
  .slide-prev-slot {
    transform: translateX(calc(-100% - var(--slide-gap, 24px)));
  }
  .slide-next-slot {
    transform: translateX(calc(100% + var(--slide-gap, 24px)));
  }
  .slide-neighbor.hidden-neighbor {
    visibility: hidden;
  }
  .slide.slide-next {
    animation: lightbox-slide-next 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .slide.slide-prev {
    animation: lightbox-slide-prev 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes lightbox-slide-next {
    from {
      opacity: 0;
      translate: 28px 0;
    }
    to {
      opacity: 1;
      translate: 0 0;
    }
  }
  @keyframes lightbox-slide-prev {
    from {
      opacity: 0;
      translate: -28px 0;
    }
    to {
      opacity: 1;
      translate: 0 0;
    }
  }
  @keyframes lightbox-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  .stage img {
    display: block;
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-user-drag: none;
    transform-origin: center center;
  }
  .slide-active img {
    opacity: 0;
    pointer-events: auto;
    transition: opacity 160ms ease;
  }
  .slide-active img.ready {
    opacity: 1;
  }
  .slide-neighbor img {
    pointer-events: none;
  }
  .stage.animate-zoom:not(.dragging) .slide-active img.ready {
    transition:
      transform 120ms ease-out,
      opacity 160ms ease;
  }
  .stage.zoomed .slide-active img {
    will-change: transform;
  }
  .image-status {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px;
    color: #c8ccd2;
    font-size: 13px;
    text-align: center;
    pointer-events: none;
  }
  .spinner {
    display: inline-flex;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .nav {
    position: absolute;
    top: 50%;
    translate: 0 -50%;
    z-index: 2;
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }
  .nav.prev {
    left: 12px;
  }
  .nav.next {
    right: 12px;
  }
  .bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 12px 12px;
  }
  .description {
    flex: 0 0 auto;
    max-width: min(65ch, calc(100% - 24px));
    max-height: 26vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px 12px;
    color: #f4f5f7;
    font-size: 13px;
    line-height: 1.55;
    text-align: center;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
    white-space: pre-line;
    overflow-wrap: anywhere;
    pointer-events: auto;
    touch-action: pan-y;
    user-select: text;
    -webkit-user-select: text;
  }
  .description.description-neighbor {
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .description.description-animate {
    animation: lightbox-fade 180ms ease-out;
  }
  .filmstrip {
    position: relative;
    display: flex;
    gap: 8px;
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior: contain;
    padding: 6px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-md, 6px);
    background: rgba(13, 15, 18, 0.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    scrollbar-width: thin;
  }
  .thumb {
    flex: 0 0 auto;
    width: 64px;
    height: 48px;
    border: 2px solid transparent;
    border-radius: 4px;
    overflow: hidden;
    background: #1a1d21;
    opacity: 0.65;
  }
  .thumb.active {
    border-color: var(--accent, #ed8a6d);
    opacity: 1;
  }
  .thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  @media (max-width: 640px), (hover: none) and (pointer: coarse) {
    .nav {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .toolbar {
      padding: 8px;
      gap: 6px;
    }
    .tools {
      gap: 4px;
    }
    .tool {
      min-width: 40px;
      height: 40px;
      padding: 0 8px;
    }
    .counter {
      padding: 5px 8px;
      font-size: 12px;
    }
    .slide {
      gap: 6px;
    }
    .chrome:not(.has-filmstrip) .slide {
      padding-bottom: 8px;
    }
    .bottom {
      padding: 6px 8px 8px;
      gap: 6px;
    }
    .description {
      max-height: 22vh;
      font-size: 12px;
    }
    .filmstrip {
      gap: 6px;
      padding: 4px;
    }
    .thumb {
      width: 52px;
      height: 40px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lightbox,
    .backdrop.snapping,
    .chrome.snapping .toolbar,
    .chrome.snapping .bottom,
    .chrome.snapping .nav,
    .track.snapping,
    .slide-active img,
    .stage.animate-zoom:not(.dragging) .slide-active img.ready {
      transition: none;
    }
    .slide.slide-next,
    .slide.slide-prev,
    .description.description-animate,
    .spinner {
      animation: none;
    }
  }
</style>
