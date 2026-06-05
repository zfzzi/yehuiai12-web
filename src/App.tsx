import { useRef, useState } from "react";
import {
  ApiClientError,
  generateNightRender
} from "./api/nightRenderClient";
import { buildNightRenderApiPayload } from "./api/nightRenderPayload";
import {
  buildSceneModePrompt,
  defaultReferences,
  defaultSceneModeSelection,
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
  GenerationHistoryItem,
  LightingMoodTemplate,
  OutdoorSeason,
  OutdoorTimeRange,
  OutdoorWeather,
  ReferenceImage,
  SceneMode,
  SceneModeSelection,
  SceneType
} from "./types/nightRender";
import "./styles.css";

function mapOutdoorTimeRangeToCanvasRange(
  value: OutdoorTimeRange
): CanvasGenerationContext["timeRange"] {
  if (value === "17:00-19:00") {
    return "蓝调时刻 18:00-19:00";
  }

  if (value === "19:00-20:00" || value === "20:00-22:00") {
    return "入夜商业 19:00-21:00";
  }

  return "深夜静谧 22:00-24:00";
}

function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadCurrentUser());
  const [references, setReferences] = useState<ReferenceImage[]>(defaultReferences);
  const [primaryImageFile, setPrimaryImageFile] = useState<File>();
  const selectedStyleReference = styleReferences[0];
  const [sceneModeSelection, setSceneModeSelection] =
    useState<SceneModeSelection>(defaultSceneModeSelection);
  const [sceneType, setSceneType] = useState<SceneType>("建筑立面夜景");
  const [selectedTemplate, setSelectedTemplate] =
    useState<LightingMoodTemplate>("高级蓝调夜景");
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
  const [outputSize, setOutputSize] = useState<ExportRequest["type"]>("2K");
  const [resultImageUrl, setResultImageUrl] = useState<string>();
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string>();
  const [canvasGenerationContext, setCanvasGenerationContext] =
    useState<CanvasGenerationContext>({
      timeRange: "蓝调时刻 18:00-19:00",
      activeTool: "标注灯位",
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
      setActiveHistoryId(undefined);
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
      setActiveHistoryId(undefined);
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

    if (sceneModeSelection.mode !== "outdoor") {
      setApiStatus({
        state: "error",
        message: "室内照明预设尚未配置，请先选择室外照明测试。"
      });
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
        prompt: buildSceneModePrompt(sceneModeSelection),
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
      const historyItem: GenerationHistoryItem = {
        id: response.versionId ?? `history-${Date.now()}`,
        title: `${sceneModeSelection.outdoor.timeRange} · ${sceneModeSelection.outdoor.weather}`,
        subtitle: `${sceneModeSelection.outdoor.season} / ${outputSize} / ${selectedTemplate}`,
        imageUrl: response.resultImageUrl,
        outputSize,
        createdAt: new Date().toISOString()
      };
      setGenerationHistory((current) => [
        historyItem,
        ...current.filter(
          (item) => item.id !== historyItem.id && item.imageUrl !== historyItem.imageUrl
        )
      ].slice(0, 8));
      setActiveHistoryId(historyItem.id);
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

  function handleFixtureChange(fixture: string) {
    setActiveFixture(fixture);
    setActiveTool("标注灯位");
  }

  function handleHistorySelect(item: GenerationHistoryItem) {
    setResultImageUrl(item.imageUrl);
    setActiveHistoryId(item.id);
    setCompare(18);
    setApiStatus({
      state: "success",
      message: "已切换到历史生成方案。"
    });
  }

  function handleSceneModeChange(mode: SceneMode) {
    setSceneModeSelection((current) => ({
      ...current,
      mode
    }));

    if (mode === "outdoor") {
      setSceneType("建筑立面夜景");
      setSelectedTemplate("高级蓝调夜景");
      setCanvasGenerationContext((current) => ({
        ...current,
        timeRange: mapOutdoorTimeRangeToCanvasRange(sceneModeSelection.outdoor.timeRange)
      }));
      return;
    }

    setSceneType("商场室内");
    setSelectedTemplate("内透灯光增强");
  }

  function handleOutdoorOptionChange(
    key: keyof SceneModeSelection["outdoor"],
    value: OutdoorSeason | OutdoorTimeRange | OutdoorWeather
  ) {
    setSceneModeSelection((current) => ({
      mode: "outdoor",
      outdoor: {
        ...current.outdoor,
        [key]: value
      } as SceneModeSelection["outdoor"]
    }));

    if (key === "timeRange") {
      setCanvasGenerationContext((current) => ({
        ...current,
        timeRange: mapOutdoorTimeRangeToCanvasRange(value as OutdoorTimeRange)
      }));
    }

    setSceneType("建筑立面夜景");
    setSelectedTemplate("高级蓝调夜景");
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
          sceneModeSelection={sceneModeSelection}
          generationHistory={generationHistory}
          activeHistoryId={activeHistoryId}
          onHistorySelect={handleHistorySelect}
          onOutdoorOptionChange={handleOutdoorOptionChange}
          onSceneModeChange={handleSceneModeChange}
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
          sceneType={sceneType}
          selectedTemplate={selectedTemplate}
          canGenerate={canGenerate}
          onFixtureChange={handleFixtureChange}
          onExport={handleExport}
          onGenerate={handleGenerate}
          onNegativeToggle={(item) =>
            setNegativePrompts((current) => toggleListValue(current, item))
          }
          onOutputSizeChange={setOutputSize}
          onSceneChange={setSceneType}
        />
      </div>
    </div>
  );
}

export default App;
