import {
  Download,
  FolderOpen,
  History,
  Library,
  Save,
  Sparkles,
  UserCircle
} from "lucide-react";

export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="brand-name">夜绘AI</div>
          <div className="project-name">
            <FolderOpen size={13} aria-hidden="true" />
            未命名夜景项目
          </div>
        </div>
      </div>

      <div className="top-actions">
        <button className="ghost-button" type="button">
          <Save size={15} aria-hidden="true" />
          保存项目
        </button>
        <button className="ghost-button" type="button">
          <History size={15} aria-hidden="true" />
          生成历史
        </button>
        <button className="ghost-button" type="button">
          <Download size={15} aria-hidden="true" />
          导出
        </button>
        <button className="icon-button" aria-label="素材库" type="button">
          <Library size={18} />
        </button>
        <button className="icon-button" aria-label="账户" type="button">
          <UserCircle size={18} />
        </button>
      </div>
    </header>
  );
}
