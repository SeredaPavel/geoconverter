import ConverterPanel from "@/components/ConverterPanel";
import PanelPage from "@/components/PanelPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata("Конвертер координат", "Пересчёт координат между поддерживаемыми системами. Ручной ввод, выбор зоны, импорт и экспорт Excel.", "/converter");

export default function ConverterPage() {
  return <PanelPage title="Конвертер координат"><ConverterPanel /></PanelPage>;
}
