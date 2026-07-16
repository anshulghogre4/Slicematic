import { ADMIN_TABS, adminTabLabel, type AdminTab } from "../../../lib/admin-tabs";

export type AdminTabNavProps = {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
};

export function AdminTabNav({ activeTab, onSelectTab }: AdminTabNavProps) {
  return (
    <nav className="admin-tabs" aria-label="Admin dashboard sections">
      {ADMIN_TABS.map((tab) => (
        <button
          key={tab}
          className={activeTab === tab ? "active" : ""}
          onClick={() => onSelectTab(tab)}
          type="button"
        >
          {adminTabLabel(tab)}
        </button>
      ))}
    </nav>
  );
}
