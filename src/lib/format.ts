export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!isFinite(n)) return "0 ل.س";
  const hasFraction = Math.abs(n % 1) > 0.004;
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
  return `${formatted} ل.س`;
}

export function formatNumber(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString("en-US");
}

export function formatPercent(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  const hasFraction = Math.abs(n % 1) > 0.004;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: hasFraction ? 2 : 0 })}%`;
}

const AR_MONTHS = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];

const AR_WEEKDAYS = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
];

const AR_TIME = new Intl.DateTimeFormat("ar-SY-u-nu-latn", {
  hour: "2-digit",
  minute: "2-digit",
});

function parseDate(value: string | Date): Date {
  return typeof value === "string"
    ? new Date(`${value}${value.length === 10 ? "T00:00:00" : ""}`)
    : value;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = parseDate(value);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = parseDate(value);
  if (isNaN(d.getTime())) return "—";
  return `${AR_WEEKDAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}


export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return `${formatDate(d)} · ${AR_TIME.format(d)}`;
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return AR_TIME.format(d);
}

export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  edited: "معدّل",
  deleted: "محذوف",
  archived: "مؤرشف",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  login: "تسجيل دخول",
  order_created: "إضافة طلب",
  order_updated: "تعديل طلب",
  order_deleted: "حذف طلب",
  order_restored: "استعادة طلب",
  captain_created: "إضافة كابتن",
  captain_updated: "تعديل كابتن",
  captain_deleted: "حذف كابتن",
  user_deleted: "حذف مستخدم",
  period_deleted: "حذف دورة",
  user_enabled: "تفعيل مستخدم",
  user_disabled: "تعطيل مستخدم",
  user_created: "إضافة مستخدم",
  user_updated: "تعديل مستخدم",
  password_changed: "تغيير كلمة المرور",
  period_archived: "أرشفة دورة",
  period_created: "إنشاء دورة",
  commission_paid: "تسديد عمولة كابتن",
  commission_unpaid: "إلغاء تسديد عمولة",
};

export const DELETION_REASONS = [
  "إدخال خاطئ",
  "طلب مكرر",
  "اختيار كابتن خاطئ",
  "قيمة خاطئة",
  "سبب آخر",
];

export const AMOUNT_PRESETS = [
  10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000,
];
