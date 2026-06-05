import type {
  CanvasAnnotationSnapshot,
  CanvasGenerationContext,
  ExportRequest,
  LightingMoodTemplate,
  NightRenderTimeRange,
  SceneType,
  StyleReference
} from "../types/nightRender";

export interface NightRenderPayloadInput {
  projectId: string;
  imageFile: File;
  sceneType: SceneType;
  template: LightingMoodTemplate;
  styleReference: StyleReference;
  canvas: CanvasGenerationContext;
  prompt: string;
  negativePrompts: string[];
  outputSize: ExportRequest["type"];
}

export interface ApiPoint {
  x: number;
  y: number;
}

export interface ApiFixtureAnnotation {
  id: string;
  label: string;
  category: "fixture" | "edit";
  type: "point" | "line" | "direction" | "area";
  fixtureType?: string;
  color: string;
  size: {
    radius?: number;
    width?: number;
    height?: number;
    length?: number;
    strokeWidth?: number;
  };
  coordinates: {
    point?: ApiPoint;
    points?: ApiPoint[];
    rect?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  normalizedCoordinates: unknown;
}

export interface NightRenderApiPayload {
  projectId: string;
  sourceImage: {
    name: string;
    type: string;
    size: number;
  };
  sceneType: SceneType;
  template: LightingMoodTemplate;
  timeRange: NightRenderTimeRange;
  prompt: string;
  finalPrompt: string;
  negativePrompts: string[];
  preserveConstraints: string[];
  annotations: ApiFixtureAnnotation[];
  output: {
    resolution: ExportRequest["type"];
    size: string;
    ratio: "自动适配";
    format: "PNG";
  };
  styleReference: {
    id: string;
    title: string;
    template: LightingMoodTemplate;
  };
}

const preserveConstraints = [
  "不改变建筑结构",
  "不改变原图视角",
  "不改变透视关系",
  "不改变树木",
  "不改变地砖和地面铺装",
  "不改变人物",
  "不改变窗户位置",
  "不增加多余建筑构件"
];

const outputSizeMap: Record<ExportRequest["type"], string> = {
  "2K": "2048x1152",
  "4K": "3840x2160",
  "6K": "6144x3456",
  "8K": "7680x4320",
  汇报版式: "3840x2160",
  对比图: "3840x2160"
};

const fixtureColorMap: Record<string, string> = {
  洗墙灯: "#22D3EE",
  投光灯: "#3B82F6",
  线性灯: "#FACC15",
  线性灯带: "#FACC15",
  地埋灯: "#22C55E",
  点光源: "#EF4444",
  像素灯: "#A855F7",
  轮廓灯: "#F97316",
  树灯: "#92400E"
};

const editColorMap: Record<string, string> = {
  repaint: "#FACC15",
  mask: "#22D3EE",
  avoid: "#A855F7"
};

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function roundCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizePoint(point: ApiPoint, width: number, height: number) {
  return {
    x: roundCoordinate(point.x / width),
    y: roundCoordinate(point.y / height)
  };
}

function getLineLength(points: ApiPoint[]) {
  if (points.length < 2) {
    return 0;
  }

  return Math.round(Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y));
}

function buildLineAnnotation(
  annotation: Extract<CanvasAnnotationSnapshot, { type: "fixtureLine" }>,
  viewBox: CanvasGenerationContext["viewBox"]
): ApiFixtureAnnotation | null {
  const points = [
    { x: annotation.x1, y: annotation.y1 },
    { x: annotation.x2, y: annotation.y2 }
  ];

  if (!points.every((point) => isFiniteNumber(point.x) && isFiniteNumber(point.y))) {
    return null;
  }

  return {
    id: annotation.id,
    label: annotation.label,
    category: "fixture",
    type: "line",
    fixtureType: annotation.fixture,
    color: fixtureColorMap[annotation.fixture] ?? "#A78BFA",
    size: {
      length: getLineLength(points),
      strokeWidth: annotation.kind === "wash" ? 6 : 4
    },
    coordinates: {
      points: points.map((point) => ({
        x: roundCoordinate(point.x),
        y: roundCoordinate(point.y)
      }))
    },
    normalizedCoordinates: {
      points: points.map((point) =>
        normalizePoint(point, viewBox.width, viewBox.height)
      )
    }
  };
}

function buildDirectionAnnotation(
  annotation: Extract<CanvasAnnotationSnapshot, { type: "fixtureDirection" }>,
  viewBox: CanvasGenerationContext["viewBox"]
): ApiFixtureAnnotation | null {
  const points = [
    { x: annotation.x, y: annotation.y },
    { x: annotation.targetX, y: annotation.targetY }
  ];

  if (!points.every((point) => isFiniteNumber(point.x) && isFiniteNumber(point.y))) {
    return null;
  }

  return {
    id: annotation.id,
    label: annotation.label,
    category: "fixture",
    type: "direction",
    fixtureType: annotation.fixture,
    color: fixtureColorMap[annotation.fixture] ?? "#A78BFA",
    size: {
      radius: 8,
      length: getLineLength(points),
      strokeWidth: 3
    },
    coordinates: {
      points: points.map((point) => ({
        x: roundCoordinate(point.x),
        y: roundCoordinate(point.y)
      }))
    },
    normalizedCoordinates: {
      origin: normalizePoint(points[0], viewBox.width, viewBox.height),
      target: normalizePoint(points[1], viewBox.width, viewBox.height)
    }
  };
}

function buildPointAnnotation(
  annotation: Extract<CanvasAnnotationSnapshot, { type: "fixturePoint" }>,
  viewBox: CanvasGenerationContext["viewBox"]
): ApiFixtureAnnotation | null {
  const point = { x: annotation.x, y: annotation.y };

  if (!isFiniteNumber(point.x) || !isFiniteNumber(point.y)) {
    return null;
  }

  return {
    id: annotation.id,
    label: annotation.label,
    category: "fixture",
    type: "point",
    fixtureType: annotation.fixture,
    color: fixtureColorMap[annotation.fixture] ?? "#A78BFA",
    size: {
      radius: 7
    },
    coordinates: {
      point: {
        x: roundCoordinate(point.x),
        y: roundCoordinate(point.y)
      }
    },
    normalizedCoordinates: {
      point: normalizePoint(point, viewBox.width, viewBox.height)
    }
  };
}

function buildAreaAnnotation(
  annotation: Extract<CanvasAnnotationSnapshot, { type: "fixtureArea" | "area" }>,
  viewBox: CanvasGenerationContext["viewBox"]
): ApiFixtureAnnotation | null {
  if (
    ![annotation.x, annotation.y, annotation.width, annotation.height].every(isFiniteNumber) ||
    annotation.width <= 0 ||
    annotation.height <= 0
  ) {
    return null;
  }

  const isFixtureArea = annotation.type === "fixtureArea";
  const fixtureType = isFixtureArea ? annotation.fixture : undefined;
  const color = isFixtureArea
    ? fixtureColorMap[annotation.fixture] ?? "#A78BFA"
    : editColorMap[annotation.kind] ?? "#A78BFA";

  return {
    id: annotation.id,
    label: annotation.label,
    category: isFixtureArea ? "fixture" : "edit",
    type: "area",
    fixtureType,
    color,
    size: {
      width: Math.round(annotation.width),
      height: Math.round(annotation.height)
    },
    coordinates: {
      rect: {
        x: roundCoordinate(annotation.x),
        y: roundCoordinate(annotation.y),
        width: roundCoordinate(annotation.width),
        height: roundCoordinate(annotation.height)
      }
    },
    normalizedCoordinates: {
      rect: {
        x: roundCoordinate(annotation.x / viewBox.width),
        y: roundCoordinate(annotation.y / viewBox.height),
        width: roundCoordinate(annotation.width / viewBox.width),
        height: roundCoordinate(annotation.height / viewBox.height)
      }
    }
  };
}

export function buildApiAnnotations(canvas: CanvasGenerationContext) {
  return canvas.annotations.flatMap((annotation) => {
    if (annotation.type === "fixtureLine") {
      const item = buildLineAnnotation(annotation, canvas.viewBox);
      return item ? [item] : [];
    }

    if (annotation.type === "fixtureDirection") {
      const item = buildDirectionAnnotation(annotation, canvas.viewBox);
      return item ? [item] : [];
    }

    if (annotation.type === "fixturePoint") {
      const item = buildPointAnnotation(annotation, canvas.viewBox);
      return item ? [item] : [];
    }

    const item = buildAreaAnnotation(annotation, canvas.viewBox);
    return item ? [item] : [];
  });
}

function buildAnnotationInstruction(annotations: ApiFixtureAnnotation[]) {
  if (annotations.length === 0) {
    return "未添加灯具标注时，请根据建筑立面和场景参考生成克制、专业的夜景照明。";
  }

  return annotations
    .filter((annotation) => annotation.category === "fixture")
    .map((annotation) => {
      const position =
        annotation.type === "area"
          ? JSON.stringify(annotation.normalizedCoordinates)
          : JSON.stringify(annotation.coordinates);
      return `${annotation.fixtureType} 使用 ${annotation.color} 标注，类型 ${annotation.type}，位置 ${position}`;
    })
    .join("；");
}

export function buildFinalPrompt(payload: Omit<NightRenderApiPayload, "finalPrompt">) {
  return [
    "将用户上传的白天建筑照片转换为专业夜景照明效果图。",
    `时间段：${payload.timeRange}。`,
    `场景类型：${payload.sceneType}。`,
    `风格模板：${payload.template}。`,
    `用户补充指令：${payload.prompt || "无"}。`,
    `灯具标注要求：${buildAnnotationInstruction(payload.annotations)}。`,
    `输出分辨率：${payload.output.resolution}，目标尺寸 ${payload.output.size}。`,
    `硬性保持约束：${payload.preserveConstraints.join("、")}。`,
    `负面约束：${payload.negativePrompts.join("、")}。`,
    "绝对不能改变原图建筑结构、视角、树木、地砖、人物和透视关系。只调整夜景光环境、灯具光效、室内透光和整体氛围。"
  ].join("\n");
}

export function buildNightRenderApiPayload(input: NightRenderPayloadInput) {
  const annotations = buildApiAnnotations(input.canvas);
  const basePayload: Omit<NightRenderApiPayload, "finalPrompt"> = {
    projectId: input.projectId,
    sourceImage: {
      name: input.imageFile.name,
      type: input.imageFile.type,
      size: input.imageFile.size
    },
    sceneType: input.sceneType,
    template: input.template,
    timeRange: input.canvas.timeRange,
    prompt: input.prompt.trim(),
    negativePrompts: input.negativePrompts,
    preserveConstraints,
    annotations,
    output: {
      resolution: input.outputSize,
      size: outputSizeMap[input.outputSize] ?? outputSizeMap["4K"],
      ratio: "自动适配",
      format: "PNG"
    },
    styleReference: {
      id: input.styleReference.id,
      title: input.styleReference.title,
      template: input.styleReference.template
    }
  };

  return {
    ...basePayload,
    finalPrompt: buildFinalPrompt(basePayload)
  };
}
