import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileStack,
  Lightbulb,
  Loader2,
  Send,
  SquareStack
} from "lucide-react";
import { fixtureGroups, negativePromptOptions, sceneTypes } from "../data";
import type {
  ExportRequest,
  LightingMoodTemplate,
  SceneType
} from "../types/nightRender";

const outputSizes: ExportRequest["type"][] = [
  "1K",
  "2K"
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
  negativePrompts: string[];
  outputSize: ExportRequest["type"];
  sceneType: SceneType;
  selectedTemplate: LightingMoodTemplate;
  onExport: () => void;
  onFixtureChange: (fixture: string) => void;
  onGenerate: () => void;
  onNegativeToggle: (prompt: string) => void;
  onOutputSizeChange: (size: ExportRequest["type"]) => void;
  onSceneChange: (scene: SceneType) => void;
}

export function InspectorPanel({
  apiStatus,
  activeFixture,
  canExport,
  canGenerate,
  negativePrompts,
  outputSize,
  sceneType,
  selectedTemplate,
  onExport,
  onFixtureChange,
  onGenerate,
  onNegativeToggle,
  onOutputSizeChange,
  onSceneChange
}: InspectorPanelProps) {
  const isLoading = apiStatus.state === "loading";

  return (
    <aside className="panel inspector" aria-label="照明参数控制">
      <div className="panel-head">
        <div>
          <h2>生成设置</h2>
          <p>场景、灯具、输出与约束</p>
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
          <span>当前生成预设</span>
          <strong>{selectedTemplate}</strong>
          <small>左侧场景模式会自动写入隐藏提示词。</small>
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

      <section className="control-section output-section">
        <div className="section-title with-icon">
          <Download size={14} aria-hidden="true" />
          分辨率
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

      <section className="control-section generate-section">
        <div className="section-title">一键出图</div>
        <button
          className="primary-button generate-primary"
          disabled={!canGenerate || isLoading}
          onClick={onGenerate}
          type="button"
          title={canGenerate ? "生成夜景方案" : "请先上传主图"}
        >
          {isLoading ? <Loader2 className="spin" size={15} /> : <Send size={15} />}
          {isLoading ? "生成中" : "生成夜景"}
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
