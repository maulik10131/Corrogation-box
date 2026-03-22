const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    totalCount: number;
    pageCount: number;
    currentPage: number;
    perPage: number;
  };
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'Network error' };
  }
}

// Types
export interface Supplier {
  id: number;
  name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  gst_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  payment_terms: number;
  status: number;
  status_label: string;
}

export interface Material {
  id: number;
  name: string;
  code: string;
  category: string;
  category_label: string;
  sub_category: string;
  gsm: number | null;
  bf: number | null;
  width: number | null;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  last_purchase_rate: number;
  avg_rate: number;
  stock_value: number;
  is_low_stock: boolean;
  is_paper: boolean;
  warehouse_location: string;
  rack_number: string;
  description: string;
  status: number;
}

export interface StockTransaction {
  id: number;
  transaction_number: string;
  material_id: number;
  material_name: string;
  material_code: string;
  material_unit: string;
  transaction_type: string;
  type_label: string;
  is_inward: boolean;
  transaction_date: string;
  quantity: number;
  previous_stock: number;
  current_stock: number;
  rate: number;
  total_amount: number;
  supplier_id: number | null;
  supplier_name: string | null;
  invoice_no: string;
  invoice_date: string;
  challan_no: string;
  vehicle_no: string;
  batch_no: string;
  notes: string;
  created_by_name: string;
}

export interface StockSummary {
  total_materials: number;
  low_stock_count: number;
  total_stock_value: number;
  by_category: Array<{
    category: string;
    label: string;
    count: number;
    total_qty: number;
    total_value: number;
  }>;
}

// Suppliers API
export const getSuppliers = (params?: { status?: number; search?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.status !== undefined) queryParams.append('status', String(params.status));
  if (params?.search) queryParams.append('search', params.search);
  return fetchApi<Supplier[]>(`/suppliers?${queryParams.toString()}`);
};

export const getSupplier = (id: number) => fetchApi<Supplier>(`/suppliers/${id}`);

export const createSupplier = (data: Partial<Supplier>) =>
  fetchApi<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) });

export const updateSupplier = (id: number, data: Partial<Supplier>) =>
  fetchApi<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteSupplier = (id: number) =>
  fetchApi<void>(`/suppliers/${id}`, { method: 'DELETE' });

// Materials API
export const getMaterials = (params?: { 
  category?: string; 
  status?: number; 
  low_stock?: boolean;
  search?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.status !== undefined) queryParams.append('status', String(params.status));
  if (params?.low_stock) queryParams.append('low_stock', '1');
  if (params?.search) queryParams.append('search', params.search);
  return fetchApi<Material[]>(`/materials?${queryParams.toString()}`);
};

export const getMaterial = (id: number) => 
  fetchApi<{ material: Material; transactions: StockTransaction[] }>(`/materials/${id}`);

export const createMaterial = (data: Partial<Material>) =>
  fetchApi<Material>('/materials', { method: 'POST', body: JSON.stringify(data) });

export const updateMaterial = (id: number, data: Partial<Material>) =>
  fetchApi<Material>(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) });