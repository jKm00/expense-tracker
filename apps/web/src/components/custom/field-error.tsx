import { useMemo } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function FieldError({ field }: { field: any }) {
  const errors = useMemo(() => {
    if (!field.state.meta.errors || field.state.meta.errors.length === 0) {
      return [];
    }

    // Extract error messages properly from Zod validation errors
    return field.state.meta.errors.map((error: unknown) => {
      if (typeof error === "string") {
        return error;
      }
      // Handle Zod error objects
      if (error && typeof error === "object" && "message" in error) {
        return (error as any).message;
      }
      // Fallback to string conversion
      return String(error);
    });
  }, [field.state.meta.errors]);

  if (field.state.meta.isTouched && field.state.meta.errors.length > 0) {
    return (
      <ul>
        {errors.map((error: string) => (
          <li key={error} className="text-destructive text-sm">
            {error}
          </li>
        ))}
      </ul>
    );
  }
}
