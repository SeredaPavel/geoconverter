import SupportPanel from "@/components/SupportPanel";
import PanelPage from "@/components/PanelPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata("Поддержать проект", "Добровольная поддержка развития бесплатного сервиса ГеоКонвертер.", "/support");

export default function SupportPage() {
  return <PanelPage title="Поддержать проект"><SupportPanel /></PanelPage>;
}
