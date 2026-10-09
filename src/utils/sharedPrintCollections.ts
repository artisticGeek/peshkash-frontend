import axios from 'axios';
import { API_BASE_URL } from '../config';

export type SharedPrintCollectionSummary = {
  id: number;
  token: string;
  path: string;
  name: string;
  notes?: string | null;
  remarks?: string | null;
  artworkCount: number;
  sharedAt: string;
  updatedAt: string;
  readOnly: true;
};

export async function listSharedPrintCollections(): Promise<SharedPrintCollectionSummary[]> {
  const { data } = await axios.get<SharedPrintCollectionSummary[]>(`${API_BASE_URL}/print-collections/shared`);
  return Array.isArray(data) ? data : [];
}

export async function customerPostLoginPath(): Promise<string> {
  try {
    const shares = await listSharedPrintCollections();
    if (shares.length) return '/print-collections';
  } catch {
    // Saved items remains a safe destination if share lookup is temporarily unavailable.
  }
  return '/home/saved';
}
