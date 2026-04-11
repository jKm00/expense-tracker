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
  return <div className="space-y-1.5">{children}</div>;
}

function FormFieldLabel({
  required = false,
  children,
}: {
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label className="gap-1 text-xs font-medium text-muted-foreground">
      {required && <span className="text-destructive">*</span>}
      {children}
    </Label>
  );
}

function FormFieldError({ children }: { children: React.ReactNode }) {
  return children ? (
    <p className="text-destructive text-xs mt-1">{children}</p>
  ) : null;
}

export { Form, FormField, FormFieldLabel, FormFieldError };
