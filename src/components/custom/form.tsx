import { Label } from "@/components/ui/label";

function Form({
  onSubmit,
  children,
}: {
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return <form onSubmit={onSubmit}>{children}</form>;
}

function FormField({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

function FormFieldLabel({
  required = false,
  children,
}: {
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label className="gap-1">
      {required && <span className="text-destructive">*</span>}
      {children}
    </Label>
  );
}

function FormFieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-destructive text-sm">{children}</p>;
}

export { Form, FormField, FormFieldLabel, FormFieldError };
