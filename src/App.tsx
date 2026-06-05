import { useMemo, useState } from "react";
import {
  defaultParams,
  defaultReferences,
  initialPrompt,
  styleReferences
} from "./data";
import { exportProject, generateNightRender, optimizePrompt } from "./api/nightRenderClient";
import { AuthScreen } from "./components/AuthScreen";
import { CanvasStage } from "./components/CanvasStage";
import { InspectorPanel } from "./components/InspectorPanel";
import { LeftPanel } from "./components/LeftPanel";
import { TopBar } from "./components/TopBar";
import type {
  CanvasLock,
  CanvasTool,
  ExportRequest,
  GenerationRequest,
  LightingMoodTemplate,
  ReferenceImage,
  SceneType
} from "./types/nightRender";
import "./styles.css";

const projectId = "yeyuai-active-project";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [references, setReferences] = useState<ReferenceImage[]>(defaultReferences);
  const [selectedStyleReference, setSelectedStyleReference] = useState(styleReferences[0]);
  const [sceneType, setSceneType] = useState<SceneType>(styleReferences[0].sceneType);
  const [selectedTemplate, setSelectedTemplate] =
    useState<LightingMoodTemplate>(styleReferences[0].template);
  const [activeFixture, setActiveFixture] = useState("洗墙灯");
  const [negativePrompts, setNegativePrompts] = useState([
    "不改变建筑结构",
    "不改变透视",
    "不改变窗户位置",
    "不改变地砖",
    "不过度曝光",
    "不失真",
    "不模糊",
    "不改变人物和树木"
  ]);
  const [locks, setLocks] = useState<CanvasLock[]>([
    "建筑结构",
    "透视关系",
    "树木",
    "地面铺装"
  ]);
  const [activeTool, setActiveTool] = useState<CanvasTool>("标注灯位");
  const [compare, setCompare] = useState(48);
  const [prompt, setPrompt] = useState(initialPrompt);
  const selectedVersion = "v6";
  const [resultImageUrl, setResultImageUrl] = useState<string>();
  const [apiStatus, setApiStatus] = useState({
    state: "idle" as "idle" | "loading" | "error" | "success",
    message: "准备就绪。上传素材后可开始生成夜景方案。"
  });

  const requestPayload = useMemo<GenerationRequest>(
    () => ({
      projectId,
      references: references.map(({ role, fileName, status }) => ({
        role,
        fileName,
        status
      })),
      sceneType,
      template: selectedTemplate,
      params: defaultParams,
      prompt,
      negativePrompts,
      locks,
      annotations: [],
      styleReference: {
        id: selectedStyleReference.id,
        title: selectedStyleReference.title,
        template: selectedStyleReference.template
      },
      output: {
        size: "4K",
        ratio: "自动适配",
        format: "PNG"
      }
    }),
    [
      locks,
      negativePrompts,
      prompt,
      references,
      sceneType,
      selectedStyleReference,
      selectedTemplate
    ]
  );

  function handleUpload(id: string, file: File) {
    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;
    const previousPreviewUrl = references.find((reference) => reference.id === id)?.previewUrl;

    if (previousPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previousPreviewUrl);
    }

    if (id === "primary") {
      setResultImageUrl(undefined);
    }

    setReferences((current) =>
      current.map((reference) =>
        reference.id === id
          ? {
              ...reference,
              fileName: file.name,
              previewUrl,
              status: "ready"
            }
          : reference
      )
    );
  }

  function handleRemoveUpload(id: string) {
    const previousPreviewUrl = references.find((reference) => reference.id === id)?.previewUrl;

    if (previousPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previousPreviewUrl);
    }

    if (id === "primary") {
      setResultImageUrl(undefined);
      setApiStatus({
        state: "idle",
        message: "主图已移除，可重新上传素材。"
      });
    }

    setReferences((current) =>
      current.map((reference) =>
        reference.id === id
          ? {
              ...reference,
              fileName: undefined,
              previewUrl: undefined,
              status: "missing"
            }
          : reference
      )
    );
  }

  function toggleListValue<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function handleGenerate() {
    const hasPrimaryImage = references.some(
      (reference) => reference.role === "primary" && reference.status === "ready"
    );

    if (!hasPrimaryImage) {
      setApiStatus({
        state: "error",
        message: "请先上传主图，再开始生成夜景方案。"
      });
      return;
    }

    setApiStatus({
      state: "loading",
      message: "正在提交生成任务..."
    });

    try {
      const response = await generateNightRender(requestPayload);
      if (response.resultImageUrl) {
        setResultImageUrl(response.resultImageUrl);
      }
      setApiStatus({
        state: "success",
        message:
          response.status === "completed" && response.resultImageUrl
            ? `生成完成，版本 ${response.versionId ?? "待定"}。`
            : `生成任务已提交，状态 ${response.status}。`
      });
    } catch (error) {
      setApiStatus({
        state: "error",
        message:
          error instanceof Error
            ? "生成服务暂未连接，请配置后端接口后继续。"
            : "生成服务暂未连接，请稍后重试。"
      });
    }
  }

  async function handleOptimizePrompt() {
    setApiStatus({
      state: "loading",
      message: "正在优化专业提示词..."
    });

    try {
      const response = await optimizePrompt(prompt);
      setPrompt(response.optimizedPrompt);
      setApiStatus({
        state: "success",
        message: "提示词已由后端优化。"
      });
    } catch (error) {
      setApiStatus({
        state: "error",
        message:
          error instanceof Error
            ? "提示词优化服务暂未连接，请配置后端接口后继续。"
            : "提示词优化服务暂未连接。"
      });
    }
  }

  async function handleExport(type: ExportRequest["type"]) {
    setApiStatus({
      state: "loading",
      message: `正在创建 ${type} 导出任务...`
    });

    try {
      const response = await exportProject({
        projectId,
        versionId: selectedVersion,
        type
      });
      setApiStatus({
        state: "success",
        message: `导出任务已创建：${response.jobId}。`
      });
    } catch (error) {
      setApiStatus({
        state: "error",
        message:
          error instanceof Error
            ? "导出服务暂未连接，请配置后端接口后继续。"
            : "导出服务暂未连接。"
      });
    }
  }

  function handleStyleSelect(style: typeof selectedStyleReference) {
    setSelectedStyleReference(style);
    setSceneType(style.sceneType);
    setSelectedTemplate(style.template);
  }

  function handleFixtureChange(fixture: string) {
    setActiveFixture(fixture);
    setActiveTool("标注灯位");
  }

  const primaryPreviewUrl = references.find(
    (reference) => reference.role === "primary"
  )?.previewUrl;
  const canGenerate = Boolean(primaryPreviewUrl);

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-shell">
      <TopBar />
      <div className="workspace">
        <LeftPanel
          references={references}
          selectedStyleId={selectedStyleReference.id}
          onStyleSelect={handleStyleSelect}
          onUpload={handleUpload}
          onRemoveUpload={handleRemoveUpload}
        />
        <CanvasStage
          activeFixture={activeFixture}
          activeTool={activeTool}
          compare={compare}
          locks={locks}
          resultImageUrl={resultImageUrl}
          sourceImageUrl={primaryPreviewUrl}
          onCompareChange={setCompare}
          onPrimaryImageUpload={(file) => handleUpload("primary", file)}
          onLockToggle={(lock) => setLocks((current) => toggleListValue(current, lock))}
          onToolChange={setActiveTool}
        />
        <InspectorPanel
          activeFixture={activeFixture}
          apiStatus={apiStatus}
          negativePrompts={negativePrompts}
          prompt={prompt}
          sceneType={sceneType}
          selectedTemplate={selectedTemplate}
          canGenerate={canGenerate}
          onFixtureChange={handleFixtureChange}
          onExport={handleExport}
          onGenerate={handleGenerate}
          onNegativeToggle={(item) =>
            setNegativePrompts((current) => toggleListValue(current, item))
          }
          onOptimizePrompt={handleOptimizePrompt}
          onPromptChange={setPrompt}
          onSceneChange={setSceneType}
        />
      </div>
    </div>
  );
}

export default App;
