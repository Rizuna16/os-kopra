import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsBusiness } from "./SettingsBusiness";
import { SettingsTax } from "./SettingsTax";
import { SettingsCurrency } from "./SettingsCurrency";
import { SettingsInvoice } from "./SettingsInvoice";
import { SettingsReceipt } from "./SettingsReceipt";
import { SettingsNotificationPrefs } from "./SettingsNotificationPrefs";
import { SettingsIntegration } from "./SettingsIntegration";

export type SettingsTab =
  | "business"
  | "tax"
  | "currency"
  | "invoice"
  | "receipt"
  | "notifications"
  | "integration";

interface TabConfig {
  id: SettingsTab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: "business", label: "Bisnis" },
  { id: "tax", label: "Pajak" },
  { id: "currency", label: "Mata Uang" },
  { id: "invoice", label: "Faktur" },
  { id: "receipt", label: "Struk" },
  { id: "notifications", label: "Notifikasi" },
  { id: "integration", label: "Integrasi" },
];

const TAB_COMPONENTS: Record<SettingsTab, JSX.Element> = {
  business: <SettingsBusiness />,
  tax: <SettingsTax />,
  currency: <SettingsCurrency />,
  invoice: <SettingsInvoice />,
  receipt: <SettingsReceipt />,
  notifications: <SettingsNotificationPrefs />,
  integration: <SettingsIntegration />,
};

export function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("business");

  useEffect(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const tab = parts[1] as SettingsTab | undefined;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab("business");
    }
  }, [location.pathname]);

  function goToTab(tab: SettingsTab) {
    navigate(`/settings/${tab}`, { replace: true });
  }

  return (
    <div data-testid="settings-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi pengaturan bisnis, pajak, faktur, dan integrasi Anda.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              data-testid={`settings-tab-${tab.id}`}
              onClick={() => goToTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap rounded-t-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white border-b-2 border-indigo-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div data-testid={`settings-tab-panel-${activeTab}`} className="mt-6">
        {TAB_COMPONENTS[activeTab]}
      </div>
    </div>
  );
}
