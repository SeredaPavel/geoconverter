import FeaturesPanel from "@/components/FeaturesPanel";
import PanelPage from "@/components/PanelPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata("Возможности", "Возможности ГеоКонвертера: поддерживаемые системы координат, работа в браузере и пакетный пересчёт.", "/features");

export default function FeaturesPage() {
  return <PanelPage title="Возможности"><FeaturesPanel /></PanelPage>;
}
