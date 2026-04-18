import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
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
import { Input } from "@/components/ui/input";
import { Tag } from "../tags.models";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateTagSchema } from "../tags.dtos";
import { LoaderButton } from "@/components/custom/loader.button";
import { RefreshCcw } from "lucide-react";
import { tagUtils } from "../tags.utils";
import { useEffect, useMemo, useState } from "react";
import { wait } from "@/utils";
import { tagsMutations } from "../tags.mutations";
import { toast } from "sonner";

export function EditTagDialog({
  tag,
  children,
}: {
  tag: Tag;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const mutation = tagsMutations.updateTag();
  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(updateTagSchema),
    defaultValues: {
      tagId: tag.id,
      name: tag.name,
      color: tag.color ?? undefined,
    },
  });

  useEffect(() => {
    reset({ tagId: tag.id, name: tag.name, color: tag.color ?? undefined });
  }, [tag, reset]);

  const color = watch("color") || undefined;
  const hexValues = useMemo(() => {
    if (!color) return { border: undefined, bg: undefined, text: undefined };

    return {
      border: `${color}40`,
      bg: `${color}10`,
      text: color,
    };
  }, [color]);

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: (res) => {
        const [err] = res;
        if (err) {
          let message: string;
          const reason = err.reason;
          switch (reason) {
            case "TAG_NOT_FOUND":
              message =
                "Tag was not found and could therefore not be updated...";
              break;
            case "TAG_UNATHORIZED":
              message = "You do not have permission to update this tag...";
              break;
            case "TAG_ALREADY_EXISTS":
              message =
                "A tag with the provided name already exists. Please choose another name!";
              break;
            case "TAG_DB_ERROR":
            case "TAG_NOT_RETURNED":
              message =
                "Something unexpected happened when trying to update the tag. Please try again!";
              break;
            default:
              message = `Unexpected error: ${reason satisfies never}. Please try again!`;
          }
          toast.error(message);
        } else {
          toast.success("Tag updated!");
          handleOpenChange(false);
        }
      },
    });
  });

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      await wait(100);
      reset({ tagId: tag.id, name: tag.name, color: tag.color ?? undefined });
    }
  }

  function handleRandomizeColor() {
    const color = tagUtils.generateRandomHex();
    setValue("color", color);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="size-8 p-0">
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <Form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Make changes to your tag here. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-4">
            <FormField>
              <FormFieldLabel required>Tag Name</FormFieldLabel>
              <Input {...register("name")} placeholder="Grocery, Meat..." />
              <FormFieldError>{errors.name?.message}</FormFieldError>
            </FormField>
            <FormField>
              <FormFieldLabel>
                Color <span className="text-muted-foreground">(Optional)</span>
              </FormFieldLabel>
              <div className="flex gap-2">
                <Input
                  readOnly
                  {...register("color")}
                  placeholder="Generate color >>>"
                  className="border-muted"
                  style={{
                    borderColor: hexValues.border,
                    color: hexValues.text,
                    backgroundColor: hexValues.bg,
                  }}
                />
                <Button
                  type="button"
                  onClick={handleRandomizeColor}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                >
                  <RefreshCcw className="size-4" />
                </Button>
              </div>
              <FormFieldError>{errors.color?.message}</FormFieldError>
            </FormField>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <LoaderButton
              type="submit"
              size="sm"
              isLoading={mutation.isPending}
              disabled={!isDirty || mutation.isPending}
            >
              Save changes
            </LoaderButton>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
