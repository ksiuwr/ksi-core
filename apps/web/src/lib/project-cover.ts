/**
 * Deterministic generative artwork for projects, which have no uploaded cover.
 * The slug seeds every random choice, so a project keeps the same artwork on
 * the server, in the browser, and across visits, while the field picks a motif:
 * contour lines for research, circuit traces for engineering, and clustered
 * circles for community projects.
 */
export const projectFields = ['research', 'engineering', 'community'] as const;
export type ProjectField = (typeof projectFields)[number];

export type CoverShape =
  | { kind: 'path'; d: string; width: number; opacity: number }
  | { kind: 'circle'; x: number; y: number; r: number; style: 'solid' | 'soft' | 'ring' | 'pad' }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number };

export interface Cover {
  motif: ProjectField;
  /** Hue offset in degrees from the field hue, so neighbours never look identical. */
  hueShift: number;
  /** Where the composition is densest, as fractions of the canvas, for the glow. */
  focus: { x: number; y: number };
  /** Grid spacing of the dotted background, used by the circuit motif. */
  grid?: number;
  shapes: CoverShape[];
}

export function primaryField(fields: readonly string[] | undefined): ProjectField {
  return projectFields.find((field) => fields?.[0] === field) ?? 'engineering';
}

function hash(text: string) {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.codePointAt(0)!;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

// mulberry32: small, fast, and good enough for artwork.
function generator(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Random = ReturnType<typeof generator>;

const round = (value: number) => Math.round(value * 10) / 10;
const between = (random: Random, min: number, max: number) => min + random() * (max - min);

/**
 * A smooth closed curve through the points, using midpoints as anchors. Whole
 * pixels are precise enough and keep the server-rendered markup small.
 */
function closedCurve(points: [number, number][]) {
  const mid = (a: [number, number], b: [number, number]) =>
    `${Math.round((a[0] + b[0]) / 2)} ${Math.round((a[1] + b[1]) / 2)}`;
  let d = `M${mid(points.at(-1)!, points[0]!)}`;
  for (let index = 0; index < points.length; index++) {
    const point = points[index]!;
    d += `Q${Math.round(point[0])} ${Math.round(point[1])} ${mid(point, points[(index + 1) % points.length]!)}`;
  }
  return `${d}Z`;
}

function contours(width: number, height: number, random: Random): Cover {
  const shapes: CoverShape[] = [];
  const peaks = width > height * 2.5 ? 2 : 1;
  const step = height * between(random, 0.055, 0.075);
  const centers = Array.from({ length: peaks }, (_, index) => ({
    x: width * ((index + between(random, 0.25, 0.75)) / peaks),
    y: height * between(random, 0.3, 0.7)
  }));
  // Rings of neighbouring peaks stop before they could meet.
  const reach =
    peaks > 1
      ? Math.hypot(centers[1]!.x - centers[0]!.x, centers[1]!.y - centers[0]!.y) / 2
      : Math.hypot(width, height);
  for (const center of centers) {
    const stretch = between(random, 1.1, 1.5);
    const waves = [
      { frequency: 2 + Math.floor(random() * 2), amplitude: between(random, 0.06, 0.12) },
      { frequency: 3 + Math.floor(random() * 3), amplitude: between(random, 0.03, 0.08) }
    ].map((wave) => ({ ...wave, phase: random() * Math.PI * 2 }));
    const drift = { x: between(random, -0.3, 0.3) * step, y: between(random, -0.2, 0.2) * step };
    const rings = Math.min(14, Math.floor(reach / (step * stretch)));
    for (let ring = 1; ring <= rings; ring++) {
      const radius = ring * step;
      const morph = ring / rings;
      const points: [number, number][] = [];
      for (let index = 0; index < 28; index++) {
        const angle = (index / 28) * Math.PI * 2;
        const [first, second] = waves as [(typeof waves)[0], (typeof waves)[0]];
        const scale =
          1 +
          first.amplitude * Math.sin(first.frequency * angle + first.phase) +
          second.amplitude * morph * Math.sin(second.frequency * angle + second.phase);
        points.push([
          center.x + ring * drift.x + Math.cos(angle) * radius * scale * stretch,
          center.y + ring * drift.y + Math.sin(angle) * radius * scale
        ]);
      }
      shapes.push({
        kind: 'path',
        d: closedCurve(points),
        width: ring % 4 === 0 ? 1.6 : 1,
        opacity: round(0.95 - 0.55 * morph)
      });
    }
    shapes.push({ kind: 'circle', x: center.x, y: center.y, r: 7, style: 'ring' });
    shapes.push({ kind: 'circle', x: center.x, y: center.y, r: 2.5, style: 'solid' });
  }
  return {
    motif: 'research',
    hueShift: 0,
    focus: { x: centers[0]!.x / width, y: centers[0]!.y / height },
    shapes
  };
}

function circuit(width: number, height: number, random: Random): Cover {
  const grid = 16;
  const columns = Math.floor(width / grid) - 1;
  const rows = Math.floor(height / grid) - 1;
  const taken = new Set<string>();
  const key = (column: number, row: number) => `${column}:${row}`;
  const inside = (column: number, row: number) =>
    column >= 1 && row >= 1 && column <= columns && row <= rows;
  const chipShapes: CoverShape[] = [];
  const traces: CoverShape[] = [];
  const pads: CoverShape[] = [];
  type Step = [number, number];

  /** Walks from a grid node; `pin` is the chip edge the trace leaves from, if any. */
  function trace(column: number, row: number, direction: Step, pin?: { x: number; y: number }) {
    if (!inside(column, row) || taken.has(key(column, row))) return;
    taken.add(key(column, row));
    const start = { x: column * grid, y: row * grid };
    let d = pin ? `M${pin.x} ${pin.y}L${start.x} ${start.y}` : `M${start.x} ${start.y}`;
    let length = 0;
    for (let segment = 0; segment < 2 + Math.floor(random() * 4); segment++) {
      let moved = false;
      for (let cell = 0; cell < 1 + Math.floor(random() * 5); cell++) {
        const next: Step = [column + direction[0], row + direction[1]];
        if (!inside(...next) || taken.has(key(...next))) break;
        [column, row] = next;
        taken.add(key(column, row));
        moved = true;
        length++;
      }
      if (!moved) break;
      d += `L${column * grid} ${row * grid}`;
      // A 45° bend; straight and diagonal runs alternate like PCB traces.
      const turn = random() < 0.5 ? 1 : -1;
      const [x, y] = direction;
      direction = [Math.sign(x - turn * y), Math.sign(y + turn * x)];
    }
    if (!length && !pin) return;
    traces.push({ kind: 'path', d, width: 1.5, opacity: 1 });
    pads.push({ kind: 'circle', x: column * grid, y: row * grid, r: 3, style: 'pad' });
    if (!pin) pads.push({ kind: 'circle', ...start, r: 3, style: 'pad' });
  }

  function reserve(column: number, row: number, spanColumns: number, spanRows: number) {
    for (let x = column - 1; x <= column + spanColumns + 1; x++)
      for (let y = row - 1; y <= row + spanRows + 1; y++) taken.add(key(x, y));
  }

  const chips = width > height * 2.5 ? 3 : 1;
  const pending: (() => void)[] = [];
  let focus = { x: 0.5, y: 0.5 };
  for (let index = 0; index < chips; index++) {
    const span = { columns: 2 + Math.floor(random() * 3), rows: 2 + Math.floor(random() * 2) };
    const region = Math.floor(columns / chips);
    const column =
      index * region + 3 + Math.floor(random() * Math.max(1, region - span.columns - 6));
    const row = Math.round(rows * between(random, 0.3, 0.45));
    reserve(column, row, span.columns, span.rows);
    const left = (column - 0.6) * grid;
    const top = (row - 0.6) * grid;
    const right = (column + span.columns + 0.6) * grid;
    const bottom = (row + span.rows + 0.6) * grid;
    chipShapes.push({
      kind: 'rect',
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      rx: 4
    });
    chipShapes.push({ kind: 'circle', x: left + 7, y: top + 7, r: 2, style: 'solid' });
    if (index === 0) focus = { x: (left + right) / 2 / width, y: (top + bottom) / 2 / height };
    // Pins fan out from every side once all chips have reserved their space.
    pending.push(() => {
      for (let x = column; x <= column + span.columns; x++) {
        if (random() < 0.85) trace(x, row - 2, [0, -1], { x: x * grid, y: top });
        if (random() < 0.85) trace(x, row + span.rows + 2, [0, 1], { x: x * grid, y: bottom });
      }
      for (let y = row; y <= row + span.rows; y++) {
        if (random() < 0.6) trace(column - 2, y, [-1, 0], { x: left, y: y * grid });
        if (random() < 0.6) trace(column + span.columns + 2, y, [1, 0], { x: right, y: y * grid });
      }
    });
  }

  // Small two-pad components scattered between the traces.
  const components = Math.round((columns * rows) / 90);
  for (let index = 0; index < components; index++) {
    const column = 1 + Math.floor(random() * (columns - 2));
    const row = 1 + Math.floor(random() * (rows - 1));
    const vertical = random() < 0.5;
    const cells = vertical
      ? [key(column, row), key(column, row + 1)]
      : [key(column, row), key(column + 1, row)];
    if (cells.some((cell) => taken.has(cell))) continue;
    for (const cell of cells) taken.add(cell);
    chipShapes.push({
      kind: 'rect',
      x: column * grid - 4,
      y: row * grid - 4,
      width: vertical ? 8 : grid + 8,
      height: vertical ? grid + 8 : 8,
      rx: 2
    });
  }

  for (const run of pending) run();
  const directions: Step[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  const strays = Math.round((columns * rows) / 22);
  for (let index = 0; index < strays; index++)
    trace(
      1 + Math.floor(random() * columns),
      1 + Math.floor(random() * rows),
      directions[Math.floor(random() * 4)]!
    );
  return {
    motif: 'engineering',
    hueShift: 0,
    focus,
    grid,
    shapes: [...traces, ...chipShapes, ...pads]
  };
}

function gathering(width: number, height: number, random: Random): Cover {
  const count = width > height * 2.5 ? 4 : 2;
  const clusters = Array.from({ length: count }, (_, index) => ({
    x: width * ((index + between(random, 0.3, 0.7)) / count),
    y: height * between(random, 0.35, 0.65)
  }));
  const spread = height * 0.24;
  const largest = height * 0.17;
  const target = Math.round((width * height) / 3600);
  const placed: { x: number; y: number; r: number }[] = [];
  for (let attempt = 0; attempt < target * 30 && placed.length < target; attempt++) {
    const cluster = clusters[Math.floor(random() * clusters.length)]!;
    // Sum of uniforms approximates a normal distribution around the cluster.
    const offset = () => (random() + random() + random() - 1.5) * spread * 1.4;
    const r = 3 + (largest - 3) * random() ** 2.2;
    const x = cluster.x + offset() * 1.6;
    const y = cluster.y + offset();
    if (x < -r || x > width + r || y < -r || y > height + r) continue;
    if (placed.some((other) => Math.hypot(other.x - x, other.y - y) < other.r + r + 4)) continue;
    placed.push({ x, y, r });
  }
  const shapes: CoverShape[] = placed.map((circle) => ({
    kind: 'circle',
    x: round(circle.x),
    y: round(circle.y),
    r: round(circle.r),
    style:
      circle.r > largest * 0.62
        ? 'solid'
        : circle.r > largest * 0.3
          ? random() < 0.6
            ? 'soft'
            : 'ring'
          : random() < 0.5
            ? 'solid'
            : 'ring'
  }));
  return {
    motif: 'community',
    hueShift: 0,
    focus: { x: clusters[0]!.x / width, y: clusters[0]!.y / height },
    shapes
  };
}

const motifs = { research: contours, engineering: circuit, community: gathering };

export function projectCover(
  slug: string,
  field: ProjectField,
  width: number,
  height: number
): Cover {
  const random = generator(hash(`${field}:${slug}`));
  const hueShift = Math.round(between(random, -18, 18));
  return { ...motifs[field](width, height, random), hueShift };
}
