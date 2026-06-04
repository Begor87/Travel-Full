export type DocumentType =
  | 'ticket'
  | 'booking_confirmation'
  | 'passport'
  | 'visa'
  | 'insurance'
  | 'itinerary'
  | 'voucher'
  | 'receipt'
  | 'emergency_contact'
  | 'other';

export type DocumentMimeType = string;

export interface Document {
  id: string;
  tripId?: string;
  userId: string;
  title: string;
  type: DocumentType;
  mimeType: DocumentMimeType;
  sizeBytes: number;
  storageKey: string;
  url?: string;
  thumbnailUrl?: string;
  tags: string[];
  notes?: string;
  linkedEventIds: string[];
  ocrText?: string;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentInput {
  title: string;
  type: DocumentType;
  tripId?: string;
  tags?: string[];
  notes?: string;
  linkedEventIds?: string[];
}
