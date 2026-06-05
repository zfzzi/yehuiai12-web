import { buildApiUrl, getNightRenderApiConfig } from "./config";
import type { NightRenderApiPayload } from "./nightRenderPayload";
import type {
  ExportRequest,
  GenerationResponse,
  ProjectVersion,
  PromptOptimizationResponse
} from "../types/nightRender";

type ApiErrorCode =
  | "config"
  | "auth"
  | "timeout"
  | "network"
  | "bad-request"
  | "server"
  | "parse"
  | "unknown";

interface ApiRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code: ApiErrorCode = "unknown"
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface NightRenderGenerateInput {
  imageFile: File;
  payload: NightRenderApiPayload;
  signal?: AbortSignal;
}

function getStatusErrorMessage(status: number) {
  if (status === 400 || status === 422) {
    return "生成参数格式有误，请检查主图、标注和提示词后重试。";
  }

  if (status === 401 || status === 403) {
    return "API 访问令牌无效或权限不足，请检查 Authorization Bearer 令牌。";
  }

  if (status === 408 || status === 504) {
    return "生成服务响应超时，请稍后重试或降低输出分辨率。";
  }

  if (status >= 500) {
    return "生成服务暂时异常，请稍后重试。";
  }

  return `生成服务返回 ${status}，请检查 API 中转服务。`;
}

function getStatusErrorCode(status: number): ApiErrorCode {
  if (status === 400 || status === 422) {
    return "bad-request";
  }

  if (status === 401 || status === 403) {
    return "auth";
  }

  if (status === 408 || status === 504) {
    return "timeout";
  }

  if (status >= 500) {
    return "server";
  }

  return "unknown";
}

async function parseResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError("API 响应不是有效 JSON。", response.status, "parse");
  }
}

function readApiErrorMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return "";
  }

  const record = body as Record<string, unknown>;
  const error = record.error;
  const errorCode = readString(record.errorCode);
  const errorMessage = readString(record.errorMessage);

  if (errorCode) {
    if (errorCode === "806") {
      return "RunningHub API Key 不存在或未绑定当前账户。";
    }

    if (errorCode === "812") {
      return "RunningHub API 账户余额不足，请充值后再生成。";
    }

    if (errorCode === "1014") {
      return "当前 RunningHub API Key 无权调用该模型，需要企业级共享 API Key。";
    }

    return errorMessage ? `${errorMessage}（${errorCode}）` : errorCode;
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    return typeof errorRecord.message === "string" ? errorRecord.message : "";
  }

  return "";
}

function getBusinessErrorCode(body: unknown) {
  if (!body || typeof body !== "object") {
    return "";
  }

  return readString((body as Record<string, unknown>).errorCode) ?? "";
}

function getBusinessErrorStatus(body: unknown): ApiErrorCode {
  const code = getBusinessErrorCode(body);
  return code === "806" ? "auth" : "server";
}

async function requestApi<T>(
  endpoint: string,
  options: RequestInit,
  requestOptions: ApiRequestOptions = {}
): Promise<T> {
  const config = getNightRenderApiConfig();

  if (!config.baseUrl) {
    throw new ApiClientError(
      "缺少 API 地址，请配置 VITE_NIGHT_RENDER_API_BASE_URL 或 localStorage: yehuiai.api.baseUrl。",
      undefined,
      "config"
    );
  }

  if (!config.token) {
    throw new ApiClientError(
      "缺少 API 访问令牌，请配置 VITE_NIGHT_RENDER_API_TOKEN 或 localStorage: yehuiai.api.token。",
      undefined,
      "config"
    );
  }

  const timeoutMs = requestOptions.timeoutMs ?? config.timeoutMs;
  const controller = new AbortController();
  let didTimeout = false;
  const timer = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  if (requestOptions.signal) {
    if (requestOptions.signal.aborted) {
      controller.abort();
    } else {
      requestOptions.signal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true }
      );
    }
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${config.token}`);

  try {
    const response = await fetch(buildApiUrl(config.baseUrl, endpoint), {
      ...options,
      headers,
      signal: controller.signal
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      const apiMessage = readApiErrorMessage(body);
      throw new ApiClientError(
        apiMessage || getStatusErrorMessage(response.status),
        response.status,
        getStatusErrorCode(response.status)
      );
    }

    const businessErrorCode = getBusinessErrorCode(body);
    if (businessErrorCode) {
      throw new ApiClientError(
        readApiErrorMessage(body) || `API 返回业务错误：${businessErrorCode}`,
        response.status,
        getBusinessErrorStatus(body)
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (didTimeout) {
      throw new ApiClientError(
        "API 请求超时，请稍后重试或降低输出分辨率。",
        undefined,
        "timeout"
      );
    }

    if (requestOptions.signal?.aborted) {
      throw new ApiClientError("生成请求已取消。", undefined, "timeout");
    }

    throw new ApiClientError(
      "无法连接 API 中转服务，请检查地址、端口和跨域设置。",
      undefined,
      "network"
    );
  } finally {
    window.clearTimeout(timer);
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new ApiClientError("主图读取失败，请重新上传图片。", undefined, "parse"));
    };
    reader.onerror = () =>
      reject(new ApiClientError("主图读取失败，请重新上传图片。", undefined, "parse"));
    reader.readAsDataURL(file);
  });
}

function getNestedRecord(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function findImageUrl(body: unknown): string | undefined {
  const directKeys = [
    "resultImageUrl",
    "imageUrl",
    "image_url",
    "url",
    "output_url",
    "download_url"
  ];

  if (!body || typeof body !== "object") {
    return undefined;
  }

  if (Array.isArray(body)) {
    for (const item of body) {
      const url = findImageUrl(item);
      if (url) {
        return url;
      }
    }

    return undefined;
  }

  const record = body as Record<string, unknown>;

  for (const key of directKeys) {
    const value = readString(record[key]);
    if (value) {
      return value;
    }
  }

  const data = record.data;
  if (Array.isArray(data)) {
    for (const item of data) {
      const url = findImageUrl(item);
      if (url) {
        return url;
      }

      const base64 = readString(getNestedRecord(item, "b64_json"));
      if (base64) {
        return `data:image/png;base64,${base64}`;
      }
    }
  }

  const nestedData = getNestedRecord(data, "data");
  if (nestedData) {
    return findImageUrl({ data: nestedData });
  }

  if (data && typeof data === "object") {
    const dataUrl = findImageUrl(data);
    if (dataUrl) {
      return dataUrl;
    }
  }

  const nested =
    getNestedRecord(record, "result") ??
    getNestedRecord(record, "results") ??
    getNestedRecord(record, "output");
  if (nested) {
    return findImageUrl(nested);
  }

  const base64 = readString(record.b64_json) || readString(record.image_base64);
  return base64 ? `data:image/png;base64,${base64}` : undefined;
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiClientError("生成请求已取消。", undefined, "timeout"));
      return;
    }

    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new ApiClientError("生成请求已取消。", undefined, "timeout"));
      },
      { once: true }
    );
  });
}

function normalizeGenerationResponse(body: unknown): GenerationResponse {
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const statusValue = readString(record.status);
  const resultImageUrl = findImageUrl(body);
  const error = readApiErrorMessage(body);

  if (error && !resultImageUrl) {
    return {
      status: "failed",
      error
    };
  }

  if (!resultImageUrl && statusValue === "failed") {
    return {
      status: "failed",
      error: "生成失败，API 未返回有效图片。"
    };
  }

  return {
    status: resultImageUrl ? "completed" : "processing",
    resultImageUrl,
    versionId:
      readString(record.versionId) ||
      readString(record.version_id) ||
      readString(record.id)
  };
}

function readTaskId(body: unknown) {
  if (!body || typeof body !== "object") {
    return "";
  }

  const record = body as Record<string, unknown>;
  return (
    readString(record.taskId) ||
    readString(record.task_id) ||
    readString(record.id) ||
    ""
  );
}

async function buildJsonImageRequest(input: NightRenderGenerateInput) {
  const config = getNightRenderApiConfig();
  const sourceImage = await fileToDataUrl(input.imageFile);

  return {
    model: config.imageModel,
    prompt: input.payload.finalPrompt,
    n: 1,
    size: input.payload.output.size,
    quality: "high",
    response_format: "url",
    source_image: sourceImage,
    source_image_name: input.imageFile.name,
    metadata: input.payload
  };
}

function buildMultipartImageRequest(input: NightRenderGenerateInput) {
  const config = getNightRenderApiConfig();
  const formData = new FormData();
  formData.set("model", config.imageModel);
  formData.set("prompt", input.payload.finalPrompt);
  formData.set("size", input.payload.output.size);
  formData.set("quality", "high");
  formData.set("response_format", "url");
  formData.set("image", input.imageFile, input.imageFile.name);
  formData.set("source_image", input.imageFile, input.imageFile.name);
  formData.set("payload", JSON.stringify(input.payload));
  formData.set("metadata", JSON.stringify(input.payload));
  return formData;
}

async function generateOpenAiCompatibleNightRender(
  input: NightRenderGenerateInput
): Promise<GenerationResponse> {
  const config = getNightRenderApiConfig();
  const isMultipart = config.uploadMode === "multipart";
  const body = isMultipart
    ? buildMultipartImageRequest(input)
    : JSON.stringify(await buildJsonImageRequest(input));
  const headers = new Headers();

  if (!isMultipart) {
    headers.set("Content-Type", "application/json");
  }

  const responseBody = await requestApi<unknown>(
    config.imageGenerationEndpoint,
    {
      method: "POST",
      headers,
      body
    },
    { signal: input.signal }
  );

  return normalizeGenerationResponse(responseBody);
}

function getRunningHubResolution(resolution: NightRenderApiPayload["output"]["resolution"]) {
  return resolution === "2K" ? "2k" : "2k";
}

function buildRunningHubSubmitBody(
  input: NightRenderGenerateInput,
  sourceImageUrl?: string
) {
  const endpoint = getNightRenderApiConfig().imageGenerationEndpoint;
  const isTextToImage = endpoint.includes("text-to-image");

  if (isTextToImage) {
    return {
      prompt: input.payload.finalPrompt,
      aspectRatio: "16:9",
      outputFormat: "jpeg"
    };
  }

  if (endpoint.endsWith("/edit") || endpoint.includes("/edit")) {
    return {
      prompt: input.payload.finalPrompt,
      image: sourceImageUrl ?? ""
    };
  }

  return {
    prompt: input.payload.finalPrompt,
    imageUrls: sourceImageUrl ? [sourceImageUrl] : [],
    aspectRatio: "16:9",
    resolution: getRunningHubResolution(input.payload.output.resolution),
    quality: "medium"
  };
}

async function uploadRunningHubImage(input: NightRenderGenerateInput) {
  const config = getNightRenderApiConfig();
  const formData = new FormData();
  formData.set("file", input.imageFile, input.imageFile.name);

  const uploadResponse = await requestApi<unknown>(
    config.mediaUploadEndpoint,
    {
      method: "POST",
      body: formData
    },
    { signal: input.signal }
  );
  const uploadedUrl = findImageUrl(uploadResponse);

  if (!uploadedUrl) {
    throw new ApiClientError("图片上传成功但未返回 download_url。", undefined, "parse");
  }

  return uploadedUrl;
}

async function queryRunningHubTask(taskId: string, signal?: AbortSignal) {
  const config = getNightRenderApiConfig();
  const deadline = Date.now() + config.timeoutMs;

  while (Date.now() < deadline) {
    const responseBody = await requestApi<unknown>(
      config.queryEndpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ taskId })
      },
      { signal, timeoutMs: Math.min(30_000, config.timeoutMs) }
    );
    const normalized = normalizeGenerationResponse(responseBody);
    const status =
      responseBody && typeof responseBody === "object"
        ? readString((responseBody as Record<string, unknown>).status)?.toUpperCase()
        : "";

    if (normalized.resultImageUrl) {
      return normalized;
    }

    if (status === "FAILED" || status === "FAILURE") {
      throw new ApiClientError(
        readApiErrorMessage(responseBody) || "RunningHub 任务生成失败。",
        undefined,
        "server"
      );
    }

    await delay(2500, signal);
  }

  throw new ApiClientError(
    "RunningHub 任务查询超时，请稍后到任务记录中查看结果。",
    undefined,
    "timeout"
  );
}

async function generateRunningHubNightRender(
  input: NightRenderGenerateInput
): Promise<GenerationResponse> {
  const config = getNightRenderApiConfig();
  const isTextToImage = config.imageGenerationEndpoint.includes("text-to-image");
  const uploadedUrl = isTextToImage ? undefined : await uploadRunningHubImage(input);
  const submitBody = buildRunningHubSubmitBody(input, uploadedUrl);
  const submitResponse = await requestApi<unknown>(
    config.imageGenerationEndpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submitBody)
    },
    { signal: input.signal }
  );
  const immediateResult = normalizeGenerationResponse(submitResponse);

  if (immediateResult.resultImageUrl) {
    return immediateResult;
  }

  const taskId = readTaskId(submitResponse);
  if (!taskId) {
    throw new ApiClientError("RunningHub 未返回 taskId。", undefined, "parse");
  }

  const taskResult = await queryRunningHubTask(taskId, input.signal);
  return {
    ...taskResult,
    versionId: taskResult.versionId ?? taskId
  };
}

export function generateNightRender(
  input: NightRenderGenerateInput
): Promise<GenerationResponse> {
  return getNightRenderApiConfig().provider === "runninghub"
    ? generateRunningHubNightRender(input)
    : generateOpenAiCompatibleNightRender(input);
}

export async function optimizePrompt(
  prompt: string
): Promise<PromptOptimizationResponse> {
  const config = getNightRenderApiConfig();
  const responseBody = await requestApi<unknown>(config.chatCompletionsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.promptModel,
      messages: [
        {
          role: "system",
          content:
            "你是夜景照明效果图提示词助手。保留建筑结构、视角、树木、地砖、人物和透视，只优化夜景灯光描述。"
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  const choices = getNestedRecord(responseBody, "choices");
  const firstChoice = Array.isArray(choices) ? choices[0] : undefined;
  const message = getNestedRecord(firstChoice, "message");
  const content = readString(getNestedRecord(message, "content"));

  return {
    optimizedPrompt: content ?? prompt
  };
}

export function getProjectVersions(
  projectId: string
): Promise<ProjectVersion[]> {
  return requestApi<ProjectVersion[]>(`/api/projects/${projectId}/versions`, {
    method: "GET"
  });
}

export function exportProject(request: ExportRequest): Promise<{ jobId: string }> {
  return requestApi<{ jobId: string }>("/api/exports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
}
