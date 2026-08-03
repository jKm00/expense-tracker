import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, RefreshCcw } from "lucide-react";
import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { tagsMutations } from "../tags.mutations";
import { zodResolver } from "@hookform/resolvers/zod";
import { addTagSchema } from "../tags.dtos";
import { useMemo, useState } from "react";
import { wait } from "@/utils";
import { toast } from "sonner";
import { LoaderButton } from "@/components/custom/loader.button";
import { tagUtils } from "../tags.utils";

export function NewTagDialog() {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = tagsMutations.createTag();
  const {
    register,
    setValue,
    watch,
    resetField,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addTagSchema),
  });

  const color = watch("color") || undefined;
  const tagName = watch("name");
  const canSubmit = Boolean(tagName?.trim());
  const hexValues = useMemo(() => {
    if (!color) return { border: undefined, bg: undefined, text: undefined };

    return {
      border: `${color}40`,
      bg: `${color}10`,
      text: color,
    };
  }, [color]);

  const onSubmit = handleSubmit((data) => {
    setSubmitError(null);
    mutation.mutate(data, {
      onSuccess: (res) => {
        const [error] = res;
        if (error) {
          let message: string;
          const reason = error.reason;
          switch (reason) {
            case "TAG_NOT_RETURNED":
            case "TAG_DB_ERROR":
            case "TAG_UNATHORIZED":
              message = "Failed to save tag. Please try again";
              break;
            default:
              message = `Something went wrong saving the tag ${reason satisfies never}. Please try again`;
          }
          setSubmitError(message);
          toast.error(message);
        } else {
          handleOpenChange(false);
          toast.success("Tag created!");
        }
      },
      onError: () => {
        setSubmitError("Tag could not be saved. Check your connection and try again.");
      },
    });
  });

  async function handleOpenChange(isOpen: boolean) {
      setOpen(isOpen);
      if (!isOpen) {
      // Wait so UI does not reset before dialog is closed
      await wait(100);
        resetField("name");
        resetField("color");
        setSubmitError(null);
      }
  }

  function handleRandomizeColor() {
    const color = tagUtils.generateRandomHex();
    setValue("color", color);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Plus className="size-4" />
          <span className="max-md:sr-only">New tag</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Tag</DialogTitle>
          <DialogDescription>
            Create a new tag that can be linked to products and transaction
            items
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <FormField>
            <FormFieldLabel required>Tag name</FormFieldLabel>
            <Input {...register("name")} placeholder="Grocery, Meat..." />
            <FormFieldError>{errors.name?.message}</FormFieldError>
          </FormField>
          <FormField>
            <FormFieldLabel>
              Tag color{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </FormFieldLabel>
            <div className="flex gap-2">
              <Input
                {...register("color")}
                style={{
                  borderColor: `${hexValues.border}`,
                  color: `${hexValues.text}`,
                  backgroundColor: `${hexValues.bg}`,
                }}
                className="border-muted"
                placeholder="Generate color >>>"
                readOnly
              />
              <Button
                type="button"
                aria-label="Generate tag color"
                onClick={handleRandomizeColor}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                <RefreshCcw className="size-4" />
              </Button>
            </div>
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <LoaderButton
              type="submit"
              size="sm"
              isLoading={mutation.isPending}
              disabled={!canSubmit || mutation.isPending}
            >
              Add tag
            </LoaderButton>
          </DialogFooter>
          {!canSubmit ? (
            <p className="text-xs text-muted-foreground">
              Tag name is required before you can add it.
            </p>
          ) : submitError ? (
            <p className="text-xs text-destructive">{submitError}</p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
