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
  Form,
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

export function NewTagDialog() {
  const [open, setOpen] = useState(false);

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
            case "TAG_NOT_RETURNED":
            case "TAG_DB_ERROR":
            case "TAG_SAVE_DB_ERROR":
            case "TAG_UNATHORIZED":
              message = "Failed to save tag. Please try again";
              break;
            default:
              message = `Something went wrong saving the tag ${reason satisfies never}. Please try again`;
          }
          toast.error(message);
        } else {
          handleOpenChange(false);
          toast.success("Tag created!");
        }
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
    }
  }

  function handleRandomizeColor() {
    const color = generateRandomHex();
    setValue("color", color);
  }

  function generateRandomHex() {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    return `#${randomColor.padStart(6, "0")}`;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus />
          <span className="max-md:sr-only">New tag</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
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
            <div className="flex gap-1">
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
              >
                <RefreshCcw />
              </Button>
            </div>
          </FormField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Add tag</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
