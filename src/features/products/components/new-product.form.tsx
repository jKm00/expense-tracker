import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tag } from "@/features/tags/tags.models";
import { tagsQueries } from "@/features/tags/tags.queries";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { productMutations } from "../products.mutations";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

const newProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export function NewProductForm() {
  const {
    data: [_, tagsResult],
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  const navigate = useNavigate();
  const mutation = productMutations.createProduct();

  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const tags = useMemo(() => (tagsResult ? tagsResult : []), [tagsResult]);
  const unselectedTags = useMemo(
    () => tags.filter((t) => !selectedTags.includes(t)),
    [tags, selectedTags],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(newProductSchema),
  });

  const onSubmit = handleSubmit((data) => {
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
          const [error, product] = res;
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
            toast.error(message);
          } else {
            navigate({
              to: "/dashboard/products/$productId",
              params: { productId: product.id },
            });
          }
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
    <form onSubmit={onSubmit}>
      <Card>
        <CardContent>
          <FormField>
            <FormFieldLabel required>Product Name</FormFieldLabel>
            <Input
              {...register("name")}
              placeholder="White Monster, Potato..."
            />
            <FormFieldError>{errors.name?.message}</FormFieldError>
          </FormField>
          <div className="mt-4">
            <div className="mb-4">
              <h3 className="mb-1">
                Selected tags{" "}
                <span className="text-muted-foreground">(optional)</span>
              </h3>
              {selectedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No selected tags
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <Badge key={tag.id} onClick={() => removeTag(tag)}>
                      <X />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <h3 className="mb-1">Available tags</h3>
            {unselectedTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available tags left to select
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {unselectedTags.map((tag) => (
                  <Badge key={tag.id} onClick={() => addTag(tag)}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Add product</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
