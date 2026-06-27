import {
  Form,
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { ProductAlias, ProductWithDetails } from "../products.models";
import { productMutations } from "../products.mutations";
import { productSchema } from "../products.validators";

function getProductErrorMessage(reason: string): string {
  switch (reason) {
    case "PRODUCT_NOT_FOUND":
      return "Product was not found and could therefore not be updated";
    case "PRODUCT_UNAUTHORIZED":
      return "You do not have permissions to update this product";
    case "PRODUCT_UPDATE_FAILED":
      return "Failed to update product, please try again!";
    case "PRODUCT_NAME_ALREADY_EXISTS":
      return "A product with this name already exists";
    case "PRODUCT_DB_ERROR":
    case "UNEXPECTED_DB_ERROR":
      return "Failed when trying to save to database. Please try again!";
    default:
      return "Something unexpected happened. Please try again!";
  }
}

function getAliasErrorMessage(reason: string): string {
  switch (reason) {
    case "PRODUCT_ALIAS_ALREADY_EXISTS":
      return "This alias already exists for a product";
    case "PRODUCT_ALIAS_EQUALS_CANONICAL":
      return "Alias cannot be the same as product name";
    case "PRODUCT_ALIAS_NOT_FOUND":
      return "Alias no longer exists";
    case "PRODUCT_UNAUTHORIZED":
      return "You do not have permission to modify this alias";
    default:
      return "Failed to save alias. Please try again!";
  }
}

export function ProductDetailsForm({ product }: { product: ProductWithDetails }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
    },
  });

  const [aliasName, setAliasName] = useState("");
  const [aliasFieldError, setAliasFieldError] = useState<string | null>(null);
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
  const [editingAliasName, setEditingAliasName] = useState("");
  const [editingAliasOriginalName, setEditingAliasOriginalName] = useState("");
  const [editingAliasError, setEditingAliasError] = useState<string | null>(null);

  const updateMutation = productMutations.updateProduct();
  const addAliasMutation = productMutations.addProductAlias();
  const updateAliasMutation = productMutations.updateProductAlias();
  const deleteAliasMutation = productMutations.deleteProductAlias();

  useEffect(() => {
    reset({ name: product.name });
  }, [product.name, reset]);

  const onSubmit = handleSubmit((data) => {
    clearErrors("name");
    updateMutation.mutate(
      {
        productId: product.id,
        ...data,
      },
      {
        onSuccess: ([error, updatedProduct]) => {
          if (error) {
            const message = getProductErrorMessage(error.reason);
            setError("name", { message });
            toast.error(message);
            return;
          }

          reset({ name: updatedProduct?.name ?? data.name });
          toast.success("Product updated!");
        },
      },
    );
  });

  function handleDiscardName() {
    reset({ name: product.name });
    clearErrors("name");
  }

  function handleAddAlias() {
    if (aliasName.trim().length === 0) {
      setAliasFieldError("Alias name is required");
      return;
    }

    setAliasFieldError(null);
    addAliasMutation.mutate(
      {
        productId: product.id,
        name: aliasName,
      },
      {
        onSuccess: ([error]) => {
          if (error) {
            const message = getAliasErrorMessage(error.reason);
            setAliasFieldError(message);
            toast.error(message);
            return;
          }

          setAliasName("");
          setAliasFieldError(null);
          toast.success("Alias added");
        },
      },
    );
  }

  function handleStartEditAlias(alias: ProductAlias) {
    setEditingAliasId(alias.id);
    setEditingAliasName(alias.name);
    setEditingAliasOriginalName(alias.name);
    setEditingAliasError(null);
  }

  function handleCancelEditAlias() {
    setEditingAliasId(null);
    setEditingAliasName("");
    setEditingAliasOriginalName("");
    setEditingAliasError(null);
  }

  function handleSaveEditedAlias() {
    if (!editingAliasId) {
      return;
    }

    if (editingAliasName.trim().length === 0) {
      setEditingAliasError("Alias name is required");
      return;
    }

    setEditingAliasError(null);
    updateAliasMutation.mutate(
      {
        aliasId: editingAliasId,
        name: editingAliasName,
      },
      {
        onSuccess: ([error]) => {
          if (error) {
            const message = getAliasErrorMessage(error.reason);
            setEditingAliasError(message);
            toast.error(message);
            return;
          }

          toast.success("Alias updated");
          handleCancelEditAlias();
        },
      },
    );
  }

  function handleDeleteAlias(aliasId: string) {
    deleteAliasMutation.mutate(
      { aliasId },
      {
        onSuccess: ([error]) => {
          if (error) {
            const message = getAliasErrorMessage(error.reason);
            toast.error(message);
            return;
          }

          if (editingAliasId === aliasId) {
            handleCancelEditAlias();
          }
          toast.success("Alias removed");
        },
      },
    );
  }

  function handleAddAliasKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddAlias();
    }
    if (event.key === "Escape") {
      setAliasName("");
      setAliasFieldError(null);
    }
  }

  function handleEditAliasKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSaveEditedAlias();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelEditAlias();
    }
  }

  const isSavingAnyAlias =
    addAliasMutation.isPending ||
    updateAliasMutation.isPending ||
    deleteAliasMutation.isPending;
  const isEditingAliasDirty = editingAliasName !== editingAliasOriginalName;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic product information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form onSubmit={onSubmit}>
            <FormField>
              <FormFieldLabel required>Product Name</FormFieldLabel>
              <Input {...register("name")} placeholder="White Monster, Potato..." />
              <FormFieldError>{errors.name?.message}</FormFieldError>
            </FormField>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscardName}
                disabled={!isDirty || updateMutation.isPending}
              >
                Discard
              </Button>
              <LoaderButton
                type="submit"
                size="sm"
                isLoading={updateMutation.isPending}
                disabled={!isDirty || updateMutation.isPending}
              >
                Save changes
              </LoaderButton>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aliases</CardTitle>
          <CardDescription>
            Add alternate names for this product to improve search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField>
            <FormFieldLabel>Add alias</FormFieldLabel>
            <div className="flex gap-2">
              <Input
                value={aliasName}
                onChange={(e) => {
                  setAliasName(e.target.value);
                  if (aliasFieldError) {
                    setAliasFieldError(null);
                  }
                }}
                onKeyDown={handleAddAliasKeyDown}
                placeholder="Whole milk, Skim milk..."
                disabled={addAliasMutation.isPending}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddAlias}
                disabled={addAliasMutation.isPending}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            </div>
            <FormFieldError>{aliasFieldError}</FormFieldError>
          </FormField>

          <div className="space-y-2">
            {product.aliases.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-center">
                <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                  <Search className="size-4" />
                </div>
                <p className="text-sm font-medium">No aliases yet</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  Add alternate names, receipt labels, or common misspellings so this product is easier to find.
                </p>
              </div>
            ) : (
              product.aliases.map((alias) => {
                const isEditing = editingAliasId === alias.id;

                if (isEditing) {
                  return (
                    <div key={alias.id} className="rounded-lg border p-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingAliasName}
                          onChange={(e) => {
                            setEditingAliasName(e.target.value);
                            if (editingAliasError) {
                              setEditingAliasError(null);
                            }
                          }}
                          onKeyDown={handleEditAliasKeyDown}
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEditedAlias}
                          disabled={!isEditingAliasDirty || updateAliasMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditAlias}
                          disabled={updateAliasMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                      <FormFieldError>{editingAliasError}</FormFieldError>
                    </div>
                  );
                }

                return (
                  <div
                    key={alias.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <Badge variant="secondary" className="max-w-[70%] truncate">
                      {alias.name}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEditAlias(alias)}
                        disabled={isSavingAnyAlias}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAlias(alias.id)}
                        disabled={isSavingAnyAlias}
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
