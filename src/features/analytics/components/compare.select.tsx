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
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";

export function CompareSelect({ className }: { className?: string }) {
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
      <SelectTrigger className={className}>
        <ArrowLeftRight className="size-3.5 text-muted-foreground" />
        <SelectValue placeholder="Compare to..." />
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
