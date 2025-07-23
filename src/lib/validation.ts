import { z } from 'zod';

// Customer data validation schema
export const customerDataSchema = z.object({
  customerName: z.string().max(100, 'Customer name must be less than 100 characters').optional(),
  orderId: z.string().regex(/^[A-Z]{3}-\d{5}$|^$/, 'Order ID must be in format ABC-12345 or empty').optional(),
  phoneNumber: z.string().regex(/^(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$|^$/, 'Invalid phone number format').optional(),
  serviceType: z.string().max(50, 'Service type must be less than 50 characters').optional(),
  additionalDetails: z.string().max(1000, 'Additional details must be less than 1000 characters').optional()
});

// Issue validation schema
export const issueSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.!?()]+$/, 'Title contains invalid characters'),
  description: z.string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters')
    .regex(/^[a-zA-Z0-9\s\-_.!?(),\n\r]+$/, 'Description contains invalid characters')
});

export type CustomerDataInput = z.infer<typeof customerDataSchema>;
export type IssueInput = z.infer<typeof issueSchema>;