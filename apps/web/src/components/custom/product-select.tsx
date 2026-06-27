import { ProductWithTag } from "@/features/products/products.models";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Check, ChevronRight } from "lucide-react";

type Product = ProductWithTag;

type SelectableProduct = Product & {
  matchReason?: string;
  matchRank?: number;
};

function toSelectableProduct(name: string): SelectableProduct {
  const now = new Date();
  return {
    id: "",
    name,
    createdAt: now,
    updatedAt: now,
    userId: "",
    deletedAt: null,
    tags: [],
    aliases: [],
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sortByOldest(products: Product[]) {
  return [...products].sort((a, b) => {
    const createdDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (createdDiff !== 0) {
      return createdDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

function hasExactProductMatch(product: Product, normalizedInput: string) {
  if (!normalizedInput) {
    return false;
  }

  if (normalizeSearch(product.name) === normalizedInput) {
    return true;
  }

  return product.aliases.some(
    (alias) => (alias.normalizedName || normalizeSearch(alias.name)) === normalizedInput,
  );
}

function findExactProductMatch(products: Product[], value: string) {
  const normalizedValue = normalizeSearch(value);
  if (!normalizedValue) {
    return null;
  }

  return (
    sortByOldest(products).find((product) =>
      hasExactProductMatch(product, normalizedValue),
    ) ?? null
  );
}

function resolveSelectedProduct(products: Product[], value?: string) {
  if (!value) {
    return null;
  }

  return findExactProductMatch(products, value) ?? toSelectableProduct(value.trim());
}

function getMatchRank(product: Product, normalizedInput: string) {
  if (!normalizedInput) {
    return { rank: 999, reason: undefined };
  }

  const canonical = normalizeSearch(product.name);
  const aliases = product.aliases.map((alias) => ({
    raw: alias.name,
    normalized: alias.normalizedName || normalizeSearch(alias.name),
  }));

  if (canonical === normalizedInput) {
    return { rank: 1, reason: undefined };
  }

  const exactAlias = aliases.find((alias) => alias.normalized === normalizedInput);
  if (exactAlias) {
    return { rank: 2, reason: `alias: ${exactAlias.raw}` };
  }

  if (canonical.startsWith(normalizedInput)) {
    return { rank: 3, reason: undefined };
  }

  const prefixAlias = aliases.find((alias) => alias.normalized.startsWith(normalizedInput));
  if (prefixAlias) {
    return { rank: 4, reason: `alias: ${prefixAlias.raw}` };
  }

  if (canonical.includes(normalizedInput)) {
    return { rank: 5, reason: undefined };
  }

  const containsAlias = aliases.find((alias) => alias.normalized.includes(normalizedInput));
  if (containsAlias) {
    return { rank: 6, reason: `alias: ${containsAlias.raw}` };
  }

  return { rank: Number.POSITIVE_INFINITY, reason: undefined };
}

export function ProductSelect({
  products,
  defaultValue,
  onValueChange,
}: {
  products: Product[];
  defaultValue?: string;
  onValueChange?: (product: Product) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState<SelectableProduct | null>(() =>
    resolveSelectedProduct(products, defaultValue),
  );

  useEffect(() => {
    setValue(resolveSelectedProduct(products, defaultValue));
  }, [defaultValue, products]);

  const filteredProducts = useMemo(() => {
    const normalizedInput = normalizeSearch(inputValue);
    if (!normalizedInput) {
      return [...products]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((product) => ({ ...product }));
    }

    return products
      .map((product) => {
        const match = getMatchRank(product, normalizedInput);
        return {
          ...product,
          matchReason: match.reason,
          matchRank: match.rank,
        };
      })
      .filter((product) => (product.matchRank ?? Number.POSITIVE_INFINITY) < Number.POSITIVE_INFINITY)
      .sort((a, b) => {
        const rankDiff = (a.matchRank ?? 999) - (b.matchRank ?? 999);
        if (rankDiff !== 0) {
          return rankDiff;
        }
        return a.name.localeCompare(b.name);
      });
  }, [products, inputValue]);

  const exactInputMatch = useMemo(
    () => findExactProductMatch(products, inputValue),
    [products, inputValue],
  );
  const normalizedInput = normalizeSearch(inputValue);
  const createName = inputValue.trim();
  const canCreate = normalizedInput.length > 0 && !exactInputMatch;

  function handleSelect(product: Product) {
    setValue(product);
    setOpen(false);
    setInputValue("");

    if (onValueChange) {
      onValueChange(product);
    }
  }

  function handleCreate() {
    const existing = findExactProductMatch(products, inputValue);
    handleSelect(existing ?? toSelectableProduct(createName));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setInputValue("");
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-11 w-full justify-between text-base font-normal md:h-9 md:text-sm">
          {value ? (
            <span className="truncate">{value.name}</span>
          ) : (
            <span className="text-muted-foreground">Select product</span>
          )}
          <ChevronRight
            className={`size-3.5 text-muted-foreground transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="gap-0 p-0">
        <div className="p-2 pb-1">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search for product..."
            className="h-8 text-xs"
          />
        </div>
        {canCreate && (
          <Button
            onClick={handleCreate}
            variant="ghost"
            size="sm"
            className="mx-2 justify-start text-xs text-muted-foreground"
          >
            Create '{createName}'
          </Button>
        )}
        <div className="grid max-h-60 overflow-y-auto p-1">
          {filteredProducts.map((product) => (
            <Button
              key={product.id}
              onClick={() => handleSelect(product)}
              variant="ghost"
              size="sm"
              className="justify-between text-xs font-normal"
            >
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate">{product.name}</span>
                {product.matchReason ? (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {product.matchReason}
                  </span>
                ) : null}
              </span>
              {value && (value.id ? value.id === product.id : value.name === product.name) && (
                <Check className="size-3.5 text-primary" />
              )}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
