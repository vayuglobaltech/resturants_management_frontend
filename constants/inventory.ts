// constants/inventory.ts
export const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  USAGE: 'usage',
  WASTE: 'waste',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  ADJUSTMENT: 'adjustment',
} as const;

export const TRANSACTION_TYPE_LABELS = {
  [TRANSACTION_TYPES.PURCHASE]: 'Purchase',
  [TRANSACTION_TYPES.USAGE]: 'Usage',
  [TRANSACTION_TYPES.WASTE]: 'Waste',
  [TRANSACTION_TYPES.TRANSFER_IN]: 'Transfer In',
  [TRANSACTION_TYPES.TRANSFER_OUT]: 'Transfer Out',
  [TRANSACTION_TYPES.ADJUSTMENT]: 'Adjustment',
};

export const STATUS_CHOICES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const STATUS_LABELS = {
  [STATUS_CHOICES.PENDING]: 'Pending',
  [STATUS_CHOICES.APPROVED]: 'Approved',
  [STATUS_CHOICES.REJECTED]: 'Rejected',
};

export const STATUS_COLORS = {
  [STATUS_CHOICES.PENDING]: 'warning',
  [STATUS_CHOICES.APPROVED]: 'success',
  [STATUS_CHOICES.REJECTED]: 'error',
};

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];
export type TransactionStatus = typeof STATUS_CHOICES[keyof typeof STATUS_CHOICES];