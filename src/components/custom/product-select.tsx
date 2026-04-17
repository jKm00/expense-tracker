import { useMemo, useState } from "react";
import { Product } from "@/features/products/products.models";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Check, ChevronRight } from "lucide-react";
import { Input } from "../ui/input";
import { wait } from "@/utils";

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
  const [value, setValue] = useState<Product | null>(() => {
    if (!defaultValue) return null;

    const found = products.find((p) => p.name === defaultValue);
    if (!found) return null;
    return found;
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(inputValue.toLowerCase()),
    );
  }, [products, inputValue]);

  function handleSelect(product: Product) {
    setOpen(false);
    setValue(product);

    if (onValueChange) {
      onValueChange(product);
    }

    clearInput();
  }

  function handleOpenChange(open: boolean) {
    setOpen(open);

    if (!open) {
      clearInput();
    }
  }

  async function clearInput() {
    // Wait with clearing input so UI doesnt flicker
    await wait(100);
    setInputValue("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
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
            onClick={() =>
              handleSelect({
                id: "",
                name: inputValue,
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: "",
                deletedAt: null,
              })
            }
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
