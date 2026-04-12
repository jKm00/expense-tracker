import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Route } from "@/routes/_app/dashboard/analytics";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function CompareSelect() {
  const { comparison } = Route.useSearch();
  const navigate = useNavigate();

  const [value, setValue] = useState(() => comparison || "month");

  function handleValueChange(value: "year" | "month") {
    setValue(value);
    navigate({
      to: "/dashboard/analytics",
      search: (prev) => ({
        ...prev,
        comparison: value,
      }),
    });
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue placeholder="Choose how to compare" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Comparison</SelectLabel>
          <SelectItem value="month">Last month</SelectItem>
          <SelectItem value="year">Last year</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
