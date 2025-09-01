// /geoconverter/frontend/src/app/layout.tsx
import "./../styles/globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <title>ГеоКонвертер</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="max-w-6xl mx-auto p-4">{children}</div>
      </body>
    </html>
  );
}
