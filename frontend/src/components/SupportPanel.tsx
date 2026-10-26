"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { prepareYooMoneyTransfer, YOOMONEY_FORM_FIELDS, YOOMONEY_FORM_URL } from "@/lib/yoomoney";

export default function SupportPanel() {
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const methodsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const sumRef = useRef<HTMLInputElement>(null);

  const submitYooMoney = (event: FormEvent<HTMLFormElement>) => {
    try {
      const transfer = prepareYooMoneyTransfer(amount);
      if (!sumRef.current) throw new Error("Не удалось подготовить перевод. Попробуйте ещё раз.");
      // Set the canonical amount before the browser submits the native POST form.
      sumRef.current.value = transfer.sum;
      setAmountError(null);
    } catch (error) {
      event.preventDefault();
      setAmountError(error instanceof Error ? error.message : "Проверьте сумму поддержки.");
      amountRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!methodsOpen) return;
    const onOutside = (event: PointerEvent) => {
      if (!methodsRef.current?.contains(event.target as Node)) setMethodsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMethodsOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [methodsOpen]);

  return (
    <section className="card card-overflow-visible p-4 md:p-5 space-y-3">
      <h2 className="text-base md:text-lg font-semibold">Безвозмездный перевод автору проекта</h2>
      <div className="space-y-1 text-sm md:text-base opacity-80">
        <p>Вы можете осуществить безвозмездную поддержку без встречных услуг.</p>
        <p>Укажите сумму и выберите удобный способ перевода.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="support-amount" className="text-xs opacity-70">Сумма, ₽</label>
        <div>
          <input
            id="support-amount"
            ref={amountRef}
            className={`input w-full md:w-1/2 ${amountError ? "!border-amber-600" : ""}`}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={event => {
              setAmount(event.target.value);
              setAmountError(null);
            }}
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? "support-amount-hint support-amount-error" : "support-amount-hint"}
            placeholder="Например 500 ₽"
          />
        </div>
        <p id="support-amount-hint" className="text-xs opacity-70">От 2 до 15 000 ₽. Подтверждение перевода — на сайте ЮMoney.</p>
        {amountError && (
          <p id="support-amount-error" role="alert" className="text-sm text-amber-800 dark:text-amber-300">{amountError}</p>
        )}
      </div>

      <div ref={methodsRef} className="mt-3 inline-block max-w-full">
        <button
          ref={toggleRef}
          type="button"
          className="btn btn-primary btn-md px-5"
          aria-expanded={methodsOpen}
          aria-controls="support-methods"
          onClick={() => setMethodsOpen(open => !open)}
        >
          Перевести
        </button>
        <div id="support-methods" hidden={!methodsOpen} className="theme-menu mt-2 w-56 max-w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-soft space-y-1">
          <button
            type="button"
            className="btn h-10 w-full justify-between text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
            disabled
            title="Способ поддержки пока не подключён"
          >
            <span>СБП</span>
            <span className="text-xs">Скоро</span>
          </button>
          <form method="POST" action={YOOMONEY_FORM_URL} onSubmit={submitYooMoney}>
            {Object.entries(YOOMONEY_FORM_FIELDS).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <input ref={sumRef} type="hidden" name="sum" defaultValue="" />
            <button
              type="submit"
              className="btn h-10 w-full justify-between text-sm md:text-base"
              title="Перейти к подтверждению перевода из кошелька ЮMoney"
            >
              <span>ЮMoney</span>
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
