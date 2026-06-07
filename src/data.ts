import type {
  LightingMoodTemplate,
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

export const defaultReferences: ReferenceImage[] = [
  {
    id: "primary",
    role: "primary",
    label: "主图上传",
    hint: "上传建筑、景观或室内照片",
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

export const initialPrompt = "";
