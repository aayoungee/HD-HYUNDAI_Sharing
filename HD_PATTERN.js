// HD_PATTERN — LBS(Living Brand System)의 Key Visual Pattern을 단독 실행 파일로 옮긴 것.
// 데이터·계산·동작은 LBS 앱과 같고, 화면 모양만 원본 HD_PATTERN을 따른다.

// ===== 1. 데이터 =====

// px 단위 값은 모두 캔버스 짧은 변이 이 길이일 때를 기준으로 읽는다.
const REFERENCE_BASE = 720;

// 배경·선 색은 7조합 중 하나이거나, 「직접 입력」(colorway: "custom")이면 사용자가 넣은 값이다.
const COLORWAYS = {
  whiteLightGreen: { label: "화이트 · 연그린",   background: "#FFFFFF", line: "#DCF5D2" },
  whiteLightBlue:  { label: "화이트 · 연블루",   background: "#FFFFFF", line: "#DCF0F5" },
  lightGreenGreen: { label: "연그린 · 그린",     background: "#DCF5D2", line: "#00AF41" },
  greenLightGreen: { label: "그린 · 연그린",     background: "#00AF41", line: "#73D75A" },
  darkGreenGreen:  { label: "다크그린 · 그린",   background: "#00280A", line: "#007332" },
  navyBlue:        { label: "네이비 · 블루",     background: "#000A32", line: "#003087" },
  blackWhite:      { label: "블랙 · 화이트",     background: "#000000", line: "#FFFFFF" }
};

// 프리셋은 색을 뺀 나머지 값의 묶음이다 — 고른 색이 프리셋 하나에 사라지면 안 된다.
const PRESETS = [
  { key: "base",              values: { direction: "diagonal",   viewpoint: "perspective", columnGap: 30, rowGap: 30, variableWeight: true,  minWeight: 1, maxWeight: 10, origin: { x: 0.5,  y: 0.5  } } },
  { key: "cornerVanishing",   values: { direction: "diagonal",   viewpoint: "perspective", columnGap: 30, rowGap: 30, variableWeight: true,  minWeight: 1, maxWeight: 14, origin: { x: 1,    y: 1    } } },
  { key: "flatDiagonal",      values: { direction: "diagonal",   viewpoint: "flat",        columnGap: 12, rowGap: 12, variableWeight: true,  minWeight: 1, maxWeight: 4,  origin: { x: 0.42, y: 0.62 } } },
  { key: "verticalEdgeThird", values: { direction: "vertical",   viewpoint: "perspective", columnGap: 16, rowGap: 28, variableWeight: true,  minWeight: 2, maxWeight: 12, origin: { x: 0,    y: 0.33 } } },
  { key: "horizontalFlat",    values: { direction: "horizontal", viewpoint: "flat",        columnGap: 20, rowGap: 20, variableWeight: false, minWeight: 5, maxWeight: 10, origin: { x: 0.68, y: 1    } } },
  { key: "verticalDrift",     values: { direction: "vertical",   viewpoint: "flat",        columnGap: 14, rowGap: 14, variableWeight: true,  minWeight: 1, maxWeight: 15, origin: { x: 0.28, y: 0.44 } } }
];

// 뒤쪽 5개는 화면에 컨트롤이 없지만 계산에는 쓰인다. depthGamma·depthScaleMin은 원근 강도 「보통」이다.
const DEFAULT_INPUT = {
  direction: "diagonal",
  viewpoint: "perspective",
  colorway: "darkGreenGreen",
  columnGap: 30,
  rowGap: 30,
  variableWeight: true,
  minWeight: 1,
  maxWeight: 10,
  origin: { x: 0.5, y: 0.5 },
  lineLength: 35,
  minCellGap: 8,
  lengthFillRatio: 0.6,
  depthGamma: 2.5,
  depthScaleMin: 0.25
};

// 출력 크기 프리셋. 크기가 정본이고, 어느 프리셋인지는 지금 크기에서 계산한다.
const OUTPUT_PRESETS = [
  { key: "feed",   label: "Instagram Feed", width: 1080, height: 1350 },
  { key: "square", label: "Square",         width: 1080, height: 1080 },
  { key: "wide",   label: "16:9",           width: 1920, height: 1080 }
];
const MAX_SIDE_PIXELS = 16384;     // 브라우저 캔버스 한 변의 한도
const MAX_PIXELS = 67108864;       // 판 전체 픽셀 한도
const EXPORT_PPI = 300;            // SVG의 물리 크기(mm) 표기에 쓰는 해상도
const EXPORT_NAME = "Key Visual Pattern";

// ===== 2. 그래픽 계산 =====

// 여백은 짧은 변의 비율이다 — 사방이 같고, 판이 길어져도 따라 커지지 않는다.
const MARGIN_RATIO = 0.06;
// 기준점이 이 칸 수 이내로 끝에 붙으면 끝으로 스냅한다 — 두 줄짜리 사분면을 만들지 않는다.
const EDGE_SNAP_CELLS = 2;
// 꼭짓점 칸의 선을 기준 자리에서 꼭짓점 쪽으로 얼마나 더 붙일지(두께의 몇 배). 눈으로 보고 고른 값이다.
const CORNER_OUTWARD_NUDGE = 0.75;

// 패널 값을 계산 입력으로 바꾼다. 「가장 얇은 라인」이 「가장 두꺼운 라인」보다 크면 두께가 뒤집히므로
// 얇은 쪽을 두꺼운 쪽에 맞춰 눌러 둔다 — 어느 슬라이더를 움직여도 반응은 남는다.
function toInput(values) {
  return {
    ...DEFAULT_INPUT,
    direction: values.direction,
    viewpoint: values.viewpoint,
    colorway: values.colorway,
    customColors: { background: values.customBackground, line: values.customLine },
    columnGap: values.columnGap,
    rowGap: values.rowGap,
    variableWeight: values.variableWeight,
    minWeight: Math.min(values.minWeight, values.maxWeight),
    maxWeight: values.maxWeight,
    origin: values.origin
  };
}

function createScene(input, viewport) {
  const colorway = input.colorway === "custom" ? input.customColors : COLORWAYS[input.colorway];
  const metrics = createMetrics(input, viewport);
  const { origin, columnIndex, rowIndex } = snapOrigin(input, viewport, metrics);
  // 입체가 아니면 축 레이아웃 자체를 만들지 않는다 — 평면은 균등 격자다.
  const layout = input.viewpoint === "perspective"
    ? {
        row: computeAxisLayout(metrics.rows, metrics.rowGap, metrics.verticalMargin, rowIndex, metrics.minCellGap, input.depthGamma, input.depthScaleMin),
        column: computeAxisLayout(metrics.columns, metrics.columnGap, metrics.horizontalMargin, columnIndex, metrics.minCellGap, input.depthGamma, input.depthScaleMin)
      }
    : null;
  const spanX = (metrics.columns - 1) * metrics.columnGap;
  const spanY = (metrics.rows - 1) * metrics.rowGap;
  const flatSafeGap = Math.min(metrics.columnGap, metrics.rowGap);
  const dashes = [];

  for (let row = 0; row < metrics.rows; row++) {
    for (let column = 0; column < metrics.columns; column++) {
      const position = getGridPosition(metrics, layout, row, column);
      const { angle, anchorInward } = getLineOrientation(input, metrics, position, origin, row, column);
      const weight = input.variableWeight
        ? getLineWeight(metrics, position, origin, spanX, spanY)
        : metrics.minLineWeight;
      // 선이 작아지는 이유는 둘이다: 기준점에서 멀어져서(depthScale), 옆 칸을 침범하지 않으려고
      // (safetyScale). 더 많이 줄이는 쪽 하나를 길이·두께에 똑같이 곱해 비율을 지킨다.
      const safeGap = position.localGap ?? flatSafeGap;
      const safetyScale = metrics.lineLength > 0
        ? clamp((safeGap * input.lengthFillRatio) / metrics.lineLength, 0, 1)
        : 0;
      const finalScale = Math.min(position.depthScale, safetyScale);
      const length = metrics.lineLength * finalScale;
      const strokeWidth = weight * finalScale;
      const halfX = Math.cos(angle) * length * 0.5;
      const halfY = Math.sin(angle) * length * 0.5;
      // 꼭짓점 칸만 가운데가 아니라 바깥쪽으로 밀어 앉힌다 — 가운데를 칸에 맞추면 대각선이라 혼자
      // 격자 밖으로 나간다. square cap의 바깥 꼭지가 모서리에 닿는 자리에서 꼭짓점 쪽으로 더 붙인다.
      const inset = anchorInward
        ? length * 0.5 + (1 - Math.SQRT1_2 - CORNER_OUTWARD_NUDGE) * strokeWidth
        : 0;
      const centerX = position.x + Math.cos(angle) * inset;
      const centerY = position.y + Math.sin(angle) * inset;

      dashes.push({
        x1: centerX + halfX,
        y1: centerY + halfY,
        x2: centerX - halfX,
        y2: centerY - halfY,
        weight: strokeWidth
      });
    }
  }

  return {
    width: viewport.width,
    height: viewport.height,
    backgroundColor: colorway.background,
    lineColor: colorway.line,
    origin,
    dashes
  };
}

// 스케일도 여백도 짧은 변 하나에서 나온다. 축마다 폭·높이 비율을 따로 쓰면 여백비가 그대로
// 화면비가 되고, 같은 간격 값이 축마다 다른 간격으로 그려진다.
function createMetrics(input, viewport) {
  const shortSide = Math.min(viewport.width, viewport.height);
  const scale = shortSide / REFERENCE_BASE;
  const margin = shortSide * MARGIN_RATIO;
  const availableWidth = viewport.width - margin * 2;
  const availableHeight = viewport.height - margin * 2;
  const columns = getAxisCount(availableWidth, input.columnGap * scale);
  const rows = getAxisCount(availableHeight, input.rowGap * scale);

  return {
    columns,
    rows,
    // 여백을 먼저 고정했으므로 맞춰지는 쪽은 간격이다 — 격자가 양 끝 여백선에 정확히 착지한다.
    columnGap: columns > 1 ? availableWidth / (columns - 1) : 0,
    rowGap: rows > 1 ? availableHeight / (rows - 1) : 0,
    horizontalMargin: margin,
    verticalMargin: margin,
    lineLength: input.lineLength * scale,
    minCellGap: input.minCellGap * scale,
    minLineWeight: input.minWeight * scale,
    maxLineWeight: input.maxWeight * scale
  };
}

// 여백 안쪽에 지정 간격으로 들어가는 칸 수. 짝수면 정중앙 칸이 없으므로 항상 홀수로 만든다.
function getAxisCount(available, gap) {
  if (!(gap > 0) || !(available > 0)) return 1;
  const raw = Math.floor(available / gap) + 1;
  return Math.max(1, raw % 2 === 0 ? raw - 1 : raw);
}

// 기준점은 항상 칸에 스냅된다. 그 칸은 압축되지 않으므로 입체에서도 기준 행·열은 수평·수직을 유지한다.
function snapOrigin(input, viewport, metrics) {
  const columnIndex = snapIndex(input.origin.x * viewport.width, metrics.columnGap, metrics.horizontalMargin, metrics.columns);
  const rowIndex = snapIndex(input.origin.y * viewport.height, metrics.rowGap, metrics.verticalMargin, metrics.rows);
  return {
    columnIndex,
    rowIndex,
    origin: {
      x: metrics.horizontalMargin + columnIndex * metrics.columnGap,
      y: metrics.verticalMargin + rowIndex * metrics.rowGap
    }
  };
}

function snapIndex(value, gap, offset, count) {
  if (gap <= 0) return 0;
  return snapToEdge(clamp(Math.round((value - offset) / gap), 0, count - 1), count);
}

// 기준점이 끝에서 EDGE_SNAP_CELLS칸 안쪽에 서면 그쪽이 두 줄 이하로 납작해진다 — 끝으로 붙인다.
function snapToEdge(index, count) {
  const last = count - 1;
  if (index > EDGE_SNAP_CELLS && index < last - EDGE_SNAP_CELLS) return index;
  return index * 2 <= last ? 0 : last;
}

// 기준점 칸을 그대로 두고 거기서 첫 칸 쪽·마지막 칸 쪽으로 각각 따로 압축한다.
function computeAxisLayout(count, gap, minPos, originIndex, minCellGap, depthGamma, depthScaleMin) {
  const positions = new Array(count);
  const scales = new Array(count);
  positions[originIndex] = minPos + originIndex * gap;
  scales[originIndex] = 1;

  applySegment(0);
  applySegment(count - 1);

  function applySegment(toIndex) {
    const segmentCount = Math.abs(toIndex - originIndex) + 1;
    if (segmentCount <= 1) return;

    const step = toIndex > originIndex ? 1 : -1;
    const fromPos = positions[originIndex];
    const farBoundaryPos = minPos + toIndex * gap;
    const idealPositions = [];
    const segmentScales = [];

    for (let k = 0; k < segmentCount; k++) {
      const rawT = k / (segmentCount - 1); // 0=기준점, 1=이 방향의 그리드 경계
      const nearness = 1 - rawT;
      const spatialT = 1 - (1 - rawT) ** depthGamma;
      idealPositions.push(lerp(fromPos, farBoundaryPos, spatialT));
      segmentScales.push(lerp(depthScaleMin, 1, nearness ** depthGamma));
    }

    // 이상 간격에 하한을 걸고 처음부터 다시 누적한다 — 압축된 칸에서도 선들이 뭉치지 않는다.
    const direction = farBoundaryPos >= fromPos ? 1 : -1;
    const segmentPositions = [idealPositions[0]];
    for (let k = 1; k < segmentCount; k++) {
      const idealGap = Math.abs(idealPositions[k] - idealPositions[k - 1]);
      segmentPositions.push(segmentPositions[k - 1] + direction * Math.max(minCellGap, idealGap));
    }

    // 하한 때문에 늘어난 간격이 쌓이면 경계 밖으로 튀어나간다. 기준점을 앵커로 두고 비례 축소한다.
    const actualSpan = Math.abs(segmentPositions[segmentCount - 1] - segmentPositions[0]);
    const allowedSpan = Math.abs(farBoundaryPos - fromPos);
    if (actualSpan > allowedSpan && actualSpan > 0) {
      const overshootFix = allowedSpan / actualSpan;
      for (let k = 0; k < segmentCount; k++) {
        segmentPositions[k] = segmentPositions[0] + (segmentPositions[k] - segmentPositions[0]) * overshootFix;
      }
    }

    for (let k = 0; k < segmentCount; k++) {
      const index = originIndex + step * k;
      positions[index] = segmentPositions[k];
      scales[index] = segmentScales[k];
    }
  }

  // 보정 이후 실제 이웃 간격 — 끝 칸은 한쪽만, 안쪽 칸은 양쪽 평균이다.
  const gaps = [];
  for (let index = 0; index < count; index++) {
    if (count === 1) gaps.push(gap);
    else if (index === 0) gaps.push(Math.abs(positions[1] - positions[0]));
    else if (index === count - 1) gaps.push(Math.abs(positions[count - 1] - positions[count - 2]));
    else gaps.push(Math.abs(positions[index + 1] - positions[index - 1]) / 2);
  }

  return { positions, scales, gaps };
}

function getGridPosition(metrics, layout, row, column) {
  if (!layout) {
    return {
      x: metrics.horizontalMargin + column * metrics.columnGap,
      y: metrics.verticalMargin + row * metrics.rowGap,
      depthScale: 1,
      localGap: null
    };
  }
  return {
    x: layout.column.positions[column],
    y: layout.row.positions[row],
    depthScale: (layout.row.scales[row] + layout.column.scales[column]) / 2,
    localGap: Math.min(layout.row.gaps[row], layout.column.gaps[column])
  };
}

// 각도와 함께 「그 칸을 가운데가 아니라 바깥 끝으로 앉힐지」를 돌려준다 — 꼭짓점 칸에만 쓴다.
function getLineOrientation(input, metrics, position, origin, row, column) {
  if (input.direction === "vertical") return { angle: Math.PI / 2, anchorInward: false };
  if (input.direction === "horizontal") return { angle: 0, anchorInward: false };

  let directionX = origin.x - position.x;
  let directionY = origin.y - position.y;
  let anchorInward = false;

  // 기준점이 칸에 스냅되므로 거리가 정확히 0인 칸이 하나 생기고, 그 칸만 각도를 못 구한다:
  //   - 위/아래 끝 행이면 가로, 왼쪽/오른쪽 끝 열이면 세로
  //   - 안쪽 칸이면 열/행 간격 슬라이더 중 더 좁은 쪽 방향
  //   - 네 꼭짓점이면 안쪽을 향한 대각선(끝 행·끝 열이 만나는 칸이라 하나를 고르면 그 줄이 끊겨 보인다)
  if (directionX === 0 && directionY === 0) {
    const isRowEdge = row === 0 || row === metrics.rows - 1;
    const isColumnEdge = column === 0 || column === metrics.columns - 1;
    // 실제로 그려진 간격이 아니라 슬라이더 값으로 가른다 — 그려진 간격은 두 축이 거의 같아져서
    // 슬라이더 한 칸에 이 칸만 90° 도는 일이 생긴다.
    const preferVertical = input.columnGap > input.rowGap;

    if (isRowEdge && isColumnEdge) {
      directionX = column === 0 ? 1 : -1;
      directionY = row === 0 ? 1 : -1;
      anchorInward = true;
    } else if (isColumnEdge) {
      directionX = 0;
      directionY = 1;
    } else if (isRowEdge) {
      directionX = 1;
      directionY = 0;
    } else if (preferVertical) {
      directionX = 0;
      directionY = 1;
    } else {
      directionX = 1;
      directionY = 0;
    }
  }

  return { angle: Math.atan2(directionY, directionX), anchorInward };
}

// 기준점에서 멀어질수록 얇아진다(선형). 기준은 평면 격자 전체의 대각선 — 기준점을 가장 끝 칸에
// 올렸을 때 두께가 정확히 최솟값이 된다.
function getLineWeight(metrics, position, origin, spanX, spanY) {
  const distance = Math.hypot(origin.x - position.x, origin.y - position.y);
  const maxFalloffDistance = Math.hypot(spanX, spanY);
  const progress = maxFalloffDistance > 0 ? clamp(distance / maxFalloffDistance, 0, 1) : 0;
  return lerp(metrics.maxLineWeight, metrics.minLineWeight, progress);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

// ===== 3. 상태 =====

// 화면 컨트롤이 가진 값. 처음 값은 첫 번째 프리셋이다. 직접 입력 색은 프리셋에 없어 항상 그대로다.
let values = {
  preset: PRESETS[0].key,
  colorway: DEFAULT_INPUT.colorway,
  customBackground: "#FFFFFF",
  customLine: "#000000",
  ...structuredClone(PRESETS[0].values)
};

// 실제 출력 크기(px). 미리보기는 이걸 PREVIEW_MAX_DIM 안으로 축소해서 보여줄 뿐이다.
let size = { width: OUTPUT_PRESETS[0].width, height: OUTPUT_PRESETS[0].height };
const PREVIEW_MAX_DIM = 720;
let previewScale = 1;

function previewSize() {
  previewScale = Math.min(1, PREVIEW_MAX_DIM / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * previewScale)),
    height: Math.max(1, Math.round(size.height * previewScale))
  };
}

function currentScene() {
  return createScene(toInput(values), size);
}

// ===== 4. 프리셋 =====

// 프리셋을 고르면 그 묶음이 다른 값의 새 기본값이 된다. 값이 이전 프리셋 그대로인 것만 따라가고,
// 손댄 값은 그대로 둔다 — 색은 프리셋에 없으므로 항상 그대로다.
function selectPreset(key) {
  const before = PRESETS.find(p => p.key === values.preset).values;
  const next = PRESETS.find(p => p.key === key).values;
  for (const id of Object.keys(next)) {
    if (sameValue(values[id], before[id])) values[id] = structuredClone(next[id]);
  }
  values.preset = key;
  syncPanel();
  redraw();
}

function sameValue(a, b) {
  return typeof a === "object" ? a.x === b.x && a.y === b.y : a === b;
}

// ===== 5. 패널 =====

const $ = id => document.getElementById(id);
const sliderIds = ["columnGap", "rowGap", "minWeight", "maxWeight"];

function setupPanel() {
  document.querySelectorAll(".ratio-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = OUTPUT_PRESETS.find(p => p.key === btn.dataset.size);
      // Custom은 크기를 그대로 두고 편집을 이어간다.
      if (preset) resize({ width: preset.width, height: preset.height });
    });
  });

  for (const axis of ["width", "height"]) {
    const input = $(axis === "width" ? "canvasWidthInput" : "canvasHeightInput");
    input.addEventListener("change", () => {
      const next = parseFloat(input.value);
      if (!(next > 0)) {
        notify("0보다 큰 숫자를 입력해 주세요.");
        syncPanel();
        return;
      }
      resize({ ...size, [axis]: Math.round(next) });
    });
  }

  document.querySelectorAll("#preset-choices .choice-btn").forEach(btn => {
    btn.addEventListener("click", () => selectPreset(btn.dataset.preset));
  });
  document.querySelectorAll("#version-choices .choice-btn").forEach(btn => {
    btn.addEventListener("click", () => setValue("direction", btn.dataset.direction));
  });
  document.querySelectorAll("#viewpoint-choices .choice-btn").forEach(btn => {
    btn.addEventListener("click", () => setValue("viewpoint", btn.dataset.viewpoint));
  });
  document.querySelectorAll(".color-swatch").forEach(btn => {
    btn.addEventListener("click", () => setValue("colorway", btn.dataset.colorway));
  });
  for (const id of sliderIds) {
    $(id).addEventListener("input", () => setValue(id, parseFloat($(id).value)));
  }
  $("weight-toggle").addEventListener("click", () => setValue("variableWeight", !values.variableWeight));
  setupCustomColor("customBackground");
  setupCustomColor("customLine");
  document.querySelectorAll("#motion-choices .choice-btn").forEach(btn => {
    btn.addEventListener("click", () => setMotionMode(btn.dataset.motion));
  });
  $("segmentSeconds").addEventListener("input", () => {
    motion.segmentSeconds = parseFloat($("segmentSeconds").value);
    syncPanel();
  });
  $("path-play").addEventListener("click", togglePlayback);
  $("path-undo").addEventListener("click", undoPathPoint);
  $("path-clear").addEventListener("click", clearPath);
  $("svg-export").addEventListener("click", exportSVG);
  $("video-record").addEventListener("click", toggleRecording);
  $("record-download").addEventListener("click", downloadRecording);
  $("record-discard").addEventListener("click", () => showRecording(null));
  // 버튼을 누르러 가면 기준점이 패널 쪽으로 끌려가므로, 마우스를 캔버스에 둔 채 키로도 시작·정지한다.
  window.addEventListener("keydown", event => {
    if (event.code !== "KeyR" || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest("input, textarea")) return;
    event.preventDefault();
    toggleRecording();
  });

  syncPanel();
}

// 색상 선택기와 HEX 칸 둘 다 같은 값을 고친다. HEX 칸은 입력 중 6자리가 완성되면 바로 반영하고,
// 칸을 벗어날 때 3자리(#FFF)는 늘려서, 잘못된 값은 이전 값으로 되돌린다.
function setupCustomColor(id) {
  const picker = $(`${id}Picker`);
  const hex = $(`${id}Hex`);
  picker.addEventListener("input", () => setValue(id, picker.value.toUpperCase()));
  hex.addEventListener("input", () => {
    const color = parseHexColor(hex.value);
    if (color && hex.value.replace("#", "").length === 6) setValue(id, color);
  });
  hex.addEventListener("change", () => {
    const color = parseHexColor(hex.value);
    if (color) setValue(id, color);
    // 아직 포커스가 남아 있어 syncPanel이 건너뛰었을 수 있으니 정리된 값을 직접 써 둔다.
    hex.value = values[id];
  });
  hex.addEventListener("keydown", event => {
    if (event.key === "Enter") hex.blur();
  });
}

// "#abc", "abc", "#aabbcc", "aabbcc" → "#AABBCC". 아니면 null.
function parseHexColor(text) {
  const raw = text.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${[...raw].map(c => c + c).join("")}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}

function setValue(id, value) {
  values[id] = value;
  syncPanel();
  redraw();
}

// 출력 한도를 먼저 본다 — 한도 밖이면 바꾸지 않고 이유를 남긴다.
function resize(next) {
  if (next.width > MAX_SIDE_PIXELS || next.height > MAX_SIDE_PIXELS || next.width * next.height > MAX_PIXELS) {
    notify("출력 가능한 크기를 초과했습니다. 이전 값을 유지합니다.");
    syncPanel();
    return;
  }
  // 녹화 중에 판 크기가 바뀌면 영상 한 편 안에서 크기가 섞인다 — 거기까지를 한 편으로 저장한다.
  if (recorder) stopRecording();
  size = next;
  notify("");
  const preview = previewSize();
  resizeCanvas(preview.width, preview.height);
  syncPanel();
  redraw();
}

function notify(message, target = "size-notice") {
  $(target).textContent = message;
  $(target).hidden = !message;
}

// 값이 바뀔 때마다 패널 전체를 값에서 다시 그린다 — 선택 상태를 따로 들지 않는다.
function syncPanel() {
  const matched = OUTPUT_PRESETS.find(p => p.width === size.width && p.height === size.height);
  document.querySelectorAll(".ratio-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.size === (matched ? matched.key : "custom"));
  });
  $("canvasWidthInput").value = size.width;
  $("canvasHeightInput").value = size.height;

  const toggleActive = (selector, key, value) =>
    document.querySelectorAll(selector).forEach(btn => btn.classList.toggle("active", btn.dataset[key] === value));
  toggleActive("#preset-choices .choice-btn", "preset", values.preset);
  toggleActive("#version-choices .choice-btn", "direction", values.direction);
  toggleActive("#viewpoint-choices .choice-btn", "viewpoint", values.viewpoint);
  toggleActive(".color-swatch", "colorway", values.colorway);

  $("custom-swatch").style.background = values.customBackground;
  $("custom-swatch-line").style.background = values.customLine;
  $("custom-swatch-caption").style.color = values.customLine;
  $("custom-color").hidden = values.colorway !== "custom";
  for (const id of ["customBackground", "customLine"]) {
    $(`${id}Picker`).value = values[id].toLowerCase();
    // 타이핑 중인 칸은 덮지 않는다 — "#FF"를 치는 도중에 값이 바뀌면 커서가 튄다.
    if (document.activeElement !== $(`${id}Hex`)) $(`${id}Hex`).value = values[id];
  }

  for (const id of sliderIds) {
    $(id).value = values[id];
    $(`v-${id}`).textContent = `${values[id]}px`;
  }
  $("weight-toggle").classList.toggle("on", values.variableWeight);
  $("weight-toggle").setAttribute("aria-pressed", String(values.variableWeight));

  syncMotionPanel();
}

function syncMotionPanel() {
  const isPath = motion.mode === "path";
  const count = motion.points.length;
  const busy = Boolean(playback || recorder);
  document.querySelectorAll("#motion-choices .choice-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.motion === motion.mode);
  });
  $("path-controls").hidden = !isPath;
  $("path-hint").textContent = count
    ? `지점 ${count}개 · ${[...motion.points.map((_, i) => i + 1), 1].join(" → ")}`
    : "캔버스를 클릭해 지점을 순서대로 찍어 주세요. 찍은 지점은 끌어서 옮길 수 있어요.";
  $("segmentSeconds").value = motion.segmentSeconds;
  $("v-segmentSeconds").textContent = `${motion.segmentSeconds.toFixed(1)}초`;
  $("path-play").textContent = playback && !recorder ? "재생 정지" : "경로 재생";
  $("path-play").disabled = count < 2 || Boolean(recorder);
  $("path-undo").disabled = !count || busy;
  $("path-clear").disabled = !count || busy;
  $("record-hint").textContent = isPath
    ? "녹화하면 1번부터 경로를 한 바퀴 돌고, 1번으로 돌아오면 자동으로 멈춰요. R 키로도 시작할 수 있어요."
    : "R 키로도 시작·정지할 수 있어요. 마우스를 캔버스에 둔 채 쓰면 편해요.";
}

// ===== 6. 기준점 =====

// 기준점을 움직이는 방법은 둘이다.
//  - path: 캔버스를 클릭해 찍은 지점을 1 → 2 → … → 마지막 → 1 순서로 한 바퀴 지나간다.
//          녹화하면 이 한 바퀴를 담고, 1번 자리로 돌아오면 저절로 끝난다.
//  - mouse: 마우스를 따라간다. 캔버스를 클릭하면 그 자리에 고정되고, 다시 클릭하면 다시 따라간다.
// 지점은 판 비율(0~1)로 들고 있어서 화면 사이즈를 바꿔도 같은 자리에 남는다.
let motion = { mode: "path", points: [], segmentSeconds: 1.5, draggingIndex: -1 };
let isFrozen = false;
let playback = null;
const CENTER_ORIGIN = { x: 0.5, y: 0.5 };
// 녹화 끝에 1번 자리를 잠깐 붙들어 둔다 — 도착한 프레임이 영상에 확실히 남게.
const PATH_HOLD_SECONDS = 0.4;
// 지점 표시의 반지름과, 그걸 집을 수 있는 거리(미리보기 px). 집는 쪽을 조금 넉넉히 둔다.
const MARKER_RADIUS = 10;
const MARKER_HIT_RADIUS = 14;

// 패널에 기준점 표시가 없으므로 패널을 다시 그리지 않는다 — 입력 중인 너비/높이 칸을 덮지 않게.
function moveOrigin(origin) {
  values.origin = origin;
  redraw();
}

function setupOriginControl(canvas) {
  const pointerOrigin = event => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
    };
  };
  const pointerPixel = event => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  // 재생·녹화 중에 찍거나 옮기면 도는 중인 경로가 바뀌므로 받지 않는다.
  const canEditPath = () => motion.mode === "path" && !playback && !recorder;

  window.addEventListener("mousemove", event => {
    if (motion.draggingIndex >= 0) movePathPoint(motion.draggingIndex, pointerOrigin(event));
    else if (motion.mode === "mouse" && !isFrozen) moveOrigin(pointerOrigin(event));
  });
  window.addEventListener("mouseup", () => {
    if (motion.draggingIndex < 0) return;
    motion.draggingIndex = -1;
    canvas.style.cursor = "";
    redraw();
  });
  // 지점 위에 올라가면 잡을 수 있다는 걸 커서로 알린다.
  canvas.addEventListener("mousemove", event => {
    if (motion.draggingIndex >= 0) return;
    if (!canEditPath()) canvas.style.cursor = "";
    else canvas.style.cursor = pathPointAt(pointerPixel(event)) >= 0 ? "grab" : "crosshair";
  });
  // 지점 위를 누르면 그 지점을 끌고, 빈 곳을 누르면 새 지점을 찍는다.
  canvas.addEventListener("mousedown", event => {
    if (motion.mode === "path") {
      if (!canEditPath()) return;
      event.preventDefault();
      const index = pathPointAt(pointerPixel(event));
      if (index >= 0) {
        motion.draggingIndex = index;
        canvas.style.cursor = "grabbing";
        movePathPoint(index, pointerOrigin(event));
      } else {
        addPathPoint(pointerOrigin(event));
      }
      return;
    }
    isFrozen = !isFrozen;
    if (isFrozen) moveOrigin(pointerOrigin(event));
  });
}

// 겹쳐 있으면 위에 그려진(번호가 큰) 지점을 먼저 잡는다.
function pathPointAt(pixel) {
  for (let index = motion.points.length - 1; index >= 0; index--) {
    const spot = snappedPreviewPoint(motion.points[index]);
    if (Math.hypot(spot.x - pixel.x, spot.y - pixel.y) <= MARKER_HIT_RADIUS) return index;
  }
  return -1;
}

// 끄는 동안 기준점도 그 지점에 붙여, 옮긴 자리의 모양을 바로 보여준다.
function movePathPoint(index, point) {
  motion.points[index] = point;
  moveOrigin(point);
}

function setMotionMode(mode) {
  if (recorder) stopRecording();
  stopPlayback();
  motion.mode = mode;
  isFrozen = false;
  if (mode === "path") moveOrigin(motion.points.at(-1) ?? CENTER_ORIGIN);
  syncPanel();
}

// 방금 찍은 지점으로 기준점을 옮겨 두어, 찍는 즉시 그 자리 모양을 보여준다.
function addPathPoint(point) {
  motion.points.push(point);
  moveOrigin(point);
  syncPanel();
}

function undoPathPoint() {
  motion.points.pop();
  moveOrigin(motion.points.at(-1) ?? CENTER_ORIGIN);
  syncPanel();
}

function clearPath() {
  motion.points = [];
  moveOrigin(CENTER_ORIGIN);
  syncPanel();
}

// 한 바퀴: 1 → 2 → … → 마지막 → 1. 구간마다 같은 시간을 쓰고, 천천히 출발해 천천히 도착한다.
// onDone이 있으면(녹화) 끝에 PATH_HOLD_SECONDS만큼 1번 자리에 머문 뒤 부른다.
function playPath(onDone) {
  if (motion.points.length < 2) {
    notify("지점을 2개 이상 찍어 주세요.", "record-notice");
    return false;
  }
  stopPlayback();
  notify("", "record-notice");
  const stops = [...motion.points, motion.points[0]];
  const segmentMs = motion.segmentSeconds * 1000;
  const travelMs = (stops.length - 1) * segmentMs;
  const holdMs = onDone ? PATH_HOLD_SECONDS * 1000 : 0;
  const startedAt = performance.now();
  // 첫 프레임이 1번 자리에서 시작하도록 바로 옮겨 둔다 — 녹화가 이 프레임부터 담는다.
  moveOrigin(stops[0]);

  const current = { frame: 0, onDone };
  playback = current;
  const tick = now => {
    if (playback !== current) return;
    // rAF 시각은 그 프레임이 시작된 때라 시작 직후엔 startedAt보다 앞설 수 있다 — 0 아래로 내려가지 않게 막는다.
    const elapsed = Math.max(0, now - startedAt);
    const traveled = Math.min(elapsed, travelMs);
    const index = clamp(Math.floor(traveled / segmentMs), 0, stops.length - 2);
    const progress = easeInOut((traveled - index * segmentMs) / segmentMs);
    const from = stops[index];
    const to = stops[index + 1];
    moveOrigin({ x: lerp(from.x, to.x, progress), y: lerp(from.y, to.y, progress) });
    if (elapsed >= travelMs + holdMs) {
      playback = null;
      syncPanel();
      current.onDone?.();
      return;
    }
    current.frame = requestAnimationFrame(tick);
  };
  current.frame = requestAnimationFrame(tick);
  syncPanel();
  return true;
}

function stopPlayback() {
  if (!playback) return;
  cancelAnimationFrame(playback.frame);
  playback = null;
  syncPanel();
}

function togglePlayback() {
  if (playback) stopPlayback();
  else playPath();
}

function easeInOut(t) {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
}

// ===== 7. p5 =====

// 그래픽은 정적이라 애니메이션 루프가 없다 — 값이 바뀔 때만 다시 그린다.
function setup() {
  const preview = previewSize();
  const canvas = createCanvas(preview.width, preview.height);
  canvas.parent("canvas-wrap");
  pixelDensity(2);
  strokeCap(SQUARE);
  noLoop();
  setupOriginControl(canvas.elt);
  setupPanel();
}

// 좌표는 항상 실제 크기 기준으로 계산하고, 화면에 그릴 때만 미리보기 비율로 축소한다.
function draw() {
  const scene = currentScene();
  background(scene.backgroundColor);
  push();
  scale(previewScale);
  stroke(scene.lineColor);
  noFill();
  for (const dash of scene.dashes) {
    strokeWeight(dash.weight);
    line(dash.x1, dash.y1, dash.x2, dash.y2);
  }
  pop();
  drawPathMarkers();
}

// 찍은 지점 번호와 도는 순서(마지막 → 1 포함)를 미리보기에만 겹쳐 그린다 — SVG·영상에는 들어가지 않는다.
// 기준점은 칸에 스냅되므로, 표시도 클릭한 자리가 아니라 실제로 기준점이 앉는 칸에 둔다.
function drawPathMarkers() {
  if (motion.mode !== "path" || !motion.points.length) return;
  const spots = motion.points.map(snappedPreviewPoint);
  push();
  noFill();
  stroke(255, 170);
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  beginShape();
  for (const spot of spots) vertex(spot.x, spot.y);
  endShape(CLOSE);
  drawingContext.setLineDash([]);
  textAlign(CENTER, CENTER);
  textSize(11);
  textStyle(BOLD);
  spots.forEach((spot, index) => {
    const isDragging = index === motion.draggingIndex;
    stroke(255);
    strokeWeight(isDragging ? 2.5 : 1.5);
    fill(0, 175, 65);
    circle(spot.x, spot.y, (isDragging ? MARKER_RADIUS + 3 : MARKER_RADIUS) * 2);
    noStroke();
    fill(255);
    text(index + 1, spot.x, spot.y + 0.5);
  });
  pop();
}

function snappedPreviewPoint(point) {
  const input = toInput({ ...values, origin: point });
  const { origin } = snapOrigin(input, size, createMetrics(input, size));
  return { x: origin.x * previewScale, y: origin.y * previewScale };
}

// ===== 8. SVG 내보내기 =====

// 실제 크기 그대로 나간다. 단위 없는 width·height는 뷰어가 pt(72dpi)로 읽으므로 물리 크기는 mm로
// 적고, 좌표계는 viewBox가 px로 유지한다.
function sceneToSVG(scene) {
  const fixed = value => value.toFixed(2);
  const mm = px => fixed((px / EXPORT_PPI) * 25.4);
  const lines = scene.dashes.map(dash =>
    `  <line x1="${fixed(dash.x1)}" y1="${fixed(dash.y1)}" x2="${fixed(dash.x2)}" y2="${fixed(dash.y2)}" stroke="${scene.lineColor}" stroke-width="${fixed(dash.weight)}" stroke-linecap="square" />`
  ).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${mm(scene.width)}mm" height="${mm(scene.height)}mm" viewBox="0 0 ${scene.width} ${scene.height}">
  <rect width="${scene.width}" height="${scene.height}" fill="${scene.backgroundColor}" />
${lines}
</svg>`;
}

// 파일명: 이름-한국시각 (예: Key-Visual-Pattern-20261019-153012.svg)
function exportFileName(at, extension = "svg") {
  const timestamp = new Date(at.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, "")
    .replace("T", "-");
  return `${EXPORT_NAME.replace(/\s+/g, "-")}-${timestamp}.${extension}`;
}

function exportSVG() {
  downloadBlob(new Blob([sceneToSVG(currentScene())], { type: "image/svg+xml" }), exportFileName(new Date()));
}

// 큰 영상은 클릭 직후 URL을 거두면 저장이 끊길 수 있어 조금 뒤에 거둔다.
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ===== 9. 영상 녹화 =====

// 화면의 축소 미리보기가 아니라 실제 크기 캔버스를 따로 두고 같은 장면(createScene)을 그려 녹화한다.
// 그래서 영상 크기는 「실제 사이즈」와 같고, 커서는 찍히지 않는다.
const RECORD_FPS = 30;
const RECORD_MAX_SIDE = 4096;       // 브라우저 H.264 인코더가 안정적으로 받는 한 변의 한도
// 앞에서부터 이 브라우저가 지원하는 첫 형식을 쓴다 — MP4가 안 되면 WebM으로 내려간다.
const RECORD_MIME_TYPES = [
  "video/mp4;codecs=avc1.640033",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm"
];

let recorder = null;
// 마지막으로 녹화한 영상 — 다운로드하거나 버리기 전까지 미리보기에 남는다.
let lastRecording = null;

function pickRecordMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  return RECORD_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) ?? null;
}

function toggleRecording() {
  if (recorder) stopRecording();
  else if (motion.mode === "path") startPathRecording();
  else startRecording();
}

// 경로를 1번 자리에 세운 다음 녹화를 켠다 — 영상 첫 프레임이 1번이고, 한 바퀴 돌아 1번에서 끝난다.
function startPathRecording() {
  if (!playPath(stopRecording)) return;
  if (!startRecording()) stopPlayback();
}

function startRecording() {
  const mimeType = pickRecordMimeType();
  if (!mimeType) {
    notify("이 브라우저는 영상 녹화를 지원하지 않습니다. Chrome이나 Safari 최신 버전에서 열어 주세요.", "record-notice");
    return false;
  }
  if (size.width > RECORD_MAX_SIDE || size.height > RECORD_MAX_SIDE) {
    notify(`영상은 한 변 ${RECORD_MAX_SIDE}px까지 녹화할 수 있습니다.`, "record-notice");
    return false;
  }

  // H.264는 홀수 크기를 받지 못한다 — 홀수 변만 1px 늘리고 그 줄은 배경색으로 채운다.
  const canvas = document.createElement("canvas");
  canvas.width = size.width + (size.width % 2);
  canvas.height = size.height + (size.height % 2);
  const context = canvas.getContext("2d");
  drawSceneTo(context, canvas, currentScene());

  const stream = canvas.captureStream(RECORD_FPS);
  let media;
  try {
    media = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: recordBitrate(canvas) });
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    notify("녹화를 시작하지 못했습니다. 크기를 줄여 다시 시도해 주세요.", "record-notice");
    return false;
  }

  const chunks = [];
  const startedAt = new Date();
  const extension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
  media.addEventListener("dataavailable", event => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  // 정지하면 바로 저장하지 않고 미리보기로 띄운다 — 보고 나서 다운로드할지 버릴지 고른다.
  media.addEventListener("stop", () => {
    stream.getTracks().forEach(track => track.stop());
    if (!chunks.length) {
      notify("녹화된 내용이 없습니다.", "record-notice");
      $("record-result").hidden = !lastRecording;
      return;
    }
    showRecording({
      blob: new Blob(chunks, { type: mimeType }),
      fileName: exportFileName(startedAt, extension),
      width: canvas.width,
      height: canvas.height,
      seconds: (Date.now() - startedAt.getTime()) / 1000,
      format: extension.toUpperCase()
    });
  });
  media.addEventListener("error", () => {
    notify("녹화 중 오류가 났습니다.", "record-notice");
    stopRecording();
  });

  recorder = { media, startedAt, frame: 0 };
  // 녹화하는 동안 이전 미리보기는 가려 둔다. 새 영상이 생기면 그때 바뀐다.
  $("record-video").pause();
  $("record-result").hidden = true;
  // 미리보기는 값이 바뀔 때만 그리지만, 영상은 멈춰 있는 동안에도 프레임이 이어져야 해서 매 프레임 그린다.
  const tick = () => {
    if (!recorder || recorder.media !== media) return;
    drawSceneTo(context, canvas, currentScene());
    syncRecordButton();
    recorder.frame = requestAnimationFrame(tick);
  };
  media.start(1000);
  notify("", "record-notice");
  tick();
  syncPanel();
  return true;
}

// 녹화를 중간에 멈추면 돌던 경로도 같이 멈춘다.
function stopRecording() {
  if (!recorder) return;
  const { media, frame } = recorder;
  recorder = null;
  cancelAnimationFrame(frame);
  if (media.state !== "inactive") media.stop();
  stopPlayback();
  syncRecordButton();
  syncPanel();
}

// 화질은 픽셀 수에 비례해 잡고, 너무 작거나 큰 판에서 양 끝을 막는다.
function recordBitrate(canvas) {
  return Math.round(clamp(canvas.width * canvas.height * RECORD_FPS * 0.2, 4e6, 40e6));
}

function drawSceneTo(context, canvas, scene) {
  context.fillStyle = scene.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = scene.lineColor;
  context.lineCap = "square";
  for (const dash of scene.dashes) {
    context.lineWidth = dash.weight;
    context.beginPath();
    context.moveTo(dash.x1, dash.y1);
    context.lineTo(dash.x2, dash.y2);
    context.stroke();
  }
}

// null을 넘기면 미리보기를 닫고 영상을 버린다.
function showRecording(recording) {
  const video = $("record-video");
  if (lastRecording) URL.revokeObjectURL(lastRecording.url);
  lastRecording = recording ? { ...recording, url: URL.createObjectURL(recording.blob) } : null;
  $("record-result").hidden = !lastRecording;
  if (!lastRecording) {
    video.removeAttribute("src");
    video.load();
    return;
  }
  video.src = lastRecording.url;
  video.play().catch(() => {});
  const megabytes = (recording.blob.size / 1024 / 1024).toFixed(1);
  $("record-meta").textContent =
    `${recording.width} × ${recording.height} · ${recording.seconds.toFixed(1)}초 · ${recording.format} · ${megabytes}MB`;
}

function downloadRecording() {
  if (lastRecording) downloadBlob(lastRecording.blob, lastRecording.fileName);
}

function syncRecordButton() {
  const button = $("video-record");
  button.classList.toggle("recording", Boolean(recorder));
  button.setAttribute("aria-pressed", String(Boolean(recorder)));
  if (!recorder) {
    button.textContent = "영상 녹화 시작";
    return;
  }
  const seconds = Math.floor((Date.now() - recorder.startedAt.getTime()) / 1000);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  button.textContent = `● 녹화 중지 ${clock}`;
}
