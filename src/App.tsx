import { useRef, useState } from "react";
import {
  ApiClientError,
  generateNightRender,
  optimizePrompt
} from "./api/nightRenderClient";
import { buildNightRenderApiPayload } from "./api/nightRenderPayload";
import {
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
  CanvasTool,
  CanvasGenerationContext,
  ExportRequest,
  LightingMoodTemplate,
  ReferenceImage,
  SceneType
} from "./types/nightRender";
import "./styles.css";

function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadCurrentUser());
  const [references, setReferences] = useState<ReferenceImage[]>(defaultReferences);
  const [primaryImageFile, setPrimaryImageFile] = useState<File>();
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
  const [activeTool, setActiveTool] = useState<CanvasTool>("标注灯位");
  const [compare, setCompare] = useState(48);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [outputSize, setOutputSize] = useState<ExportRequest["type"]>("4K");
  const [resultImageUrl, setResultImageUrl] = useState<string>();
  const [canvasGenerationContext, setCanvasGenerationContext] =
    useState<CanvasGenerationContext>({
      timeRange: "蓝调时刻 18:00-19:00",
      annotations: [],
      viewBox: {
        width: 1000,
        height: 560
      }
    });
  const [apiStatus, setApiStatus] = useState({
    state: "idle" as "idle" | "loading" | "error" | "success",
    message: "上传主图后可开始生成夜景效果图。"
  });
  const generationAbortRef = useRef<AbortController | null>(null);

  function handleUpload(id: string, file: File) {
    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;
    const previousPreviewUrl = references.find((reference) => reference.id === id)?.previewUrl;

    if (previousPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previousPreviewUrl);
    }

    if (id === "primary") {
      setPrimaryImageFile(file.type.startsWith("image/") ? file : undefined);
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
      setPrimaryImageFile(undefined);
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

    if (!hasPrimaryImage || !primaryImageFile) {
      setApiStatus({
        state: "error",
        message: "请先上传图片格式的主图，再开始生成夜景方案。"
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

    if (!primaryImageFile.type.startsWith("image/")) {
      setApiStatus({
        state: "error",
        message: "当前主图不是有效图片，请上传 JPG、PNG 或 WebP 文件。"
      });
      return;
    }

    generationAbortRef.current?.abort();
    const controller = new AbortController();
    generationAbortRef.current = controller;
    const progressMessages = [
      "正在上传主图...",
      "正在处理灯具标注...",
      "正在生成夜景效果...",
      "正在校验结构与透视约束...",
      "正在等待生成图片返回..."
    ];
    let progressIndex = 0;

    setApiStatus({
      state: "loading",
      message: progressMessages[0]
    });

    const progressTimer = window.setInterval(() => {
      progressIndex = Math.min(progressIndex + 1, progressMessages.length - 1);
      setApiStatus({
        state: "loading",
        message: progressMessages[progressIndex]
      });
    }, 2400);

    try {
      const payload = buildNightRenderApiPayload({
        projectId: `night-project-${currentUser.id}`,
        imageFile: primaryImageFile,
        sceneType,
        template: selectedTemplate,
        styleReference: selectedStyleReference,
        canvas: canvasGenerationContext,
        prompt,
        negativePrompts,
        outputSize
      });
      const response = await generateNightRender({
        imageFile: primaryImageFile,
        payload,
        signal: controller.signal
      });

      if (response.status === "failed") {
        throw new ApiClientError(response.error || "夜景生成失败。");
      }

      if (!response.resultImageUrl) {
        throw new ApiClientError("API 已响应，但没有返回可显示的生成图片 URL。");
      }

      const updatedUser = consumeUserCredits(currentUser.id, 6);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }

      setResultImageUrl(response.resultImageUrl);
      setCompare(18);
      setApiStatus({
        state: "success",
        message: "夜景效果图已生成，已扣除 6 积分。"
      });
    } catch (error) {
      setApiStatus({
        state: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : "生成失败，请检查 API 服务后重试。"
      });
    } finally {
      window.clearInterval(progressTimer);
      if (generationAbortRef.current === controller) {
        generationAbortRef.current = null;
      }
    }
  }

  async function handleOptimizePrompt() {
    const promptParts = [
      `场景：${sceneType}`,
      `风格：${selectedTemplate}`,
      `时间段：${canvasGenerationContext.timeRange}`,
      `灯具：${activeFixture}`,
      prompt.trim(),
      `负面约束：${negativePrompts.join("、")}`
    ];

    const localPrompt = promptParts.filter(Boolean).join("；");

    setApiStatus({
      state: "loading",
      message: "正在整理生成指令..."
    });

    try {
      const response = await optimizePrompt(localPrompt);
      setPrompt(response.optimizedPrompt);
      setApiStatus({
        state: "success",
        message: "指令已通过 API 整理，可直接生成夜景。"
      });
    } catch {
      setPrompt(localPrompt);
      setApiStatus({
        state: "success",
        message: "API 暂不可用，已先按本地规则整理指令。"
      });
    }
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
          resultImageUrl={resultImageUrl}
          sourceImageUrl={primaryPreviewUrl}
          onCanvasStateChange={setCanvasGenerationContext}
          onCompareChange={setCompare}
          onPrimaryImageUpload={(file) => handleUpload("primary", file)}
          onToolChange={setActiveTool}
        />
        <InspectorPanel
          activeFixture={activeFixture}
          apiStatus={apiStatus}
          canExport={canExport}
          negativePrompts={negativePrompts}
          outputSize={outputSize}
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
          onOutputSizeChange={setOutputSize}
          onPromptChange={setPrompt}
          onSceneChange={setSceneType}
        />
      </div>
    </div>
  );
}

export default App;
