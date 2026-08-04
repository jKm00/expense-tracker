import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "@/features/auth/auth.utils";
import { dataPortabilityService } from "./data-portability.service";
import { applyImportSchema, exportPeriodSchema, previewImportSchema } from "./data-portability.dtos";

const exportData = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(exportPeriodSchema)
  .handler(async ({ context, data }) => {
    return await dataPortabilityService.exportData(context.user.id, data);
  });

const previewImport = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(previewImportSchema)
  .handler(async ({ context, data }) => {
    return await dataPortabilityService.previewImport(context.user.id, data.payload);
  });

const applyImport = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(applyImportSchema)
  .handler(async ({ context, data }) => {
    return await dataPortabilityService.applyImport(context.user.id, data.payload);
  });

export const dataPortabilityController = {
  exportData,
  previewImport,
  applyImport,
};
