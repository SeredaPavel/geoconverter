import Link from "next/link";
import type { ReactNode } from "react";

export default function PanelPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel-page" aria-labelledby="panel-page-title">
      <div className="card card-overflow-visible route-panel">
        <div className="panel-page-heading">
          <h1 id="panel-page-title">{title}</h1>
          <Link href="/" className="btn h-11 shrink-0 text-sm" aria-label="На главную">
            <span aria-hidden="true">←</span> На главную
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}
