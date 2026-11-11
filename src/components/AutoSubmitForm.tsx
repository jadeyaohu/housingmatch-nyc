"use client";
/** A GET filter form that applies as soon as a select changes (the Apply button stays for no-JS). */
export function AutoSubmitForm({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <form className={className} aria-label={label} onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}>
      {children}
    </form>
  );
}
