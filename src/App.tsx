import { useEffect, useState } from "react";
import { createLocalNightPreview } from "./api/localNightPreview";
import { generateNightRender } from "./api/nightRenderClient";
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
import { WelcomeScreen } from "./components/WelcomeScreen";
import { InteractiveNebulaShader } from "./components/ui/liquid-shader";
import type {
  CanvasTool,
  ExportRequest,
  GenerationRequest,
  LightingMoodTemplate,
  ReferenceImage,
  SceneType
} from "./types/nightRender";
import "./styles.css";

type PreviewMode = "welcome" | "auth" | "workspace" | null;

const previewUser: UserProfile = {
  id: "preview-user",
  username: "Preview",
  email: "preview@zerlum.local",
  phone: "",
  plan: "试用版" as UserProfile["plan"],
  credits: 120,
  totalRecharged: 0,
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  avatarInitial: "P",
  rechargeRecords: []
};

function readPreviewMode(): PreviewMode {
  if (typeof window === "undefined") {
    return null;
  }

  const mode = new URLSearchParams(window.location.search).get("preview");
  return mode === "welcome" || mode === "auth" || mode === "workspace" ? mode : null;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败，请重新上传主图。"));
    reader.readAsDataURL(blob);
  });
}

async function sourceToDataUrl(reference: ReferenceImage) {
  if (reference.file) {
    return blobToDataUrl(reference.file);
  }

  if (!reference.previewUrl) {
    throw new Error("请先上传主图。");
  }

  if (reference.previewUrl.startsWith("data:")) {
    return reference.previewUrl;
  }

  const response = await fetch(reference.previewUrl);
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

function shouldTryNightRenderApi() {
  if (typeof window === "undefined") {
    return false;
  }

  return !import.meta.env.DEV || window.localStorage.getItem("zerlum.tryServerApi") === "1";
}

function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadCurrentUser());
  const [authStage, setAuthStage] = useState<"welcome" | "auth">("welcome");
  const [previewMode, setPreviewMode] = useState<PreviewMode>(() => readPreviewMode());
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
  const [activeTool, setActiveTool] = useState<CanvasTool>("标注灯位");
  const [compare, setCompare] = useState(48);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [outputSize, setOutputSize] = useState<ExportRequest["type"]>("4K");
  const [resultImageUrl, setResultImageUrl] = useState<string>();
  const [apiStatus, setApiStatus] = useState({
    state: "idle" as "idle" | "loading" | "error" | "success",
    message: "上传主图后可开始生成夜景测试预览。"
  });

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.appearance = "dark";
  }, []);

  useEffect(() => {
    function handlePreviewRouteChange() {
      setPreviewMode(readPreviewMode());
    }

    window.addEventListener("popstate", handlePreviewRouteChange);
    return () => window.removeEventListener("popstate", handlePreviewRouteChange);
  }, []);

  function navigatePreview(mode: PreviewMode) {
    const nextUrl = new URL(window.location.href);

    if (mode) {
      nextUrl.searchParams.set("preview", mode);
    } else {
      nextUrl.searchParams.delete("preview");
    }

    window.history.pushState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    setPreviewMode(mode);
  }

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
              file,
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
              file: undefined,
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
    const primaryReference = references.find(
      (reference) =>
        reference.role === "primary" &&
        reference.status === "ready" &&
        reference.previewUrl
    );

    if (!primaryReference?.previewUrl) {
      setApiStatus({
        state: "error",
        message: "请先上传主图，再开始生成夜景方案。"
      });
      return;
    }

    if (!activeUser) {
      return;
    }

    if (activeUser.credits < 6) {
      setApiStatus({
        state: "error",
        message: "积分不足，充值后可继续生成。"
      });
      return;
    }

    setApiStatus({
      state: "loading",
      message: "正在连接夜景生成 API..."
    });

    try {
      const sourceDataUrl = await sourceToDataUrl(primaryReference);
      const request: GenerationRequest = {
        projectId: "zerlum-night-render",
        sourceImage: {
          dataUrl: sourceDataUrl,
          fileName: primaryReference.fileName,
          mimeType: primaryReference.file?.type,
          size: primaryReference.file?.size
        },
        references: references.map((reference) => ({
          role: reference.role,
          fileName: reference.fileName,
          status: reference.status
        })),
        sceneType,
        template: selectedTemplate,
        params: {
          colorTemperature: 4200,
          brightness: 72,
          halo: 58,
          interiorGlow: 64,
          shadow: 66,
          blueTone: selectedTemplate.includes("暖") ? 48 : 78,
          warmLight: selectedTemplate.includes("冷") ? 42 : 70,
          glareControl: 78,
          overexposureRepair: 82,
          warmCoolContrast: "中"
        },
        prompt,
        negativePrompts,
        locks: ["建筑结构", "透视关系", "人物", "树木", "地面铺装", "灯具"],
        annotations: [],
        styleReference: {
          id: selectedStyleReference.id,
          title: selectedStyleReference.title,
          template: selectedStyleReference.template
        },
        output: {
          size:
            outputSize === "2K" ||
            outputSize === "4K" ||
            outputSize === "6K" ||
            outputSize === "8K"
              ? outputSize
              : "4K",
          ratio: "自动适配",
          format: "PNG"
        }
      };

      let usedApi = false;
      let resultUrl: string | undefined;

      if (shouldTryNightRenderApi()) {
        try {
          const response = await generateNightRender(request);

          if (response.status === "completed" && response.resultImageUrl) {
            usedApi = true;
            resultUrl = response.resultImageUrl;
          } else {
            throw new Error(response.error || "生成服务暂未返回结果图。");
          }
        } catch {
          resultUrl = await createLocalNightPreview(primaryReference.previewUrl, {
            fixture: activeFixture,
            outputSize,
            prompt,
            sceneType,
            template: selectedTemplate
          });
        }
      } else {
        resultUrl = await createLocalNightPreview(primaryReference.previewUrl, {
          fixture: activeFixture,
          outputSize,
          prompt,
          sceneType,
          template: selectedTemplate
        });
      }

      if (!resultUrl) {
        throw new Error("没有可用的生成结果。");
      }

      if (usedApi && activeUser.id !== previewUser.id) {
        const updatedUser = consumeUserCredits(activeUser.id, 6);
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      }

      setResultImageUrl(resultUrl);
      setApiStatus({
        state: "success",
        message: usedApi
          ? "AI API 生成完成，已扣除 6 积分。"
          : "本地夜景预览已生成；真实 API 未连通或未配置密钥，未扣除积分。"
      });
    } catch (error) {
      setApiStatus({
        state: "error",
        message: error instanceof Error ? error.message : "生成失败，请重新上传主图后再试。"
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
    setAuthStage("auth");
    setCurrentUser(null);
  }

  const primaryPreviewUrl = references.find(
    (reference) => reference.role === "primary"
  )?.previewUrl;
  const canGenerate = Boolean(primaryPreviewUrl);
  const canExport = Boolean(resultImageUrl);

  const activeUser = previewMode === "workspace" ? currentUser ?? previewUser : currentUser;

  if (previewMode === "welcome") {
    return <WelcomeScreen onContinue={() => navigatePreview("auth")} />;
  }

  if (previewMode === "auth") {
    return (
      <AuthScreen
        onAuthenticated={(user) => {
          setCurrentUser(user);
          navigatePreview("workspace");
        }}
      />
    );
  }

  if (!activeUser) {
    return authStage === "welcome" ? (
      <WelcomeScreen onContinue={() => setAuthStage("auth")} />
    ) : (
      <AuthScreen onAuthenticated={setCurrentUser} />
    );
  }

  return (
    <div className="app-shell zerlum-workspace">
      <InteractiveNebulaShader className="workspace-shader" disableCenterDimming />
      <TopBar
        userProfile={activeUser}
        onBrandClick={() => navigatePreview("welcome")}
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
          canGenerate={canGenerate}
          onFixtureChange={handleFixtureChange}
          onExport={handleExport}
          onGenerate={handleGenerate}
          onNegativeToggle={(item) =>
              setNegativePrompts((current) => toggleListValue(current, item))
          }
          onOutputSizeChange={setOutputSize}
          onPromptChange={setPrompt}
        />
      </div>
    </div>
  );
}

export default App;
