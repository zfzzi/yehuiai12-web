export type ReferenceImageRole =
  | "primary"
  | "tone"
  | "fixturePlan"
  | "style"
  | "floorPlan";

export type ReferenceStatus = "missing" | "ready" | "queued";

export interface ReferenceImage {
  id: string;
  role: ReferenceImageRole;
  label: string;
  hint: string;
  fileName?: string;
  previewUrl?: string;
  status: ReferenceStatus;
}

export interface StyleReference {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  sceneType: SceneType;
  template: LightingMoodTemplate;
  tone: "outdoor" | "indoor" | "facade" | "commercial";
}

export type SceneType =
  | "建筑立面夜景"
  | "商业街区夜景"
  | "商场室内"
  | "酒店大堂"
  | "办公空间"
  | "滨水空间"
  | "公园景观"
  | "广场装置"
  | "桥梁夜景"
  | "展厅空间"
  | "文旅夜游"
  | "灯光艺术装置";

export type LightingMoodTemplate =
  | "高级蓝调夜景"
  | "暖白商业氛围"
  | "城市商务质感"
  | "国际艺术节风格"
  | "轻奢商业空间"
  | "科技未来感"
  | "东方美学"
  | "节日灯光氛围"
  | "月光冷调"
  | "傍晚蓝调"
  | "深夜高级感"
  | "内透灯光增强";

export interface LightingParams {
  colorTemperature: number;
  brightness: number;
  halo: number;
  interiorGlow: number;
  shadow: number;
  blueTone: number;
  warmLight: number;
  glareControl: number;
  overexposureRepair: number;
  warmCoolContrast: "弱" | "中" | "强";
}

export type CanvasLock =
  | "建筑结构"
  | "透视关系"
  | "人物"
  | "树木"
  | "地面铺装"
  | "天空"
  | "灯具";

export type CanvasTool =
  | "局部重绘"
  | "遮罩选择"
  | "标注灯位"
  | "禁止修改";

export interface CanvasAnnotation {
  id: string;
  label: string;
  type: "point" | "line" | "area";
  intent: "fixture" | "wash" | "preserve" | "avoid" | "brighten";
}

export interface GenerationRequest {
  projectId: string;
  references: Array<{
    role: ReferenceImageRole;
    fileName?: string;
    status: ReferenceStatus;
  }>;
  sceneType: SceneType;
  template: LightingMoodTemplate;
  params: LightingParams;
  prompt: string;
  negativePrompts: string[];
  locks: CanvasLock[];
  annotations: CanvasAnnotation[];
  styleReference: {
    id: string;
    title: string;
    template: LightingMoodTemplate;
  };
  output: {
    size: "2K" | "4K" | "6K" | "8K" | "16K";
    ratio: "16:9" | "3:4" | "1:1" | "自动适配";
    format: "PNG" | "JPG" | "TIFF";
  };
}

export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export interface GenerationResponse {
  status: GenerationStatus;
  resultImageUrl?: string;
  versionId?: string;
  error?: string;
}

export interface PromptOptimizationResponse {
  optimizedPrompt: string;
}

export interface ProjectVersion {
  id: string;
  title: string;
  note: string;
  status: "原始" | "修改" | "候选" | "汇报";
}

export interface ExportRequest {
  projectId: string;
  versionId: string;
  type: "2K" | "4K" | "6K" | "8K" | "汇报版式" | "对比图";
}
