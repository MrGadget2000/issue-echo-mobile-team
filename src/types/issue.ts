export interface CustomerData {
  customerName?: string;
  orderId?: string;
  phoneNumber?: string;
  serviceType?: string;
  additionalDetails?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  votes: number;
  customerData: CustomerData[];
  createdAt: Date;
  updatedAt: Date;
  votedBy: string[]; // Track who voted to prevent duplicate votes
}