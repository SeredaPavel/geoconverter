import FeaturesPanel from "@/components/FeaturesPanel";
import PanelPage from "@/components/PanelPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata("Возможности и методика", "Системы координат и форматы ГеоКонвертера, импорт и экспорт Excel, источники определений, контрольные примеры и ограничения точности.", "/features");

export default function FeaturesPage() {
  return <PanelPage title="Возможности"><FeaturesPanel /></PanelPage>;
}
