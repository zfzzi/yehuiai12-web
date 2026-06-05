import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileStack,
  Lightbulb,
  Loader2,
  Send,
  SquareStack,
  Wand2
} from "lucide-react";
import { fixtureGroups, negativePromptOptions, sceneTypes } from "../data";
import type {
  ExportRequest,
  LightingMoodTemplate,
  SceneType
} from "../types/nightRender";

const exportOptions: ExportRequest["type"][] = [
  "2K",
  "4K",
  "6K",
  "8K",
  "汇报版式",
  "对比图"
];

interface ApiStatus {
  state: "idle" | "loading" | "error" | "success";
  message: string;
}

interface InspectorPanelProps {
  apiStatus: ApiStatus;
  activeFixture: string;
  canGenerate: boolean;
  negativePrompts: string[];
  prompt: string;
  sceneType: SceneType;
  selectedTemplate: LightingMoodTemplate;
  onExport: (type: ExportRequest["type"]) => void;
  onFixtureChange: (fixture: string) => void;
  onGenerate: () => void;
  onNegativeToggle: (prompt: string) => void;
  onOptimizePrompt: () => void;
  onPromptChange: (prompt: string) => void;
  onSceneChange: (scene: SceneType) => void;
}

export function InspectorPanel({
  apiStatus,
  activeFixture,
  canGenerate,
  negativePrompts,
  prompt,
  sceneType,
  selectedTemplate,
  onExport,
  onFixtureChange,
  onGenerate,
  onNegativeToggle,
  onOptimizePrompt,
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
            优化提示词
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
          输出
        </div>
        <div className="inspector-export-grid">
          {exportOptions.map((type) => (
            <button
              className="export-button"
              key={type}
              type="button"
              onClick={() => onExport(type)}
            >
              {type === "汇报版式" ? (
                <FileStack size={14} aria-hidden="true" />
              ) : (
                <SquareStack size={14} aria-hidden="true" />
              )}
              {type}
            </button>
          ))}
        </div>
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
