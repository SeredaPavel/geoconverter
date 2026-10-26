// Public recipient details, not credentials.
// https://yoomoney.ru/docs/payment-buttons/using-api/forms
// https://yoomoney.ru/document/kollektivniie-sbor-deneg
export const YOOMONEY_FORM_URL = "https://yoomoney.ru/quickpay/confirm";
export const YOOMONEY_FORM_FIELDS = {
  receiver: "4100119668140952",
  "quickpay-form": "button",
  paymentType: "PC",
  label: "geoconverter-support",
  successURL: "https://geoconverter.ru/",
} as const;

export function prepareYooMoneyTransfer(amount: string) {
  const text = amount.trim();
  if (!text) throw new Error("Укажите сумму поддержки.");
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) {
    throw new Error("Введите сумму числом, не более двух знаков после запятой.");
  }

  const [roubles, fraction = ""] = text.replace(",", ".").split(".");
  // Integer kopecks avoid rounding a monetary value through floating point.
  const kopecks = Number(roubles) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(kopecks) || kopecks < 200 || kopecks > 1_500_000) {
    throw new Error("Укажите сумму от 2 до 15 000 ₽.");
  }

  return {
    ...YOOMONEY_FORM_FIELDS,
    sum: `${Math.floor(kopecks / 100)}.${String(kopecks % 100).padStart(2, "0")}`,
  };
}
