import {
  Building2,
  CloudSun,
  FileImage,
  ImagePlus,
  Layers2,
  Map,
  Palette,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { outdoorSceneOptions } from "../data";
import type {
  GenerationHistoryItem,
  OutdoorSeason,
  OutdoorTimeRange,
  OutdoorWeather,
  ReferenceImage,
  ReferenceImageRole,
  SceneMode,
  SceneModeSelection
} from "../types/nightRender";

const roleIcons: Record<ReferenceImageRole, typeof FileImage> = {
  primary: ImagePlus,
  tone: Palette,
  fixturePlan: Layers2,
  style: FileImage,
  floorPlan: Map
};

interface LeftPanelProps {
  references: ReferenceImage[];
  onRemoveUpload: (id: string) => void;
  onOutdoorOptionChange: (
    key: keyof SceneModeSelection["outdoor"],
    value: OutdoorSeason | OutdoorTimeRange | OutdoorWeather
  ) => void;
  onSceneModeChange: (mode: SceneMode) => void;
  onUpload: (id: string, file: File) => void;
  generationHistory: GenerationHistoryItem[];
  activeHistoryId?: string;
  onHistorySelect: (item: GenerationHistoryItem) => void;
  sceneModeSelection: SceneModeSelection;
}

export function LeftPanel({
  references,
  onRemoveUpload,
  onOutdoorOptionChange,
  onSceneModeChange,
  onUpload,
  generationHistory,
  activeHistoryId,
  onHistorySelect,
  sceneModeSelection
}: LeftPanelProps) {
  const [dropTargetId, setDropTargetId] = useState<string>();
  const isOutdoor = sceneModeSelection.mode === "outdoor";

  return (
    <aside className="panel left-panel" aria-label="项目与素材">
      <div className="panel-head">
        <div>
          <h2>项目素材</h2>
          <p>上传主图，再选择场景模式。</p>
        </div>
      </div>

      <div className="upload-list">
        {references.map((reference) => {
          const Icon = roleIcons[reference.role];
          const previewUrl = reference.previewUrl ?? "";

          return (
            <div
              className={
                dropTargetId === reference.id
                  ? `upload-card status-${reference.status} is-drop-target`
                  : `upload-card status-${reference.status}`
              }
              key={reference.id}
              onDragEnter={(event) => {
                event.preventDefault();
                setDropTargetId(reference.id);
              }}
              onDragLeave={() => setDropTargetId(undefined)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                setDropTargetId(undefined);
                const file = event.dataTransfer.files?.[0];

                if (file) {
                  onUpload(reference.id, file);
                }
              }}
            >
              <label
                className={`upload-preview preview-${reference.role}`}
                htmlFor={`upload-${reference.id}`}
                aria-hidden="true"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="" />
                ) : (
                  <Icon size={20} aria-hidden="true" />
                )}
              </label>
              <label className="upload-copy" htmlFor={`upload-${reference.id}`}>
                <strong>{reference.label}</strong>
                <span>{reference.fileName ?? reference.hint}</span>
              </label>
              <div className="upload-actions">
                <label className="upload-action" htmlFor={`upload-${reference.id}`}>
                  {reference.status === "ready" ? "替换" : "上传"}
                </label>
                {reference.status === "ready" ? (
                  <button
                    className="upload-remove-button"
                    type="button"
                    aria-label={`删除${reference.label}`}
                    title={`删除${reference.label}`}
                    onClick={() => onRemoveUpload(reference.id)}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <input
                id={`upload-${reference.id}`}
                className="visually-hidden"
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    onUpload(reference.id, file);
                    event.currentTarget.value = "";
                  }
                }}
              />
            </div>
          );
        })}
      </div>

      <section className="scene-mode-panel" aria-label="场景模式">
        <div className="section-title">场景模式</div>
        <div className="scene-mode-switch" role="group" aria-label="选择场景模式">
          <button
            className={isOutdoor ? "scene-mode-button is-active" : "scene-mode-button"}
            type="button"
            onClick={() => onSceneModeChange("outdoor")}
          >
            <CloudSun size={16} aria-hidden="true" />
            室外照明
          </button>
          <button
            className={!isOutdoor ? "scene-mode-button is-active" : "scene-mode-button"}
            type="button"
            onClick={() => onSceneModeChange("indoor")}
          >
            <Building2 size={16} aria-hidden="true" />
            室内照明
          </button>
        </div>

        {isOutdoor ? (
          <div className="scene-mode-options">
            <ModeOptionGroup
              label="季节"
              options={outdoorSceneOptions.seasons}
              value={sceneModeSelection.outdoor.season}
              onChange={(value) => onOutdoorOptionChange("season", value)}
            />
            <ModeOptionGroup
              label="时间"
              options={outdoorSceneOptions.timeRanges}
              value={sceneModeSelection.outdoor.timeRange}
              onChange={(value) => onOutdoorOptionChange("timeRange", value)}
            />
            <ModeOptionGroup
              label="气候"
              options={outdoorSceneOptions.weathers}
              value={sceneModeSelection.outdoor.weather}
              onChange={(value) => onOutdoorOptionChange("weather", value)}
            />
          </div>
        ) : (
          <div className="indoor-pending" role="status">
            室内照明预设待配置，当前先测试室外照明。
          </div>
        )}
      </section>

      <section className="generation-history-panel" aria-label="生成历史记录">
        <div className="section-title">生成历史</div>
        {generationHistory.length > 0 ? (
          <div className="generation-history-list">
            {generationHistory.map((item) => (
              <button
                className={
                  item.id === activeHistoryId
                    ? "history-card is-active"
                    : "history-card"
                }
                key={item.id}
                type="button"
                onClick={() => onHistorySelect(item)}
              >
                <span className="history-thumb" aria-hidden="true">
                  <img src={item.imageUrl} alt="" />
                </span>
                <span className="history-copy">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="history-empty">生成后的方案会自动保存在这里。</div>
        )}
      </section>
    </aside>
  );
}

interface ModeOptionGroupProps<T extends string> {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

function ModeOptionGroup<T extends string>({
  label,
  options,
  value,
  onChange
}: ModeOptionGroupProps<T>) {
  return (
    <div className="mode-option-group">
      <span>{label}</span>
      <div className="mode-chip-list" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            className={option === value ? "mode-chip is-active" : "mode-chip"}
            key={option}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
