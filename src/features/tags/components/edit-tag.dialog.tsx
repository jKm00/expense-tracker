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
import { RefreshCcw } from "lucide-react";
import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { tagsMutations } from "../tags.mutations";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateTagSchema, UpdateTagDTO } from "../tags.dtos";
import { useMemo, useState } from "react";
import { wait } from "@/utils";
import { toast } from "sonner";
import { TagWithProduct } from "../tags.models";
import { LoaderButton } from "@/components/custom/loader.button";

export function EditTagDialog({
  tag,
  children,
}: {
  tag: TagWithProduct;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const mutation = tagsMutations.updateTag();
  const {
    register,
    setValue,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateTagDTO>({
    resolver: zodResolver(updateTagSchema),
    defaultValues: {
      tagId: tag.id,
      name: tag.name,
      color: tag.color ?? undefined,
    },
  });

  const color = watch("color") || undefined;
  const hexValues = useMemo(() => {
    if (!color) return { border: undefined, bg: undefined, text: undefined };

    return {
      border: color,
      bg: `${color}10`,
      text: color,
    };
  }, [color]);

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: (res) => {
        const [error] = res;
        if (error) {
          let message: string;
          const reason = error.reason;
          switch (reason) {
            case "TAG_ALREADY_EXISTS":
              message = `A tag with that name already exists`;
              break;
            case "TAG_NOT_FOUND":
              message = "Tag was not found and could therefore not be updated";
              break;
            case "TAG_UNATHORIZED":
              message = "You do not have permission to edit this tag";
              break;
            case "TAG_NOT_RETURNED":
            case "TAG_DB_ERROR":
              message = "Failed to update tag. Please try again";
              break;
            default:
              message = `Something went wrong updating the tag ${reason satisfies never}. Please try again`;
          }
          toast.error(message);
        } else {
          handleOpenChange(false);
          toast.success("Tag updated!");
        }
      },
    });
  });

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      // Wait so UI does not reset before dialog is closed
      await wait(100);
      reset({
        tagId: tag.id,
        name: tag.name,
        color: tag.color ?? undefined,
      });
    }
  }

  function handleRandomizeColor() {
    const color = generateRandomHex();
    setValue("color", color, { shouldDirty: true });
  }

  function generateRandomHex() {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return `#${randomColor.padStart(6, "0")}`;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild className="flex justify-between w-full">
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tag</DialogTitle>
          <DialogDescription>
            Update the name and color of the tag
          </DialogDescription>
        </DialogHeader>
        <FormField>
          <FormFieldLabel required>Tag name</FormFieldLabel>
          <Input {...register("name")} placeholder="Grocery, Meat..." />
          <FormFieldError>{errors.name?.message}</FormFieldError>
        </FormField>
        <FormField>
          <FormFieldLabel>
            Tag color <span className="text-muted-foreground">(Optional)</span>
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
              onClick={handleRandomizeColor}
              variant="outline"
              size="icon"
            >
              <RefreshCcw className="size-4" />
            </Button>
          </div>
        </FormField>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <LoaderButton
            type="submit"
            onClick={onSubmit}
            isLoading={mutation.isPending}
            disabled={!isDirty || mutation.isPending}
          >
            Save changes
          </LoaderButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
