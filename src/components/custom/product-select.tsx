import { useMemo, useState } from "react";
import { Product } from "@/features/products/products.models";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Check, ChevronRight } from "lucide-react";
import { Input } from "../ui/input";
import { wait } from "@/utils";

export function ProductSelect({
  products,
  selectedProductId,
  onValueChange,
}: {
  products: Product[];
  selectedProductId?: string;
  onValueChange?: (product: Product) => void;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState<Product | null>(() => {
    if (!selectedProductId) return null;

    const found = products.find((p) => p.id === selectedProductId);
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
        <Button variant="outline" className="w-full justify-between">
          {value ? (
            value.name
          ) : (
            <span className="text-muted-foreground">Select product</span>
          )}
          <ChevronRight
            className={`${open ? "rotate-90" : ""} transition-transform text-muted-foreground`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 gap-0">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search for product..."
          className="mb-1"
        />
        {inputValue.length > 0 && (
          <Button
            onClick={() =>
              handleSelect({
                id: "",
                name: inputValue,
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: "",
              })
            }
            variant="ghost"
            className="justify-start text-muted-foreground"
          >
            Create '{inputValue}'
          </Button>
        )}
        <div className="grid max-h-60 overflow-y-scroll">
          {filteredProducts.map((product) => (
            <Button
              key={product.id}
              onClick={() => handleSelect(product)}
              variant="ghost"
              className="justify-between"
            >
              {product.name}
              {value && value.name === product.name && <Check />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
