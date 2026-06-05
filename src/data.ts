import type {
  LightingMoodTemplate,
  OutdoorSeason,
  OutdoorTimeRange,
  OutdoorWeather,
  ReferenceImage,
  SceneType,
  SceneModeSelection,
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

export const outdoorSceneOptions = {
  seasons: ["春", "夏", "秋", "冬"] as OutdoorSeason[],
  timeRanges: [
    "17:00-19:00",
    "19:00-20:00",
    "20:00-22:00",
    "22:00-24:00",
    "00:00-"
  ] as OutdoorTimeRange[],
  weathers: [
    "晴朗",
    "多云",
    "雾气",
    "雨天",
    "雪天",
    "星空",
    "极光"
  ] as OutdoorWeather[]
};

export const defaultSceneModeSelection: SceneModeSelection = {
  mode: "outdoor",
  outdoor: {
    season: "春",
    timeRange: "17:00-19:00",
    weather: "晴朗"
  }
};

export const outdoorLightingPresetPrompt = [
  "建筑效果图，蓝调时刻的现代高端大平层住宅区夜景，完全复刻原图建筑立面设计与场地布局，大面积玻璃幕墙搭配香槟金金属线条，对称式三栋塔楼。",
  "天空呈现从地平线浅蓝到头顶钴蓝的自然渐变，保留日落之后的暮光余韵，云层稀薄通透。建筑照明系统精准：顶部悬挑屋檐采用暖金色泛光洗亮轮廓；每层横向阳台板下隐藏暖白色线性灯带，形成连续的水平光带；玻璃幕墙内透出温暖的黄色室内灯光，窗户亮灯随机分布，部分窗户可见室内家具轮廓；底层架空层和主入口采用暖白色重点照明，凸显入口仪式感。",
  "景观照明层次丰富：低矮灌木用埋地灯向上打亮，高大乔木用投光灯照亮树冠；广场铺装地面有均匀的步道灯照明，地面带有轻微雨后湿润的反光效果，清晰倒映建筑灯光；少量行人在广场行走，带有柔和的暖光轮廓；右下角停放的黑色轿车车灯关闭，车身反射建筑灯光。",
  "整体光影柔和自然，无过曝区域，蓝金配色高级协调，氛围感拉满，V-Ray 5.0 超写实渲染，8K 分辨率，35mm 焦段，专业建筑摄影视角，色彩准确，细节锐利，景深适中。"
].join("\n");

export function buildSceneModePrompt(selection: SceneModeSelection) {
  if (selection.mode === "indoor") {
    return "室内照明模式预留中，当前仅测试室外照明生成。";
  }

  return [
    outdoorLightingPresetPrompt,
    `场景模式：室外照明。季节：${selection.outdoor.season}。时间：${selection.outdoor.timeRange}。气候：${selection.outdoor.weather}。请将季节、时间和气候作为环境氛围参数融入生成结果，但仍以原图结构和透视关系为最高优先级。`
  ].join("\n");
}

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

export const initialPrompt =
  "生成傍晚 18 点到 19 点的蓝调夜景效果，建筑立面偏冷蓝，底部洗墙灯为暖白色，增加室内内透，但不要改变建筑结构、树木、地砖和透视关系。";
