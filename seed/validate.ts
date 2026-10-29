import * as z from 'zod';

export const ParsedRowSchema = z.object({
  title: z.string().trim(),
  content: z.string().trim(),
  category: z.string().trim(),
  authorUsername: z.string().trim(),
  authorEmail: z.email().trim(),
  authorBio: z.string().trim(),
  readingTime: z.coerce.number().nonnegative(),
  imageUrl: z.url(),
  imageRemoteKey: z.string().trim(),
});
export const ParsedArraySchema = z.array(ParsedRowSchema);
export const PasswordSchema = z.string().trim();
