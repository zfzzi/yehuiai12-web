import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileStack,
  Lightbulb,
  Loader2,
  Send,
  SlidersHorizontal,
  SquareStack,
  Wand2
} from "lucide-react";
import { fixtureGroups, negativePromptOptions, sceneTypes } from "../data";
import type {
  ExportRequest,
  LightingParams,
  LightingMoodTemplate,
  SceneType
} from "../types/nightRender";

const outputSizes: ExportRequest["type"][] = [
  "2K",
  "4K",
  "6K",
  "8K"
];

const lightingControls: Array<{
  key: keyof Pick<
    LightingParams,
    "colorTemperature" | "brightness" | "halo" | "interiorGlow" | "glareControl"
  >;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}> = [
  {
    key: "colorTemperature",
    label: "色温",
    min: 2200,
    max: 6500,
    step: 100,
    unit: "K"
  },
  {
    key: "brightness",
    label: "亮度",
    min: 0,
    max: 100,
    step: 1,
    unit: "%"
  },
  {
    key: "halo",
    label: "光晕",
    min: 0,
    max: 100,
    step: 1,
    unit: "%"
  },
  {
    key: "interiorGlow",
    label: "内透",
    min: 0,
    max: 100,
    step: 1,
    unit: "%"
  },
  {
    key: "glareControl",
    label: "眩光控制",
    min: 0,
    max: 100,
    step: 1,
    unit: "%"
  }
];

interface ApiStatus {
  state: "idle" | "loading" | "error" | "success";
  message: string;
}

interface InspectorPanelProps {
  apiStatus: ApiStatus;
  activeFixture: string;
  canExport: boolean;
  canGenerate: boolean;
  lightingParams: LightingParams;
  negativePrompts: string[];
  outputSize: ExportRequest["type"];
  prompt: string;
  sceneType: SceneType;
  selectedTemplate: LightingMoodTemplate;
  onExport: () => void;
  onFixtureChange: (fixture: string) => void;
  onGenerate: () => void;
  onLightingParamChange: (key: keyof LightingParams, value: number) => void;
  onNegativeToggle: (prompt: string) => void;
  onOptimizePrompt: () => void;
  onOutputSizeChange: (size: ExportRequest["type"]) => void;
  onPromptChange: (prompt: string) => void;
  onSceneChange: (scene: SceneType) => void;
}

export function InspectorPanel({
  apiStatus,
  activeFixture,
  canExport,
  canGenerate,
  lightingParams,
  negativePrompts,
  outputSize,
  prompt,
  sceneType,
  selectedTemplate,
  onExport,
  onFixtureChange,
  onGenerate,
  onLightingParamChange,
  onNegativeToggle,
  onOptimizePrompt,
  onOutputSizeChange,
  onPromptChange,
  onSceneChange
}: InspectorPanelProps) {
  const isLoading = apiStatus.state === "loading";

  return (
    <aside className="panel inspector" aria-label="照明参数控制">
      <div className="panel-head">
        <div>
          <h2>生成设置</h2>
          <p>场景、灯具、提示词与约束</p>
        </div>
        <Lightbulb size={18} aria-hidden="true" />
      </div>

      <section className="control-section setup-section">
        <div className="section-title">方案基础</div>
        <label className="select-field">
          <span>场景类型</span>
          <select
            value={sceneType}
            onChange={(event) => onSceneChange(event.currentTarget.value as SceneType)}
          >
            {sceneTypes.map((scene) => (
              <option key={scene}>{scene}</option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>

        <div className="selected-style-summary">
          <span>当前场景参考</span>
          <strong>{selectedTemplate}</strong>
          <small>在左侧场景参考中切换生成方向。</small>
        </div>
      </section>

      <section className="control-section fixture-section">
        <div className="section-title">灯具类型库</div>
        {fixtureGroups.map((group) => (
          <div className="fixture-group" key={group.title}>
            <span>{group.title}</span>
            <div className="fixture-list">
              {group.items.map((fixture) => (
                <button
                  className={activeFixture === fixture ? "fixture-pill is-active" : "fixture-pill"}
                  key={fixture}
                  onClick={() => onFixtureChange(fixture)}
                  type="button"
                >
                  {fixture}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="control-section lighting-section">
        <div className="section-title with-icon">
          <SlidersHorizontal size={14} aria-hidden="true" />
          灯光参数
        </div>
        <div className="lighting-control-list">
          {lightingControls.map((control) => (
            <label className="range-field" key={control.key}>
              <span>
                <strong>{control.label}</strong>
                <em>
                  {lightingParams[control.key]}
                  {control.unit}
                </em>
              </span>
              <input
                aria-label={control.label}
                max={control.max}
                min={control.min}
                step={control.step}
                type="range"
                value={lightingParams[control.key]}
                onChange={(event) =>
                  onLightingParamChange(control.key, Number(event.currentTarget.value))
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="control-section prompt-section">
        <div className="section-title">自然语言指令</div>
        <textarea
          className="prompt-box"
          value={prompt}
          rows={5}
          onChange={(event) => onPromptChange(event.currentTarget.value)}
        />
        <div className="prompt-actions">
          <button className="ghost-button wide" onClick={onOptimizePrompt} type="button">
            <Wand2 size={15} aria-hidden="true" />
            整理指令
          </button>
          <button
            className="primary-button"
            disabled={!canGenerate || isLoading}
            onClick={onGenerate}
            type="button"
            title={canGenerate ? "生成夜景方案" : "请先上传主图"}
          >
            {isLoading ? <Loader2 className="spin" size={15} /> : <Send size={15} />}
            生成夜景
          </button>
        </div>
      </section>

      <section className="control-section output-section">
        <div className="section-title with-icon">
          <Download size={14} aria-hidden="true" />
          输出设置
        </div>
        <div className="output-size-grid" role="group" aria-label="选择输出尺寸">
          {outputSizes.map((type) => (
            <button
              className={type === outputSize ? "export-button is-active" : "export-button"}
              key={type}
              type="button"
              onClick={() => onOutputSizeChange(type)}
            >
              <SquareStack size={14} aria-hidden="true" />
              {type}
            </button>
          ))}
        </div>
        <button
          className="primary-button export-primary"
          disabled={!canExport || isLoading}
          type="button"
          onClick={onExport}
          title={canExport ? "导出当前预览图" : "生成预览后可导出"}
        >
          <FileStack size={15} aria-hidden="true" />
          导出当前图
        </button>
      </section>

      <section className="control-section negative-section">
        <div className="section-title">固定负面词</div>
        <div className="negative-list">
          {negativePromptOptions.map((item) => (
            <label className="check-row" key={item}>
              <input
                type="checkbox"
                checked={negativePrompts.includes(item)}
                onChange={() => onNegativeToggle(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </section>

      <div className={`api-status state-${apiStatus.state}`} role="status">
        <AlertTriangle size={15} aria-hidden="true" />
        <span>{apiStatus.message}</span>
      </div>

    </aside>
  );
}
