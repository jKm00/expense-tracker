import { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "../ui/button";
import { Loader2 } from "lucide-react";

export type LoaderButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    isLoading: boolean;
    loadingText?: React.ReactElement;
  };

function LoaderButton({
  isLoading,
  loadingText,
  children,
  ...props
}: LoaderButtonProps) {
  return (
    <Button {...props}>
      <div
        className="grid items-center justify-items-center"
        style={{ gridTemplateAreas: "stack" }}
      >
        <span
          className={`flex items-center gap-2 ${isLoading ? "invisible" : "visible"}`}
          style={{ gridArea: "stack" }}
        >
          {children}
        </span>
        {loadingText ? (
          <span
            className={`${isLoading ? "visible" : "invisible"}`}
            style={{ gridArea: "stack" }}
          >
            {loadingText}
          </span>
        ) : (
          <Loader2
            className={`size-4 animate-spin ${isLoading ? "visible" : "invisible"}`}
            style={{ gridArea: "stack" }}
          />
        )}
      </div>
    </Button>
  );
}

export { LoaderButton };
