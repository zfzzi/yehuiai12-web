import { useState } from "react";
import {
  defaultParams,
  defaultReferences,
  initialPrompt,
  styleReferences
} from "./data";
import {
  addUserCredits,
  clearCurrentUser,
  consumeUserCredits,
  loadCurrentUser,
  type UserProfile
} from "./auth/userProfile";
import { AuthScreen } from "./components/AuthScreen";
import { CanvasStage } from "./components/CanvasStage";
import { InspectorPanel } from "./components/InspectorPanel";
import { LeftPanel } from "./components/LeftPanel";
import { TopBar } from "./components/TopBar";
import type {
  CanvasLock,
  CanvasTool,
  ExportRequest,
  LightingParams,
  LightingMoodTemplate,
  ReferenceImage,
  SceneType
} from "./types/nightRender";
import "./styles.css";

function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadCurrentUser());
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
  const [lightingParams, setLightingParams] = useState<LightingParams>(defaultParams);
  const [outputSize, setOutputSize] = useState<ExportRequest["type"]>("4K");
  const [resultImageUrl, setResultImageUrl] = useState<string>();
  const [apiStatus, setApiStatus] = useState({
    state: "idle" as "idle" | "loading" | "error" | "success",
    message: "上传主图后可开始生成夜景测试预览。"
  });

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

    if (!currentUser) {
      return;
    }

    if (currentUser.credits < 6) {
      setApiStatus({
        state: "error",
        message: "积分不足，充值后可继续生成。"
      });
      return;
    }

    setApiStatus({
      state: "loading",
      message: "正在生成夜景测试预览..."
    });

    window.setTimeout(() => {
      const updatedUser = consumeUserCredits(currentUser.id, 6);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }

      setResultImageUrl(primaryPreviewUrl);
      setApiStatus({
        state: "success",
        message: "本地测试预览已生成，已扣除 6 积分。"
      });
    }, 620);
  }

  function handleOptimizePrompt() {
    const promptParts = [
      `场景：${sceneType}`,
      `风格：${selectedTemplate}`,
      `灯具：${activeFixture}`,
      `色温 ${lightingParams.colorTemperature}K，亮度 ${lightingParams.brightness}%，光晕 ${lightingParams.halo}%，内透 ${lightingParams.interiorGlow}%`,
      prompt.trim(),
      `保护约束：${locks.join("、")}`,
      `负面约束：${negativePrompts.join("、")}`
    ];

    setPrompt(promptParts.filter(Boolean).join("；"));
    setApiStatus({
      state: "success",
      message: "指令已整理，可直接生成测试预览。"
    });
  }

  async function handleExport() {
    const imageUrl = resultImageUrl ?? primaryPreviewUrl;

    if (!imageUrl) {
      setApiStatus({
        state: "error",
        message: "请先上传主图并生成预览后再导出。"
      });
      return;
    }

    setApiStatus({
      state: "loading",
      message: `正在导出 ${outputSize} 预览图...`
    });

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `夜绘AI-${outputSize}-夜景预览.png`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setApiStatus({
        state: "success",
        message: `${outputSize} 预览图已开始下载。`
      });
    } catch (error) {
      setApiStatus({
        state: "error",
        message:
          error instanceof Error
            ? "导出失败，请确认图片仍可访问后重试。"
            : "导出失败。"
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

  function handleLightingParamChange(key: keyof LightingParams, value: number) {
    setLightingParams((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleRechargeCredits(amount: number) {
    if (!currentUser) {
      return;
    }

    const updatedUser = addUserCredits(currentUser.id, amount);
    if (updatedUser) {
      setCurrentUser(updatedUser);
    }
  }

  function handleLogout() {
    clearCurrentUser();
    setCurrentUser(null);
  }

  const primaryPreviewUrl = references.find(
    (reference) => reference.role === "primary"
  )?.previewUrl;
  const canGenerate = Boolean(primaryPreviewUrl);
  const canExport = Boolean(resultImageUrl);
  const projectStatus = primaryPreviewUrl
    ? resultImageUrl
      ? "预览已生成"
      : "素材已就绪"
    : "等待主图";

  if (!currentUser) {
    return <AuthScreen onAuthenticated={setCurrentUser} />;
  }

  return (
    <div className="app-shell">
      <TopBar
        hasPrimaryImage={Boolean(primaryPreviewUrl)}
        projectStatus={projectStatus}
        userProfile={currentUser}
        onLogout={handleLogout}
        onRechargeCredits={handleRechargeCredits}
      />
      {apiStatus.state !== "idle" ? (
        <div className={`global-toast state-${apiStatus.state}`} role="status">
          <span>{apiStatus.message}</span>
        </div>
      ) : null}
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
          canExport={canExport}
          negativePrompts={negativePrompts}
          lightingParams={lightingParams}
          outputSize={outputSize}
          prompt={prompt}
          sceneType={sceneType}
          selectedTemplate={selectedTemplate}
          canGenerate={canGenerate}
          onFixtureChange={handleFixtureChange}
          onExport={handleExport}
          onGenerate={handleGenerate}
          onLightingParamChange={handleLightingParamChange}
          onNegativeToggle={(item) =>
            setNegativePrompts((current) => toggleListValue(current, item))
          }
          onOptimizePrompt={handleOptimizePrompt}
          onOutputSizeChange={setOutputSize}
          onPromptChange={setPrompt}
          onSceneChange={setSceneType}
        />
      </div>
    </div>
  );
}

export default App;
