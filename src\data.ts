import type {
  CanvasAnnotation,
  CanvasLock,
  LightingMoodTemplate,
  LightingParams,
  ProjectVersion,
  ReferenceImage,
  SceneType,
  StyleReference
} from "./types/nightRender";

export const sceneTypes: SceneType[] = [
  "建筑立面夜景",
  "商业街区夜景",
  "商场室内",
  "酒店大堂",
  "办公空间",
  "滨水空间",
  "公园景观",
  "广场装置",
  "桥梁夜景",
  "展厅空间",
  "文旅夜游",
  "灯光艺术装置"
];

export const moodTemplates: LightingMoodTemplate[] = [
  "高级蓝调夜景",
  "暖白商业氛围",
  "城市商务质感",
  "国际艺术节风格",
  "轻奢商业空间",
  "科技未来感",
  "东方美学",
  "节日灯光氛围",
  "月光冷调",
  "傍晚蓝调",
  "深夜高级感",
  "内透灯光增强"
];

export const fixtureGroups = [
  {
    title: "室外灯具",
    items: ["投光灯", "洗墙灯", "线性灯", "地埋灯", "点光源", "像素灯", "轮廓灯", "树灯"]
  },
  {
    title: "室内灯具",
    items: ["线性灯带", "筒灯", "射灯", "磁吸轨道灯", "吊灯", "暗藏灯槽", "发光软膜", "灯箱"]
  }
];

export const negativePromptOptions = [
  "不改变建筑结构",
  "不改变透视",
  "不改变窗户位置",
  "不改变地砖",
  "不增加多余灯具",
  "不过度曝光",
  "不失真",
  "不模糊",
  "不乱加内透",
  "不改变人物和树木"
];

export const canvasLocks: CanvasLock[] = [
  "建筑结构",
  "透视关系",
  "人物",
  "树木",
  "地面铺装",
  "天空",
  "灯具"
];

export const defaultReferences: ReferenceImage[] = [
  {
    id: "primary",
    role: "primary",
    label: "主图上传",
    hint: "上传建筑、景观或室内照片",
    status: "missing"
  },
  {
    id: "fixturePlan",
    role: "fixturePlan",
    label: "灯具布点图",
    hint: "上传点位、方向、洗墙范围",
    status: "missing"
  },
  {
    id: "floorPlan",
    role: "floorPlan",
    label: "平面图上传",
    hint: "上传平面或立面辅助图",
    status: "missing"
  }
];

export const styleReferences: StyleReference[] = [
  {
    id: "scene-outdoor",
    title: "室外夜景",
    subtitle: "广场、园区、滨水空间",
    description: "保留环境层次，强化天光、铺装反射和室外灯具秩序。",
    sceneType: "滨水空间",
    template: "高级蓝调夜景",
    tone: "outdoor"
  },
  {
    id: "scene-indoor",
    title: "室内灯光",
    subtitle: "商场、酒店、办公空间",
    description: "强调内透、吊顶层次、暗藏灯槽和重点照明。",
    sceneType: "商场室内",
    template: "内透灯光增强",
    tone: "indoor"
  },
  {
    id: "scene-facade",
    title: "建筑立面",
    subtitle: "幕墙、入口、檐口轮廓",
    description: "适合立面洗墙、线性轮廓、入口重点和窗口内透。",
    sceneType: "建筑立面夜景",
    template: "城市商务质感",
    tone: "facade"
  },
  {
    id: "scene-commercial",
    title: "商业空间",
    subtitle: "街区、橱窗、标识灯箱",
    description: "强化店招、橱窗、灯箱与街区消费氛围。",
    sceneType: "商业街区夜景",
    template: "暖白商业氛围",
    tone: "commercial"
  }
];

export const defaultParams: LightingParams = {
  colorTemperature: 3500,
  brightness: 62,
  halo: 36,
  interiorGlow: 58,
  shadow: 44,
  blueTone: 64,
  warmLight: 48,
  glareControl: 72,
  overexposureRepair: 40,
  warmCoolContrast: "中"
};

export const versions: ProjectVersion[] = [
  {
    id: "v1",
    title: "V1 原始上传",
    note: "主图与约束已记录",
    status: "原始"
  },
  {
    id: "v2",
    title: "V2 当前方案",
    note: "等待生成结果写入",
    status: "修改"
  },
  {
    id: "v3",
    title: "V3 局部修改",
    note: "用于圈选调整",
    status: "修改"
  },
  {
    id: "v4",
    title: "V4 方案分支",
    note: "保留不同灯光策略",
    status: "候选"
  },
  {
    id: "v5",
    title: "V5 汇报候选",
    note: "用于导出对比图",
    status: "候选"
  },
  {
    id: "v6",
    title: "V6 最终版",
    note: "生成后可锁定交付",
    status: "汇报"
  }
];

export const annotations: CanvasAnnotation[] = [
  {
    id: "a1",
    label: "底部洗墙范围",
    type: "line",
    intent: "wash"
  },
  {
    id: "a2",
    label: "主入口内透",
    type: "area",
    intent: "brighten"
  },
  {
    id: "a3",
    label: "保留窗格结构",
    type: "area",
    intent: "preserve"
  },
  {
    id: "a4",
    label: "投光灯位",
    type: "point",
    intent: "fixture"
  }
];

export const initialPrompt =
  "生成傍晚 18 点到 19 点的蓝调夜景效果，建筑立面偏冷蓝，底部洗墙灯为暖白色，增加室内内透，但不要改变建筑结构、树木、地砖和透视关系。";
