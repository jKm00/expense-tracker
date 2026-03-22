import { Tag } from "../tags/tag.models";

export type Product = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductWithTags = Product & { tags: Tag[] };
