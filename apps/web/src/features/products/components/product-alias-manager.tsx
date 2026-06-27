import {
  FormField,
  FormFieldError,
  FormFieldLabel,
} from "@/components/custom/form";
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
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import type { ProductAlias, ProductWithDetails } from "../products.models";
import { productMutations } from "../products.mutations";

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

export function ProductAliasManager({ product }: { product: ProductWithDetails }) {
  const [aliasName, setAliasName] = useState("");
  const [aliasFieldError, setAliasFieldError] = useState<string | null>(null);
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
  const [editingAliasName, setEditingAliasName] = useState("");
  const [editingAliasOriginalName, setEditingAliasOriginalName] = useState("");
  const [editingAliasError, setEditingAliasError] = useState<string | null>(null);

  const addAliasMutation = productMutations.addProductAlias();
  const updateAliasMutation = productMutations.updateProductAlias();
  const deleteAliasMutation = productMutations.deleteProductAlias();

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
  );
}
