const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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
export interface PaperConfig {
  top_liner: number;
  top_liner_bf?: number;
  fluting: number;
  bottom_liner: number;
  bottom_liner_bf?: number;
  middle_liner?: number;
  middle_liner_bf?: number;
  fluting1?: number;
  fluting2?: number;
  fluting3?: number;
  liner2?: number;
  liner2_bf?: number;
  liner3?: number;
  liner3_bf?: number;
}

export interface BoxCalculationParams {
  length: number;
  width: number;
  height: number;
  ply_count: number;
  flute_type: string;
  box_type?: string;
  paper_config?: PaperConfig;
  paper_rate?: number;
  conversion_cost?: number;
  printing_cost?: number;
  die_cost?: number;
  other_cost?: number;
  ups?: number;
  margin_percent?: number;
  wastage_percent?: number;
  quantity?: number;
}

export interface BoxCalculationResult {
  success: boolean;
  input: BoxCalculationParams;
  dimensions: {
    deckle_size: number;
    cutting_size: number;
    sheet_area_sqm: number;
    sheet_area_sqft: number;
    board_thickness: number;
    internal_dimensions: { length: number; width: number; height: number };
    external_dimensions: { length: number; width: number; height: number };
  };
  weight: {
    paper_weight_per_sheet: number;
    box_weight: number;
    liner_weight: number;
    fluting_weight: number;
    breakdown: Array<{
      layer: string;
      gsm: number;
      weight: number;
      take_up?: number;
    }>;
  };
  strength: {
    bursting_strength: number;
    ect: number;
    bct: number;
    max_stacking_load: number;
  };
  cost: {
    paper_cost: number;
    conversion_cost: number;
    printing_cost: number;
    die_cost: number;
    other_cost: number;
    sheet_cost: number;
    cost_per_box: number;
    wastage_amount: number;
  };
  pricing: {
    cost: number;
    margin_percent: number;
    margin_amount: number;
    selling_price: number;
    profit_per_box: number;
  };
  totals: {
    quantity: number;
    total_cost: number;
    total_amount: number;
    total_profit: number;
    total_weight: number;
  };
}

export interface BoxOptions {
  box_types: Record<string, string>;
  flute_types: Record<string, string>;
  ply_options: Record<number, string>;
  flute_specs: Record<string, { height: number; take_up: number; pitch: number }>;
}

// API Functions
export const calculateBox = (params: BoxCalculationParams) =>
  fetchApi<BoxCalculationResult>('/box/calculate', {
    method: 'POST',
    body: JSON.stringify(params),
  });

export const quickCalculateBox = (params: {
  length: number;
  width: number;
  height: number;
  ply_count: number;
  flute_type: string;
  quantity: number;
}) =>
  fetchApi<BoxCalculationResult>('/box/quick-calculate', {
    method: 'POST',
    body: JSON.stringify(params),
  });

export const getBoxOptions = () => fetchApi<BoxOptions>('/box/options');

export const getDefaultPaperConfig = (plyCount: number) =>
  fetchApi<PaperConfig>(`/box/paper-config/${plyCount}`);

export const getPaperRates = () =>
  fetchApi<Record<string, Array<{ id: number; gsm: number; bf: number; rate: number }>>>('/box/paper-rates');

export const getConversionCosts = () =>
  fetchApi<Array<{
    id: number;
    process_name: string;
    ply_count: number;
    flute_type: string;
    cost_per_sqm: number;
  }>>('/box/conversion-costs');

export const compareBoxConfigurations = (configurations: BoxCalculationParams[]) =>
  fetchApi<{
    data: Array<{
      config_index: number;
      label: string;
      result: BoxCalculationResult;
    }>;
    cheapest: any;
  }>('/box/compare', {
    method: 'POST',
    body: JSON.stringify({ configurations }),
  });

export const suggestBoxConfiguration = (params: {
  length: number;
  width: number;
  height: number;
  max_weight?: number;
  priority?: 'cost' | 'strength' | 'weight';
}) =>
  fetchApi<{
    recommended: any;
    alternatives: any[];
    all_options: any[];
  }>('/box/suggest', {
    method: 'POST',
    body: JSON.stringify(params),
  });