import { type FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Github,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Moon,
  Phone,
  ShieldCheck,
  User,
  Wand2
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import {
  createRegisteredUser,
  resolveLoginUser,
  type UserProfile
} from "../auth/userProfile";
import { cn } from "../lib/utils";

type AuthMode = "login" | "register";
type FieldName =
  | "identifier"
  | "loginPassword"
  | "username"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword"
  | "agreement";

interface AuthScreenProps {
  onAuthenticated: (profile: UserProfile) => void;
}

interface FieldState {
  value: string;
  touched: boolean;
}

interface FieldConfig {
  name: FieldName;
  label: string;
  type?: string;
  inputMode?: "email" | "tel" | "text";
  autoComplete?: string;
  icon: typeof Mail;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^1[3-9]\d{9}$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const loginFields: FieldConfig[] = [
  {
    name: "identifier",
    label: "邮箱或手机号",
    inputMode: "email",
    autoComplete: "email",
    icon: Mail
  },
  {
    name: "loginPassword",
    label: "密码",
    type: "password",
    autoComplete: "current-password",
    icon: LockKeyhole
  }
];

const registerFields: FieldConfig[] = [
  {
    name: "username",
    label: "用户名",
    autoComplete: "username",
    icon: User
  },
  {
    name: "email",
    label: "邮箱",
    inputMode: "email",
    autoComplete: "email",
    icon: Mail
  },
  {
    name: "phone",
    label: "手机号",
    inputMode: "tel",
    autoComplete: "tel",
    icon: Phone
  },
  {
    name: "password",
    label: "密码",
    type: "password",
    autoComplete: "new-password",
    icon: LockKeyhole
  },
  {
    name: "confirmPassword",
    label: "确认密码",
    type: "password",
    autoComplete: "new-password",
    icon: ShieldCheck
  }
];

const initialFields: Record<FieldName, FieldState> = {
  identifier: { value: "", touched: false },
  loginPassword: { value: "", touched: false },
  username: { value: "", touched: false },
  email: { value: "", touched: false },
  phone: { value: "", touched: false },
  password: { value: "", touched: false },
  confirmPassword: { value: "", touched: false },
  agreement: { value: "", touched: false }
};

function validateField(
  name: FieldName,
  value: string,
  fields: Record<FieldName, FieldState>,
  agreementAccepted: boolean
) {
  if (name === "identifier") {
    if (!value.trim()) {
      return "请输入邮箱或手机号";
    }

    if (!emailPattern.test(value) && !phonePattern.test(value)) {
      return "请输入有效邮箱或中国大陆手机号";
    }
  }

  if (name === "loginPassword" && value.length < 6) {
    return "密码至少 6 位";
  }

  if (name === "username") {
    if (!value.trim()) {
      return "请输入用户名";
    }

    if (value.trim().length < 2 || value.trim().length > 20) {
      return "用户名需为 2 到 20 个字符";
    }
  }

  if (name === "email" && !emailPattern.test(value)) {
    return "请输入有效邮箱";
  }

  if (name === "phone" && !phonePattern.test(value)) {
    return "请输入有效手机号";
  }

  if (name === "password" && !passwordPattern.test(value)) {
    return "密码至少 8 位，需包含字母和数字";
  }

  if (name === "confirmPassword" && value !== fields.password.value) {
    return "两次输入的密码不一致";
  }

  if (name === "agreement" && !agreementAccepted) {
    return "请先同意用户协议";
  }

  return "";
}

function AuthField({
  config,
  field,
  error,
  showFeedback,
  onBlur,
  onChange
}: {
  config: FieldConfig;
  field: FieldState;
  error: string;
  showFeedback: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const Icon = config.icon;
  const isPassword = config.type === "password";
  const [isVisible, setIsVisible] = useState(false);
  const isFilled = field.value.length > 0;
  const showError = showFeedback && Boolean(error);
  const showSuccess = showFeedback && isFilled && !error;

  return (
    <div className="flex flex-col gap-1.5" data-invalid={showError ? true : undefined}>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors",
            showError && "text-destructive",
            showSuccess && "text-accent-foreground"
          )}
          aria-hidden="true"
        />
        <Input
          aria-invalid={showError}
          data-invalid={showError ? true : undefined}
          id={config.name}
          type={isPassword && isVisible ? "text" : config.type ?? "text"}
          inputMode={config.inputMode}
          autoComplete={config.autoComplete}
          className="peer pl-10 pr-10"
          placeholder=" "
          value={field.value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <label
          className={cn(
            "pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all peer-focus:top-3 peer-focus:text-[0.68rem] peer-focus:text-accent-foreground",
            isFilled && "top-3 text-[0.68rem]",
            showError && "text-destructive peer-focus:text-destructive"
          )}
          htmlFor={config.name}
        >
          {config.label}
        </label>
        {isPassword ? (
          <button
            aria-label={isVisible ? "隐藏密码" : "显示密码"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            type="button"
            onClick={() => setIsVisible((current) => !current)}
          >
            {isVisible ? "隐藏" : "显示"}
          </button>
        ) : null}
        {!isPassword && showSuccess ? (
          <CheckCircle2
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-accent-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p
        className={cn(
          "min-h-4 text-xs text-muted-foreground transition-colors",
          showError && "text-destructive",
          showSuccess && "text-accent-foreground"
        )}
        aria-live="polite"
      >
        {showError ? error : showSuccess ? "格式正确" : " "}
      </p>
    </div>
  );
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [fields, setFields] = useState(initialFields);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeFields = mode === "login" ? loginFields : registerFields;
  const errors = useMemo(() => {
    const nextErrors: Partial<Record<FieldName, string>> = {};

    for (const config of activeFields) {
      nextErrors[config.name] = validateField(
        config.name,
        fields[config.name].value,
        fields,
        agreementAccepted
      );
    }

    if (mode === "register") {
      nextErrors.agreement = validateField(
        "agreement",
        "",
        fields,
        agreementAccepted
      );
    }

    return nextErrors;
  }, [activeFields, agreementAccepted, fields, mode]);

  function updateField(name: FieldName, value: string) {
    setFields((current) => ({
      ...current,
      [name]: {
        ...current[name],
        value
      }
    }));
  }

  function touchField(name: FieldName) {
    setFields((current) => ({
      ...current,
      [name]: {
        ...current[name],
        touched: true
      }
    }));
  }

  function markActiveFieldsTouched() {
    setFields((current) => {
      const next = { ...current };

      for (const config of activeFields) {
        next[config.name] = {
          ...next[config.name],
          touched: true
        };
      }

      next.agreement = {
        ...next.agreement,
        touched: true
      };

      return next;
    });
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode);
    setAttemptedSubmit(false);
    setIsSubmitting(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttemptedSubmit(true);
    markActiveFieldsTouched();

    const hasError = activeFields.some((config) => Boolean(errors[config.name])) ||
      (mode === "register" && Boolean(errors.agreement));

    if (hasError) {
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      const profile =
        mode === "register"
          ? createRegisteredUser({
              username: fields.username.value,
              email: fields.email.value,
              phone: fields.phone.value
            })
          : resolveLoginUser(fields.identifier.value);

      setIsSubmitting(false);
      onAuthenticated(profile);
    }, 380);
  }

  function handleThirdPartyLogin(provider: "微信" | "GitHub") {
    setIsSubmitting(true);
    window.setTimeout(() => {
      const profile = resolveLoginUser(
        provider === "微信" ? "wechat@yehuiai.local" : "github@yehuiai.local"
      );

      setIsSubmitting(false);
      onAuthenticated(profile);
    }, 300);
  }

  return (
    <main className="auth-screen relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
      <div className="auth-drift-layer absolute inset-0" aria-hidden="true" />
      <div className="auth-skyline absolute inset-x-0 bottom-0 h-48" aria-hidden="true" />
      <div className="absolute left-10 top-10 hidden items-center gap-3 md:flex">
        <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-auth-glow">
          <Moon className="size-5" aria-hidden="true" />
        </span>
        <span className="flex flex-col">
          <strong className="text-base font-semibold leading-tight">夜绘AI</strong>
          <span className="text-xs text-muted-foreground">AI 夜景照明效果图工作台</span>
        </span>
      </div>

      <Card className="relative z-10 w-full max-w-[430px] overflow-hidden rounded-2xl border-border/80 bg-card/90 p-7 backdrop-blur-xl md:p-8">
        <CardHeader className="items-center pb-2 text-center">
          <span className="grid size-12 place-items-center rounded-xl border border-border bg-secondary text-accent-foreground shadow-auth-glow md:hidden">
            <Moon className="size-6" aria-hidden="true" />
          </span>
          <CardTitle>夜绘AI</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "登录后进入夜景照明效果图工作台"
              : "创建账号，开始管理夜景生成项目"}
          </CardDescription>
        </CardHeader>

        <div className="my-5 grid grid-cols-2 rounded-lg border border-border bg-background/60 p-1">
          <button
            className={cn(
              "h-9 rounded-md text-sm text-muted-foreground transition-all",
              mode === "login" && "bg-secondary text-foreground shadow-sm"
            )}
            type="button"
            onClick={() => handleModeChange("login")}
          >
            登录
          </button>
          <button
            className={cn(
              "h-9 rounded-md text-sm text-muted-foreground transition-all",
              mode === "register" && "bg-secondary text-foreground shadow-sm"
            )}
            type="button"
            onClick={() => handleModeChange("register")}
          >
            注册
          </button>
        </div>

        <CardContent className="px-0">
          <form className="flex flex-col gap-3" key={mode} onSubmit={handleSubmit}>
            <div className="animate-auth-fade">
              {activeFields.map((config) => (
                <AuthField
                  config={config}
                  error={errors[config.name] ?? ""}
                  field={fields[config.name]}
                  key={config.name}
                  showFeedback={attemptedSubmit || fields[config.name].touched}
                  onBlur={() => touchField(config.name)}
                  onChange={(value) => updateField(config.name, value)}
                />
              ))}

              {mode === "login" ? (
                <div className="mt-1 flex items-center justify-between gap-4 text-sm">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                    />
                    记住我
                  </label>
                  <Button asChild variant="link" size="sm">
                    <a href="#forgot-password">忘记密码</a>
                  </Button>
                </div>
              ) : (
                <div className="mt-1 flex flex-col gap-1.5">
                  <label className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={agreementAccepted}
                      aria-invalid={attemptedSubmit && Boolean(errors.agreement)}
                      onCheckedChange={(checked) => {
                        setAgreementAccepted(Boolean(checked));
                        touchField("agreement");
                      }}
                    />
                    <span>
                      我已阅读并同意
                      <a className="mx-1 text-accent-foreground hover:underline" href="#terms">
                        用户协议
                      </a>
                      和
                      <a className="ml-1 text-accent-foreground hover:underline" href="#privacy">
                        隐私政策
                      </a>
                    </span>
                  </label>
                  <p className="min-h-4 text-xs text-destructive" aria-live="polite">
                    {attemptedSubmit && errors.agreement ? errors.agreement : " "}
                  </p>
                </div>
              )}
            </div>

            <Button
              className="mt-1 h-12 bg-gradient-to-r from-primary via-[#fbbf24] to-[#38bdf8] text-base font-semibold text-[#0f172a] shadow-auth-glow hover:scale-[1.018]"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="size-4" aria-hidden="true" />
              )}
              {mode === "login" ? "登录工作台" : "注册并进入工作台"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">第三方登录</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-11"
              disabled={isSubmitting}
              variant="secondary"
              type="button"
              onClick={() => handleThirdPartyLogin("微信")}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              微信
            </Button>
            <Button
              className="h-11"
              disabled={isSubmitting}
              variant="secondary"
              type="button"
              onClick={() => handleThirdPartyLogin("GitHub")}
            >
              <Github className="size-4" aria-hidden="true" />
              GitHub
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              className="ml-1 text-accent-foreground transition-colors hover:text-foreground"
              type="button"
              onClick={() => handleModeChange(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "立即注册" : "返回登录"}
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
