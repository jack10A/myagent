import clsx from "clsx";

export function StatusCard({
  title,
  value,
  tone = "neutral"
}: {
  title: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "urgent";
}) {
  return (
    <article
      className={clsx(
        "rounded-md border border-line bg-white p-4 shadow-soft",
        tone === "good" && "border-sage/50",
        tone === "warn" && "border-gold/60",
        tone === "urgent" && "border-coral/70"
      )}
    >
      <p className="text-xs font-medium text-ink/55">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </article>
  );
}

