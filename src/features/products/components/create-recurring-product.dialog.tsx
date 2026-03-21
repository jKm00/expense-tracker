import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Product, ProductWithTags } from "../product.models";
import { useEffect, useState } from "react";
import { productQueries } from "../product.queries";
import { useQuery } from "@tanstack/react-query";

export function CreateRecurringTransactionDialog() {
  const [product, setProduct] = useState<ProductWithTags | null>(null);
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState<
    "weekly" | "monthly" | "yearly" | null
  >(null);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  const { data } = useQuery(productQueries.getProductsOptions());
  const [_, res] = data ?? [null, null];
  // const products = res ? res.map((p) => ({ value: p.id, label: p.name })) : [];

  const countries = [
    { code: "", value: "", continent: "", label: "Select country" },
    {
      code: "ar",
      value: "argentina",
      label: "Argentina",
      continent: "South America",
    },
    {
      code: "au",
      value: "australia",
      label: "Australia",
      continent: "Oceania",
    },
    {
      code: "br",
      value: "brazil",
      label: "Brazil",
      continent: "South America",
    },
    {
      code: "ca",
      value: "canada",
      label: "Canada",
      continent: "North America",
    },
    { code: "cn", value: "china", label: "China", continent: "Asia" },
    {
      code: "co",
      value: "colombia",
      label: "Colombia",
      continent: "South America",
    },
    { code: "eg", value: "egypt", label: "Egypt", continent: "Africa" },
    { code: "fr", value: "france", label: "France", continent: "Europe" },
    { code: "de", value: "germany", label: "Germany", continent: "Europe" },
    { code: "it", value: "italy", label: "Italy", continent: "Europe" },
    { code: "jp", value: "japan", label: "Japan", continent: "Asia" },
    { code: "ke", value: "kenya", label: "Kenya", continent: "Africa" },
    {
      code: "mx",
      value: "mexico",
      label: "Mexico",
      continent: "North America",
    },
    {
      code: "nz",
      value: "new-zealand",
      label: "New Zealand",
      continent: "Oceania",
    },
    { code: "ng", value: "nigeria", label: "Nigeria", continent: "Africa" },
    {
      code: "za",
      value: "south-africa",
      label: "South Africa",
      continent: "Africa",
    },
    {
      code: "kr",
      value: "south-korea",
      label: "South Korea",
      continent: "Asia",
    },
    {
      code: "gb",
      value: "united-kingdom",
      label: "United Kingdom",
      continent: "Europe",
    },
    {
      code: "us",
      value: "united-states",
      label: "United States",
      continent: "North America",
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Create</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Recurring Transaction</DialogTitle>
          <DialogDescription>
            Create a recurring transaction that will be automatically processed
            by the given interval
          </DialogDescription>
        </DialogHeader>
        <div>
          <Combobox
            items={countries.filter((country) => country.code !== "")}
            itemToStringValue={(country: (typeof countries)[number]) =>
              country.label
            }
          >
            <ComboboxInput placeholder="Search countries..." />
            <ComboboxContent>
              <ComboboxEmpty>No countries found.</ComboboxEmpty>
              <ComboboxList>
                {(country) => (
                  <ComboboxItem key={country.code} value={country}>
                    <div>
                      <h3>{country.label}</h3>
                      <p>
                        {country.continent} ({country.code})
                      </p>
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Add tag</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
