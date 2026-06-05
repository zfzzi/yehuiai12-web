import {
  FileImage,
  ImagePlus,
  Layers2,
  Map,
  Palette,
  Plus,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { styleReferences } from "../data";
import type {
  ReferenceImage,
  ReferenceImageRole,
  StyleReference
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
  selectedStyleId: string;
  onRemoveUpload: (id: string) => void;
  onStyleSelect: (style: StyleReference) => void;
  onUpload: (id: string, file: File) => void;
}

export function LeftPanel({
  references,
  selectedStyleId,
  onRemoveUpload,
  onStyleSelect,
  onUpload
}: LeftPanelProps) {
  const [dropTargetId, setDropTargetId] = useState<string>();

  return (
    <aside className="panel left-panel" aria-label="项目与素材">
      <div className="panel-head">
        <div>
          <h2>输入素材</h2>
          <p>上传主图、图纸，再选择场景参考。</p>
        </div>
        <button className="icon-button compact" aria-label="新建项目" type="button">
          <Plus size={16} />
        </button>
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

      <section className="style-reference-panel" aria-label="场景参考">
        <div className="section-title">场景参考</div>
        <div className="style-reference-grid">
          {styleReferences.map((style) => (
            <button
              className={
                style.id === selectedStyleId
                  ? `style-reference-card scene-${style.tone} is-active`
                  : `style-reference-card scene-${style.tone}`
              }
              key={style.id}
              type="button"
              onClick={() => onStyleSelect(style)}
            >
              <span className="style-thumb scene-thumb" aria-hidden="true">
                <span className="scene-sky" />
                <span className="scene-mass scene-mass-a" />
                <span className="scene-mass scene-mass-b" />
                <span className="scene-light scene-light-a" />
                <span className="scene-light scene-light-b" />
                <span className="scene-ground" />
              </span>
              <span className="style-copy">
                <strong>{style.title}</strong>
                <small>{style.subtitle}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="project-brief" aria-label="项目状态">
        <div className="section-title">项目状态</div>
        <div className="brief-row">
          <span>当前项目</span>
          <strong>未命名夜景项目</strong>
        </div>
        <div className="brief-row">
          <span>生成策略</span>
          <strong>保结构 · 调灯光</strong>
        </div>
      </section>
    </aside>
  );
}
