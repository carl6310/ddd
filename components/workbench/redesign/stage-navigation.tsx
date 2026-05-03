import type { DesignStageItem } from "@/lib/design/stages";

export function StageNavigation({
  items,
  onNavigate,
}: {
  items: DesignStageItem[];
  onNavigate: (item: DesignStageItem) => void;
}) {
  return (
    <nav className="redesign-stage-nav" aria-label="写作阶段导航">
      <ol>
        {items.map((item) => (
          <li className={`redesign-stage-item is-${item.status}`} key={item.stage}>
            <button
              type="button"
              className="redesign-stage-button"
              onClick={() => onNavigate(item)}
              aria-label={`${item.index + 1}. ${item.label}，${formatStageStatus(item.status)}，${item.hint}`}
            >
              <span className="redesign-stage-index">{String(item.index + 1).padStart(2, "0")}</span>
              <span className="redesign-stage-copy">
                <strong>{item.shortLabel}</strong>
                <span className="redesign-stage-status">{formatStageStatus(item.status)}</span>
                <small>{item.hint}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function formatStageStatus(status: DesignStageItem["status"]) {
  switch (status) {
    case "complete":
      return "已完成";
    case "current":
      return "当前阶段";
    case "running":
      return "运行中";
    case "stale":
      return "需重跑";
    case "blocked":
      return "阻塞";
    case "pending":
    default:
      return "待处理";
  }
}
