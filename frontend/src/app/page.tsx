// /geoconverter/frontend/src/app/page.tsx
import ConverterPanel from "@/components/ConverterPanel";

export default function Page() {
  return (
    <main className="space-y-6">
      <ConverterPanel />
      <p className="text-sm opacity-70">
        Внимание: в этом MVP полностью работает WGS-84 → WGS-84 (демо).
        ГСК-2011, СК-42/95, ПЗ-90.x, МСК/СК-63 — будут подключены после добавления гридов и реестра.
      </p>
    </main>
  );
}
