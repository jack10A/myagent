export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">{eyebrow}</p>
      <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">{title}</h1>
      <p className="max-w-3xl text-sm leading-6 text-ink/65">{description}</p>
    </header>
  );
}

