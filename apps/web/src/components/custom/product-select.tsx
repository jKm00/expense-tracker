import { useEffect, useMemo, useState } from "react";
import { Product } from "@/features/products/products.models";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Check, ChevronRight } from "lucide-react";
import { Input } from "../ui/input";

function toSelectableProduct(name: string): Product {
  const now = new Date();
  return {
    id: "",
    name,
    createdAt: now,
    updatedAt: now,
    userId: "",
    deletedAt: null,
  };
}

function resolveSelectedProduct(products: Product[], value?: string) {
  if (!value) {
    return null;
  }

  return products.find((product) => product.name === value) ?? toSelectableProduct(value);
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
  const [value, setValue] = useState<Product | null>(() =>
    resolveSelectedProduct(products, defaultValue),
  );

  useEffect(() => {
    setValue(resolveSelectedProduct(products, defaultValue));
  }, [defaultValue, products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(inputValue.toLowerCase()),
    );
  }, [products, inputValue]);

  function handleSelect(product: Product) {
    setValue(product);
    setOpen(false);
    setInputValue("");

    if (onValueChange) {
      onValueChange(product);
    }
  }

  function handleOpenChange(open: boolean) {
    setOpen(open);

    if (!open) {
      setInputValue("");
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-11 md:h-9 w-full justify-between font-normal text-base md:text-sm">
          {value ? (
            <span className="truncate">{value.name}</span>
          ) : (
            <span className="text-muted-foreground">Select product</span>
          )}
          <ChevronRight
            className={`size-3.5 ${open ? "rotate-90" : ""} transition-transform text-muted-foreground`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 gap-0">
        <div className="p-2 pb-1">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search for product..."
            className="h-8 text-xs"
          />
        </div>
        {inputValue.length > 0 && (
          <Button
            onClick={() => handleSelect(toSelectableProduct(inputValue))}
            variant="ghost"
            size="sm"
            className="mx-2 justify-start text-muted-foreground text-xs"
          >
            Create '{inputValue}'
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
              <span className="truncate">{product.name}</span>
              {value && value.name === product.name && (
                <Check className="size-3.5 text-primary" />
              )}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
