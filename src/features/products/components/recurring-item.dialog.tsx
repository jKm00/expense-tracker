import { Button } from "@/components/ui/button";
import { RecurringWithProduct } from "../product.models";
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

export function RecurringItemDialog({ item }: { item: RecurringWithProduct }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{item.product.name}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Recurring Product</DialogTitle>
          <DialogDescription>
            Edit details about the recurring product
          </DialogDescription>
        </DialogHeader>
        <div>TODO: Add edit form here</div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
