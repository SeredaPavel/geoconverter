import FAQPanel from "@/components/FAQPanel";
import PanelPage from "@/components/PanelPage";
import { pageMetadata } from "@/lib/pageMetadata";

export const metadata = pageMetadata("Часто задаваемые вопросы", "Ответы на вопросы о системах и форматах координат, ограничениях, импорте Excel и работе ГеоКонвертера.", "/faq");

export default function FAQPage() {
  return <PanelPage title="Часто задаваемые вопросы"><FAQPanel /></PanelPage>;
}
