import { z } from "zod";
import { checkbox, optionalText, uuid } from "./form";

export const profileInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Keep the name under 40 characters"),
  avatar: optionalText(8),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const createProfileSchema = profileInputSchema.extend({ isAdmin: checkbox });

export const profileUpdateSchema = profileInputSchema.extend({ id: uuid, isAdmin: checkbox });
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const profileIdSchema = z.object({ id: uuid });
