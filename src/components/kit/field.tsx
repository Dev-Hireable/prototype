import type { ReactNode } from "react";
import { FORM_CONTROL, TEXT_BODY, TEXT_LABEL } from "@/components/kit/styles";

export function Field({ label, hint, error, required = false, children, className = "" }: { label: ReactNode; hint?: string; /** A validation message — it replaces the hint and is announced as an error. */ error?: string; /** Marks the label with an asterisk; the control itself carries `required` for screen readers. */ required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className={TEXT_LABEL}>
        {label}
        {required && (
          <span aria-hidden className="text-danger">
            {" *"}
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-[13px] leading-[1.2] tracking-[0.2px] text-danger">
          {error}
        </span>
      ) : (
        hint && <span className={TEXT_BODY}>{hint}</span>
      )}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FORM_CONTROL} ${props.className ?? ""}`} />;
}

/** Takes a ref too (React 19 passes it as a prop), so a form can focus it. */
export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={`${FORM_CONTROL} h-auto min-h-16 py-[13.5px] ${props.className ?? ""}`} />;
}
