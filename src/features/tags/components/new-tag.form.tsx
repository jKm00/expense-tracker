import { Form, FormField, FormFieldLabel } from "@/components/custom/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const colors = [
  {
    label: "Blue",
    value: "blue",
    bg: "bg-blue-400",
    text: "text-blue-400",
    border: "border-blue-400",
  },
  {
    label: "Red",
    value: "red",
    bg: "bg-red-400",
    text: "text-red-400",
    border: "border-red-400",
  },
];

type Color = (typeof colors)[number];

export function NewTagForm() {
  const { handleSubmit } = useForm();

  const onSubmit = handleSubmit((data) => {
    console.log(data);
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="grid gap-4">
        <FormField>
          <FormFieldLabel required>Tag name</FormFieldLabel>
          <Input placeholder="Grocery, Meat..." />
        </FormField>
        <FormField>
          <FormFieldLabel>
            Tag color <span className="text-muted-foreground">(Optional)</span>
          </FormFieldLabel>
          <Combobox
            items={colors}
            itemToStringValue={(color: Color) => color.label}
            autoHighlight
          >
            <ComboboxInput placeholder="Select a framework" />
            <ComboboxContent>
              <ComboboxEmpty>No colors found.</ComboboxEmpty>
              <ComboboxList>
                {(color: Color) => (
                  <ComboboxItem key={color.value} value={color}>
                    <div className={`size-3 rounded-xs ${color.bg}`} />
                    {color.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </FormField>
      </div>
    </Form>
  );
}
