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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ProductAlias, ProductWithDetails } from "../products.models";
import { productMutations } from "../products.mutations";
import { productSchema } from "../products.validators";

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

export function EditProductForm({ product }: { product: ProductWithDetails }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
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
  const [editingAliasError, setEditingAliasError] = useState<string | null>(null);

  const updateMutation = productMutations.updateProduct();
  const addAliasMutation = productMutations.addProductAlias();
  const updateAliasMutation = productMutations.updateProductAlias();
  const deleteAliasMutation = productMutations.deleteProductAlias();

  const onSubmit = handleSubmit((data) => {
    updateMutation.mutate(
      {
        productId: product.id,
        ...data,
      },
      {
        onSuccess: (res) => {
          const [error] = res;
          if (error) {
            let message: string;
            const reason = error.reason;
            switch (reason) {
              case "PRODUCT_NOT_FOUND":
                message = "Product was not found and could therefore not be updated";
                break;
              case "PRODUCT_UNAUTHORIZED":
                message = "You do not have permissions to update this product";
                break;
              case "PRODUCT_UPDATE_FAILED":
                message = "Failed to update product, please try again!";
                break;
              case "PRODUCT_NAME_ALREADY_EXISTS":
                message = "A product with this name already exists";
                break;
              case "PRODUCT_DB_ERROR":
              case "UNEXPECTED_DB_ERROR":
                message = "Failed when trying to save to database. Please try again!";
                break;
              default:
                message = "Something unexpected happened. Please try again!";
            }
            toast.error(message);
          } else {
            toast.success("Product updated!");
          }
        },
      },
    );
  });

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
    setEditingAliasError(null);
  }

  function handleCancelEditAlias() {
    setEditingAliasId(null);
    setEditingAliasName("");
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
            <LoaderButton
              type="submit"
              size="sm"
              isLoading={updateMutation.isPending}
              disabled={!isDirty || updateMutation.isPending}
              className="mt-2 w-full"
            >
              Save changes
            </LoaderButton>
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
              <p className="text-sm text-muted-foreground">No aliases yet</p>
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
                          disabled={updateAliasMutation.isPending}
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
