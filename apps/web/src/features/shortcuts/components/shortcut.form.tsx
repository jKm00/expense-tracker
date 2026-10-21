import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productQueries } from "@/features/products/products.queries";
import { entryTypes } from "@/features/transactions/transactions.models";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CreateShortcutDTO, createShortcutSchema } from "../shortcuts.dtos";
import { ShortcutWithProducts } from "../shortcuts.models";
import { shortcutMutations } from "../shortcuts.mutations";

export function ShortcutForm({ shortcut }: { shortcut?: ShortcutWithProducts }) {
  const navigate = useNavigate();
  const createMutation = shortcutMutations.createShortcut();
  const updateMutation = shortcutMutations.updateShortcut();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [productSearch, setProductSearch] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    data: [_, productsResult],
  } = useSuspenseQuery(productQueries.getProductsOptions());
  const products = productsResult ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateShortcutDTO>({
    resolver: zodResolver(createShortcutSchema),
    defaultValues: {
      name: shortcut?.name ?? "",
      store: shortcut?.store ?? "",
      type: shortcut?.type ?? "expense",
      price: shortcut?.price ?? null,
      productIds: shortcut?.products.map((p) => p.id) ?? [],
    },
  });

  const selectedIds = watch("productIds");
  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return [...products]
      .filter((p) => p.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, productSearch]);

  function toggleProduct(productId: string, checked: boolean) {
    const next = checked
      ? [...selectedIds, productId]
      : selectedIds.filter((id) => id !== productId);
    setValue("productIds", next, { shouldValidate: true });
  }

  const onSubmit = handleSubmit((data) => {
    setSubmitError(null);
    const onSuccess = ([error]: [{ reason: string } | null, unknown]) => {
      if (error) {
        const message =
          error.reason === "SHORTCUT_NOT_FOUND"
            ? "The shortcut could not be found"
            : error.reason.startsWith("PRODUCT_")
              ? "One of the selected products could not be used"
              : "Failed to save shortcut. Please try again!";
        setSubmitError(message);
        toast.error(message);
      } else {
        toast.success(shortcut ? "Shortcut updated" : "Shortcut created");
        navigate({ to: "/dashboard/shortcuts" });
      }
    };
    const onError = () =>
      setSubmitError(
        "Shortcut could not be saved. Check your connection and try again.",
      );

    if (shortcut) {
      updateMutation.mutate(
        { shortcutId: shortcut.id, ...data },
        { onSuccess, onError },
      );
    } else {
      createMutation.mutate(data, { onSuccess, onError });
    }
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="space-y-6">
        <FormField>
          <FormFieldLabel required>Name</FormFieldLabel>
          <Input {...register("name")} placeholder="Energy drink" />
          <FormFieldError>{errors.name?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel>Store</FormFieldLabel>
          <Input {...register("store")} placeholder="Optional" />
          <FormFieldError>{errors.store?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel required>Type</FormFieldLabel>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {entryTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField>
          <FormFieldLabel>Price</FormFieldLabel>
          <Input
            {...register("price", {
              setValueAs: (value: string) => {
                const trimmed = value?.trim().replace(",", ".");
                return trimmed ? trimmed : null;
              },
            })}
            inputMode="decimal"
            placeholder="Leave empty to enter it every time"
          />
          <FormFieldError>{errors.price?.message}</FormFieldError>
        </FormField>

        <FormField>
          <FormFieldLabel required>Products</FormFieldLabel>
          <p className="text-xs text-muted-foreground">
            With one product it is used directly. With several, you pick one
            each time you run the shortcut.
          </p>
          <Input
            aria-label="Search products"
            placeholder="Search products..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
            {products.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                You have no products yet.{" "}
                <Link
                  to="/dashboard/products/new"
                  className="underline underline-offset-4"
                >
                  Create one
                </Link>{" "}
                first.
              </p>
            ) : filteredProducts.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No products match your search.
              </p>
            ) : (
              filteredProducts.map((product) => (
                <label
                  key={product.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    onCheckedChange={(checked) =>
                      toggleProduct(product.id, checked === true)
                    }
                  />
                  {product.name}
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedIds.length} selected
          </p>
          <FormFieldError>{errors.productIds?.message}</FormFieldError>
        </FormField>

        {submitError && <p className="text-xs text-destructive">{submitError}</p>}

        <LoaderButton
          type="submit"
          isLoading={isPending}
          disabled={isPending}
        >
          {shortcut ? "Save changes" : "Create shortcut"}
        </LoaderButton>
      </div>
    </Form>
  );
}
