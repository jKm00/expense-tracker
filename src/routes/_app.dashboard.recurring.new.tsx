import { createFileRoute } from "@tanstack/react-router";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useQuery } from "@tanstack/react-query";
import { productQueries } from "@/features/products/product.queries";
import {
  ProductWithTags,
  RecurringInterval,
} from "@/features/products/product.models";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { productMutations } from "@/features/products/product.mutations";

export const Route = createFileRoute("/_app/dashboard/recurring/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const [product, setProduct] = useState<ProductWithTags | null>(null);
  const [price, setPrice] = useState<string>("");
  const [interval, setInterval] = useState<RecurringInterval | undefined>(
    undefined,
  );
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery(productQueries.getProductsOptions());
  const [_, res] = data ?? [null, null];
  const products = res ?? [];

  const mutation = productMutations.addRecurringProduct();

  function handleSubmit() {
    setError(null);

    if (!product) {
      setError("Enter product");
      return;
    }

    if (price.length === 0) {
      setError("Enter price");
      return;
    }

    if (!interval) {
      setError("Enter interval");
      return;
    }

    if (!start) {
      setError("Enter start");
      return;
    }

    mutation.mutate(
      {
        productId: product.id,
        price: Number(price),
        interval,
        startDate: start,
        endDate: end,
      },
      {
        onSuccess: (data) => {
          const [err] = data;
          if (err) {
            console.log(err);
            console.log(err);
          } else {
            setProduct(null);
            setPrice("");
            setInterval(undefined);
            setStart(undefined);
            setEnd(undefined);
          }
        },
        onError: (error) => {
          console.log(error);
        },
      },
    );
  }

  return (
    <div>
      <h2 className="font-black mb-4">Add new</h2>
      <Label>Product</Label>
      <Combobox
        items={products}
        itemToStringValue={(p: (typeof products)[number]) => p.id}
        itemToStringLabel={(p: (typeof products)[number]) => p.name}
        value={product}
        onValueChange={(v) => setProduct(v)}
      >
        <ComboboxInput placeholder="Search countries..." />
        <ComboboxContent>
          <ComboboxEmpty>No countries found.</ComboboxEmpty>
          <ComboboxList>
            {(p: ProductWithTags) => (
              <ComboboxItem key={p.id} value={p}>
                {p.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Label>Price</Label>
      <Input
        type="string"
        placeholder="Price..."
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <Label>Interval</Label>
      <Select
        value={interval}
        onValueChange={(v: RecurringInterval) => setInterval(v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select interval" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Interval</SelectLabel>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!start}
                  className="grow justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {start ? format(start, "PPP") : <span>Pick start date</span>}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={start}
                  onSelect={setStart}
                  defaultMonth={start}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => setStart(undefined)}>
              <X />
            </Button>
          </div>
        </div>
        <div>
          <Label>End Date (optional)</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-empty={!end}
                  className="grow justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {end ? format(end, "PPP") : <span>Pick end date</span>}
                  <ChevronDownIcon />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={end}
                  onSelect={setEnd}
                  defaultMonth={end}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => setEnd(undefined)}>
              <X />
            </Button>
          </div>
        </div>
      </div>
      <Button className="w-full" onClick={handleSubmit}>
        Create
      </Button>
      {error && <p className="text-red-400 test-xs">{error}</p>}
    </div>
  );
}
