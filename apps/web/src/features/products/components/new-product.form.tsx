import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import { Tag } from "@/features/tags/tags.models";
import { tagsQueries } from "@/features/tags/tags.queries";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { productMutations } from "../products.mutations";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { productSchema } from "../products.validators";
import { TagBadge } from "@/features/tags/components/tag";
import { LoaderButton } from "@/components/custom/loader.button";

export function NewProductForm() {
  const {
    data: [_, tagsResult],
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  const navigate = useNavigate();
  const mutation = productMutations.createProduct();

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tags = useMemo(() => (tagsResult ? tagsResult : []), [tagsResult]);
  const unselectedTags = useMemo(
    () => tags.filter((t) => !selectedTags.includes(t)),
    [tags, selectedTags],
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
  });
  const productName = watch("name");
  const canSubmit = Boolean(productName?.trim());

  const onSubmit = handleSubmit((data) => {
    setSubmitError(null);
    mutation.mutate(
      {
        product: {
          name: data.name,
        },
        tagIds:
          selectedTags.length > 0 ? selectedTags.map((t) => t.id) : undefined,
      },
      {
        onSuccess: (res) => {
          const [error] = res;
          if (error) {
            let message: string;
            const reason = error.reason;
            switch (reason) {
              case "PRODUCT_NOT_RETURNED":
              case "UNEXPECTED_DB_ERROR":
                message =
                  "Failed to save product to database. Please try again!";
                break;
              default:
                message = `Unexpected error: ${reason satisfies never}`;
            }
            setSubmitError(message);
            toast.error(message);
          } else {
            navigate({
              to: "/dashboard/products",
            });
          }
        },
        onError: () => {
          setSubmitError("Product could not be saved. Check your connection and try again.");
        },
      },
    );
  });

  function addTag(tag: Tag) {
    setSelectedTags((prev) => [...prev, tag]);
  }

  function removeTag(tag: Tag) {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id));
  }

  return (
    <Form onSubmit={onSubmit}>
      <div className="space-y-6">
        <FormField>
          <FormFieldLabel required>Product Name</FormFieldLabel>
          <Input
            {...register("name")}
            placeholder="White Monster, Potato..."
          />
          <FormFieldError>{errors.name?.message}</FormFieldError>
        </FormField>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Selected tags{" "}
              <span className="text-muted-foreground">(optional)</span>
            </p>
            {selectedTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No selected tags
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    aria-label={`Remove ${tag.name} from product`}
                    onClick={() => removeTag(tag)}
                    className="cursor-pointer"
                    variant="secondary"
                  >
                    <TagIcon className="size-3" />
                    {tag.name}
                    <X className="size-3" />
                  </TagBadge>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Available tags
            </p>
            {unselectedTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available tags left to select
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {unselectedTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    aria-label={`Add ${tag.name} to product`}
                    onClick={() => addTag(tag)}
                    className="cursor-pointer"
                    variant="secondary"
                  >
                    <TagIcon className="size-3" />
                    {tag.name}
                    <Plus className="size-3" />
                  </TagBadge>
                ))}
              </div>
            )}
          </div>
        </div>
        <LoaderButton
          type="submit"
          size="sm"
          isLoading={mutation.isPending}
          disabled={!canSubmit || mutation.isPending}
          className="w-full"
        >
          Add product
        </LoaderButton>
        {!canSubmit ? (
          <p className="text-xs text-muted-foreground">
            Product name is required before you can add it.
          </p>
        ) : submitError ? (
          <p className="text-xs text-destructive">{submitError}</p>
        ) : null}
      </div>
    </Form>
  );
}
