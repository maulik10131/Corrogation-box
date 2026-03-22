'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalculatorIcon,
  CubeIcon,
  ScaleIcon,
  CurrencyRupeeIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

// Types
interface BoxCalculationResult {
  success: boolean;
  error?: string;
  dimensions?: {
    deckle_size: number;
    cutting_size: number;
    sheet_area_sqm: number;
    sheet_area_sqft: number;
    board_thickness: number;
    internal_dimensions: { length: number; width: number; height: number };
    external_dimensions: { length: number; width: number; height: number };
  };
  weight?: {
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
  strength?: {
    bursting_strength: number;
    ect: number;
    bct: number;
    max_stacking_load: number;
  };
  cost?: {
    paper_cost: number;
    conversion_cost: number;
    printing_cost: number;
    printing_colors: number;
    glue_cost: number;
    stitching_cost: number;
    labour_cost: number;
    transportation_cost: number;
    die_cost: number;
    other_cost: number;
    sub_total: number;
    overhead_percent: number;
    overhead_amount: number;
    sheet_cost: number;
    cost_per_box: number;
    wastage_amount: number;
  };
  pricing?: {
    cost: number;
    margin_percent: number;
    margin_amount: number;
    selling_price: number;
    profit_per_box: number;
  };
  totals?: {
    quantity: number;
    total_cost: number;
    total_amount: number;
    total_profit: number;
    total_weight: number;
  };
}

export default function BoxCalculationPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BoxCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      const user = localStorage.getItem('pms_user');
      if (!token || !user) {
        router.replace('/login');
      } else {
        setIsAuthenticated(true);
        setAuthChecking(false);
      }
    }
  }, [router]);

  // Form state - Box Dimensions
  const [length, setLength] = useState(300);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(150);

  // Configuration
  const [plyCount, setPlyCount] = useState(3);
  const [fluteType, setFluteType] = useState('B');
  const [boxType, setBoxType] = useState('RSC');
  const [ups, setUps] = useState(1);
  const [quantity, setQuantity] = useState(100);

  // Paper config
  const [topLiner, setTopLiner] = useState(150);
  const [topLinerBf, setTopLinerBf] = useState(18);
  const [fluting, setFluting] = useState(120);
  const [bottomLiner, setBottomLiner] = useState(150);
  const [bottomLinerBf, setBottomLinerBf] = useState(18);

  // 5 Ply additional
  const [middleLiner, setMiddleLiner] = useState(150);
  const [fluting1, setFluting1] = useState(120);
  const [fluting2, setFluting2] = useState(120);

  // Costing
  const [paperRate, setPaperRate] = useState(42);
  const [conversionCost, setConversionCost] = useState(2.5);
  const [marginPercent, setMarginPercent] = useState(15);
  const [wastagePercent, setWastagePercent] = useState(3);
  const [printingCost, setPrintingCost] = useState(0);
  const [printingColors, setPrintingColors] = useState(1);
  const [dieCost, setDieCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  const [glueCost, setGlueCost] = useState(0);
  const [stitchingCost, setStitchingCost] = useState(0);
  const [labourCost, setLabourCost] = useState(0);
  const [transportationCost, setTransportationCost] = useState(0);
  const [overheadPercent, setOverheadPercent] = useState(0);

  // UI State
  const [showAdvanced, setShowAdvanced] = useState(true);

  // Flute specifications
  const fluteSpecs: Record<string, { height: number; takeUp: number }> = {
    'A': { height: 4.8, takeUp: 1.56 },
    'B': { height: 2.5, takeUp: 1.42 },
    'C': { height: 3.6, takeUp: 1.48 },
    'E': { height: 1.5, takeUp: 1.27 },
    'F': { height: 0.8, takeUp: 1.25 },
  };

  // Local Calculate Function (No API needed)
  const handleCalculate = () => {
    setLoading(true);
    setError(null);

    try {
      // Get flute spec
      const flute = fluteSpecs[fluteType] || fluteSpecs['B'];
      const takeUp = flute.takeUp;
      const fluteHeight = flute.height;

      // Calculate Deckle and Cutting
      let deckle: number;
      let cutting: number;

      switch (boxType) {
        case 'RSC':
          deckle = length + width + 35; // joint allowance
          cutting = (2 * length) + (2 * width) + 12; // gaps
          break;
        case 'HSC':
          deckle = length + width + 35;
          cutting = (2 * length) + (2 * width) + height;
          break;
        case 'FOL':
          deckle = length + width + 55;
          cutting = (2 * length) + (2 * width) + (2 * width);
          break;
        case 'DIE_CUT':
          deckle = length + width + 50;
          cutting = (2 * length) + (2 * height) + 40;
          break;
        default:
          deckle = length + width + 35;
          cutting = (2 * length) + (2 * width) + 12;
      }

      // Sheet Area
      const sheetArea = (deckle * cutting) / 1000000; // sq.m
      const sheetAreaSqft = sheetArea * 10.764;

      // Board Thickness
      let boardThickness: number;
      if (plyCount === 3) {
        boardThickness = fluteHeight + 0.6; // 2 liners @ 0.3mm each
      } else if (plyCount === 5) {
        boardThickness = (2 * fluteHeight) + 0.9; // 3 liners
      } else {
        boardThickness = (3 * fluteHeight) + 1.2; // 4 liners
      }

      // Weight Calculation
      let breakdown: Array<{ layer: string; gsm: number; weight: number; take_up?: number }> = [];
      let totalLinerWeight = 0;
      let totalFlutingWeight = 0;

      if (plyCount === 3) {
        const topWeight = (topLiner * sheetArea) / 1000;
        const flutingWeight = (fluting * sheetArea * takeUp) / 1000;
        const bottomWeight = (bottomLiner * sheetArea) / 1000;

        breakdown = [
          { layer: 'Top Liner', gsm: topLiner, weight: Math.round(topWeight * 10000) / 10000 },
          { layer: 'Fluting', gsm: fluting, weight: Math.round(flutingWeight * 10000) / 10000, take_up: takeUp },
          { layer: 'Bottom Liner', gsm: bottomLiner, weight: Math.round(bottomWeight * 10000) / 10000 },
        ];

        totalLinerWeight = topWeight + bottomWeight;
        totalFlutingWeight = flutingWeight;
      } else if (plyCount === 5) {
        const topWeight = (topLiner * sheetArea) / 1000;
        const fluting1Weight = (fluting1 * sheetArea * takeUp) / 1000;
        const middleWeight = (middleLiner * sheetArea) / 1000;
        const fluting2Weight = (fluting2 * sheetArea * takeUp) / 1000;
        const bottomWeight = (bottomLiner * sheetArea) / 1000;

        breakdown = [
          { layer: 'Top Liner', gsm: topLiner, weight: Math.round(topWeight * 10000) / 10000 },
          { layer: 'Fluting 1', gsm: fluting1, weight: Math.round(fluting1Weight * 10000) / 10000, take_up: takeUp },
          { layer: 'Middle Liner', gsm: middleLiner, weight: Math.round(middleWeight * 10000) / 10000 },
          { layer: 'Fluting 2', gsm: fluting2, weight: Math.round(fluting2Weight * 10000) / 10000, take_up: takeUp },
          { layer: 'Bottom Liner', gsm: bottomLiner, weight: Math.round(bottomWeight * 10000) / 10000 },
        ];

        totalLinerWeight = topWeight + middleWeight + bottomWeight;
        totalFlutingWeight = fluting1Weight + fluting2Weight;
      } else {
        // 7 Ply (simplified)
        const topWeight = (topLiner * sheetArea) / 1000;
        const flutingWeight = (fluting * sheetArea * takeUp) / 1000;
        const bottomWeight = (bottomLiner * sheetArea) / 1000;

        breakdown = [
          { layer: 'Top Liner', gsm: topLiner, weight: Math.round(topWeight * 10000) / 10000 },
          { layer: 'Fluting (×3)', gsm: fluting, weight: Math.round(flutingWeight * 3 * 10000) / 10000, take_up: takeUp },
          { layer: 'Middle Liners (×2)', gsm: middleLiner, weight: Math.round((middleLiner * sheetArea / 1000) * 2 * 10000) / 10000 },
          { layer: 'Bottom Liner', gsm: bottomLiner, weight: Math.round(bottomWeight * 10000) / 10000 },
        ];

        totalLinerWeight = topWeight + bottomWeight + (middleLiner * sheetArea / 1000) * 2;
        totalFlutingWeight = flutingWeight * 3;
      }

      const totalPaperWeight = totalLinerWeight + totalFlutingWeight;
      const boxWeight = ups > 0 ? totalPaperWeight / ups : totalPaperWeight;

      // Strength Calculations
      const burstingStrength = ((topLiner * topLinerBf) + (bottomLiner * bottomLinerBf)) / 100;
      const ect = ((topLiner + bottomLiner) * 0.008) + (fluting * takeUp * 0.006);
      const perimeter = 2 * (length + width);
      const bct = 5.87 * ect * Math.sqrt(perimeter * boardThickness);
      const maxStackingLoad = bct * 0.6; // 60% safety factor

      // Cost Calculations
      const paperCostRaw = totalPaperWeight * paperRate;
      const wastageAmount = paperCostRaw * (wastagePercent / 100);
      const paperCostTotal = paperCostRaw + wastageAmount;
      const convCost = sheetArea * conversionCost;
      const totalPrintingCost = printingCost * printingColors;
      const subTotal = paperCostTotal + convCost + totalPrintingCost + glueCost + stitchingCost + labourCost + transportationCost + dieCost + otherCost;
      const overheadAmount = subTotal * (overheadPercent / 100);
      const sheetCost = subTotal + overheadAmount;
      const costPerBox = ups > 0 ? sheetCost / ups : sheetCost;

      // Pricing
      const marginAmount = costPerBox * (marginPercent / 100);
      const sellingPrice = Math.ceil((costPerBox + marginAmount) * 2) / 2; // Round to 0.5
      const profitPerBox = sellingPrice - costPerBox;

      // Totals
      const totalCost = costPerBox * quantity;
      const totalAmount = sellingPrice * quantity;
      const totalProfit = profitPerBox * quantity;
      const totalWeight = boxWeight * quantity;

      // Build result
      const calculationResult: BoxCalculationResult = {
        success: true,
        dimensions: {
          deckle_size: Math.round(deckle * 100) / 100,
          cutting_size: Math.round(cutting * 100) / 100,
          sheet_area_sqm: Math.round(sheetArea * 10000) / 10000,
          sheet_area_sqft: Math.round(sheetAreaSqft * 100) / 100,
          board_thickness: Math.round(boardThickness * 100) / 100,
          internal_dimensions: { length, width, height },
          external_dimensions: {
            length: Math.round((length + 2 * boardThickness) * 100) / 100,
            width: Math.round((width + 2 * boardThickness) * 100) / 100,
            height: Math.round((height + boardThickness) * 100) / 100,
          },
        },
        weight: {
          paper_weight_per_sheet: Math.round(totalPaperWeight * 10000) / 10000,
          box_weight: Math.round(boxWeight * 10000) / 10000,
          liner_weight: Math.round(totalLinerWeight * 10000) / 10000,
          fluting_weight: Math.round(totalFlutingWeight * 10000) / 10000,
          breakdown,
        },
        strength: {
          bursting_strength: Math.round(burstingStrength * 100) / 100,
          ect: Math.round(ect * 100) / 100,
          bct: Math.round(bct * 100) / 100,
          max_stacking_load: Math.round(maxStackingLoad * 100) / 100,
        },
        cost: {
          paper_cost: Math.round(paperCostTotal * 100) / 100,
          conversion_cost: Math.round(convCost * 100) / 100,
          printing_cost: Math.round(totalPrintingCost * 100) / 100,
          printing_colors: printingColors,
          glue_cost: Math.round(glueCost * 100) / 100,
          stitching_cost: Math.round(stitchingCost * 100) / 100,
          labour_cost: Math.round(labourCost * 100) / 100,
          transportation_cost: Math.round(transportationCost * 100) / 100,
          die_cost: Math.round(dieCost * 100) / 100,
          other_cost: Math.round(otherCost * 100) / 100,
          sub_total: Math.round(subTotal * 100) / 100,
          overhead_percent: overheadPercent,
          overhead_amount: Math.round(overheadAmount * 100) / 100,
          sheet_cost: Math.round(sheetCost * 100) / 100,
          cost_per_box: Math.round(costPerBox * 100) / 100,
          wastage_amount: Math.round(wastageAmount * 100) / 100,
        },
        pricing: {
          cost: Math.round(costPerBox * 100) / 100,
          margin_percent: marginPercent,
          margin_amount: Math.round(marginAmount * 100) / 100,
          selling_price: Math.round(sellingPrice * 100) / 100,
          profit_per_box: Math.round(profitPerBox * 100) / 100,
        },
        totals: {
          quantity,
          total_cost: Math.round(totalCost * 100) / 100,
          total_amount: Math.round(totalAmount * 100) / 100,
          total_profit: Math.round(totalProfit * 100) / 100,
          total_weight: Math.round(totalWeight * 100) / 100,
        },
      };

      setResult(calculationResult);
    } catch (err) {
      setError('Calculation error: ' + String(err));
    }

    setLoading(false);
  };

  // Reset form
  const handleReset = () => {
    setLength(300);
    setWidth(200);
    setHeight(150);
    setPlyCount(3);
    setFluteType('B');
    setBoxType('RSC');
    setUps(1);
    setQuantity(100);
    setTopLiner(150);
    setTopLinerBf(18);
    setFluting(120);
    setBottomLiner(150);
    setBottomLinerBf(18);
    setPaperRate(42);
    setConversionCost(2.5);
    setMarginPercent(15);
    setWastagePercent(3);
    setPrintingCost(0);
    setPrintingColors(1);
    setDieCost(0);
    setOtherCost(0);
    setGlueCost(0);
    setStitchingCost(0);
    setLabourCost(0);
    setTransportationCost(0);
    setOverheadPercent(0);
    setResult(null);
    setError(null);
  };

  // Copy result to clipboard
  const handleCopy = () => {
    if (!result) return;

    const text = `
📦 BOX CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 BOX DIMENSIONS
• Internal: ${length} × ${width} × ${height} mm (L×W×H)
• External: ${result.dimensions?.external_dimensions.length} × ${result.dimensions?.external_dimensions.width} × ${result.dimensions?.external_dimensions.height} mm
• Configuration: ${plyCount} Ply | ${fluteType} Flute | ${boxType}

📏 SHEET DIMENSIONS
• Deckle: ${result.dimensions?.deckle_size} mm
• Cutting: ${result.dimensions?.cutting_size} mm
• Sheet Area: ${result.dimensions?.sheet_area_sqm} m² (${result.dimensions?.sheet_area_sqft} sq.ft)
• Board Thickness: ${result.dimensions?.board_thickness} mm

⚖️ WEIGHT
• Paper/Sheet: ${result.weight?.paper_weight_per_sheet} kg
• Box Weight: ${result.weight?.box_weight} kg

💪 STRENGTH
• Bursting Strength: ${result.strength?.bursting_strength} kg/cm²
• ECT: ${result.strength?.ect} kN/m
• BCT: ${result.strength?.bct} N
• Max Stacking Load: ${result.strength?.max_stacking_load} N

💰 COSTING
• Paper Cost: ₹${result.cost?.paper_cost}
• Conversion: ₹${result.cost?.conversion_cost}
• Wastage: ₹${result.cost?.wastage_amount}
• Cost/Box: ₹${result.cost?.cost_per_box}

📈 PRICING
• Margin: ${result.pricing?.margin_percent}% (₹${result.pricing?.margin_amount})
• Selling Price: ₹${result.pricing?.selling_price}
• Profit/Box: ₹${result.pricing?.profit_per_box}

📊 ORDER SUMMARY (${quantity} pcs)
• Total Cost: ₹${result.totals?.total_cost}
• Total Amount: ₹${result.totals?.total_amount}
• Total Profit: ₹${result.totals?.total_profit}
• Total Weight: ${result.totals?.total_weight} kg
    `.trim();

    navigator.clipboard.writeText(text);
    (window as any).appAlert('Copied to clipboard! 📋');
  };

  if (authChecking || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <CalculatorIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Box Calculation</h1>
                <p className="text-sm text-gray-500">Calculate dimensions, weight, strength and costing</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                🔄 Reset
              </button>
              {result && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 text-sm font-medium shadow-md transition-all"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  Copy
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* INPUT SECTION */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Box Dimensions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                <h2 className="text-base font-semibold text-gray-800">Box Dimensions (mm)</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Length (L)</label>
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Width (W)</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (H)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  />
                </div>
              </div>
              <div className="mt-3 p-2 bg-indigo-50 rounded-xl text-center text-sm">
                <span className="text-gray-600">Size: </span>
                <span className="font-bold text-indigo-700">{length} × {width} × {height} mm</span>
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-bold mb-4">⚙️ Configuration</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Box Type</label>
                    <select
                      value={boxType}
                      onChange={(e) => setBoxType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    >
                      <option value="RSC">RSC - Regular Slotted</option>
                      <option value="HSC">HSC - Half Slotted</option>
                      <option value="FOL">FOL - Full Overlap</option>
                      <option value="DIE_CUT">Die Cut</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ply</label>
                    <select
                      value={plyCount}
                      onChange={(e) => setPlyCount(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    >
                      <option value={3}>3 Ply (Single Wall)</option>
                      <option value={5}>5 Ply (Double Wall)</option>
                      <option value={7}>7 Ply (Triple Wall)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flute Type</label>
                    <select
                      value={fluteType}
                      onChange={(e) => setFluteType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    >
                      <option value="A">A (4.8mm) - Heavy</option>
                      <option value="B">B (2.5mm) - Standard</option>
                      <option value="C">C (3.6mm) - General</option>
                      <option value="E">E (1.5mm) - Retail</option>
                      <option value="F">F (0.8mm) - Fine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPS</label>
                    <input
                      type="number"
                      value={ups}
                      onChange={(e) => setUps(Number(e.target.value))}
                      min={1}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min={1}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                  />
                </div>
              </div>
            </div>

            {/* Paper Configuration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-bold mb-4">📄 Paper (GSM & BF)</h2>
              <div className="space-y-3">
                {/* Top Liner */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Top Liner (GSM)</label>
                    <input
                      type="number"
                      value={topLiner}
                      onChange={(e) => setTopLiner(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BF</label>
                    <input
                      type="number"
                      value={topLinerBf}
                      onChange={(e) => setTopLinerBf(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                </div>

                {/* Fluting */}
                {plyCount === 3 ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fluting (GSM)</label>
                    <input
                      type="number"
                      value={fluting}
                      onChange={(e) => setFluting(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fluting 1</label>
                        <input
                          type="number"
                          value={fluting1}
                          onChange={(e) => setFluting1(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fluting 2</label>
                        <input
                          type="number"
                          value={fluting2}
                          onChange={(e) => setFluting2(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Middle Liner (GSM)</label>
                      <input
                        type="number"
                        value={middleLiner}
                        onChange={(e) => setMiddleLiner(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                      />
                    </div>
                  </>
                )}

                {/* Bottom Liner */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bottom Liner (GSM)</label>
                    <input
                      type="number"
                      value={bottomLiner}
                      onChange={(e) => setBottomLiner(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BF</label>
                    <input
                      type="number"
                      value={bottomLinerBf}
                      onChange={(e) => setBottomLinerBf(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Costing */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">💰 Costing</h2>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Rate (₹/kg)</label>
                    <input
                      type="number"
                      value={paperRate}
                      onChange={(e) => setPaperRate(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conv. (₹/sqm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={conversionCost}
                      onChange={(e) => setConversionCost(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Margin (%)</label>
                    <input
                      type="number"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wastage (%)</label>
                    <input
                      type="number"
                      value={wastagePercent}
                      onChange={(e) => setWastagePercent(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                    />
                  </div>
                </div>

                {showAdvanced && (
                  <div className="pt-3 border-t space-y-3">
                    {/* Printing */}
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">🖨️ Printing</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Per Color (₹)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={printingCost}
                          onChange={(e) => setPrintingCost(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No. of Colors</label>
                        <input
                          type="number"
                          min={0}
                          value={printingColors}
                          onChange={(e) => setPrintingColors(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                    </div>
                    {printingCost > 0 && printingColors > 0 && (
                      <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5 font-medium">
                        Total Printing = ₹{(printingCost * printingColors).toFixed(2)} &nbsp;({printingColors} color{printingColors > 1 ? 's' : ''} × ₹{printingCost})
                      </p>
                    )}

                    {/* Manufacturing */}
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide pt-1">🔧 Manufacturing</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Glue Cost (₹)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={glueCost}
                          onChange={(e) => setGlueCost(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stitching Cost (₹)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={stitchingCost}
                          onChange={(e) => setStitchingCost(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Labour Cost (₹)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={labourCost}
                          onChange={(e) => setLabourCost(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transportation (₹)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={transportationCost}
                          onChange={(e) => setTransportationCost(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                    </div>

                    {/* Other + Overhead */}
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wide pt-1">📋 Other & Overhead</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Die (₹)</label>
                        <input
                          type="number"
                          value={dieCost}
                          onChange={(e) => setDieCost(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other (₹)</label>
                        <input
                          type="number"
                          value={otherCost}
                          onChange={(e) => setOtherCost(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Overhead (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={overheadPercent}
                          onChange={(e) => setOverheadPercent(Number(e.target.value))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                        />
                      </div>
                    </div>
                    {overheadPercent > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 font-medium">
                        Overhead adds {overheadPercent}% on sub-total → auto-included in Cost/Box
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
            >
              <CalculatorIcon className="w-6 h-6" />
              {loading ? 'Calculating...' : 'CALCULATE'}
            </button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700">
                <strong>❌ Error:</strong> {error}
              </div>
            )}
          </div>

          {/* RESULTS SECTION */}
          <div className="lg:col-span-2">
            {result && result.success ? (
              <div className="space-y-4">
                {/* Quick Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-sm opacity-80">Sheet Area</p>
                    <p className="text-2xl font-bold">{result.dimensions?.sheet_area_sqm}</p>
                    <p className="text-xs opacity-70">sq.m</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-sm opacity-80">Box Weight</p>
                    <p className="text-2xl font-bold">{result.weight?.box_weight}</p>
                    <p className="text-xs opacity-70">kg</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-sm opacity-80">Cost/Box</p>
                    <p className="text-2xl font-bold">₹{result.cost?.cost_per_box}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-sm opacity-80">Selling Price</p>
                    <p className="text-2xl font-bold">₹{result.pricing?.selling_price}</p>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                  <h3 className="text-lg font-bold mb-4">📊 ORDER SUMMARY</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm opacity-80">Quantity</p>
                      <p className="text-xl font-bold">{result.totals?.quantity} pcs</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Total Weight</p>
                      <p className="text-xl font-bold">{result.totals?.total_weight} kg</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Total Cost</p>
                      <p className="text-xl font-bold">₹{result.totals?.total_cost}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Total Amount</p>
                      <p className="text-xl font-bold">₹{result.totals?.total_amount}</p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">Total Profit</p>
                      <p className="text-xl font-bold text-green-300">₹{result.totals?.total_profit}</p>
                    </div>
                  </div>
                </div>

                {/* Sheet Dimensions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CubeIcon className="w-6 h-6 text-blue-500" />
                    Sheet Dimensions
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-500">Deckle Size</p>
                      <p className="text-xl font-bold text-blue-700">{result.dimensions?.deckle_size} mm</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-500">Cutting Size</p>
                      <p className="text-xl font-bold text-blue-700">{result.dimensions?.cutting_size} mm</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-500">Area (sq.m)</p>
                      <p className="text-xl font-bold text-green-700">{result.dimensions?.sheet_area_sqm}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-500">Area (sq.ft)</p>
                      <p className="text-xl font-bold text-green-700">{result.dimensions?.sheet_area_sqft}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Board Thickness: </span>
                      <span className="font-bold">{result.dimensions?.board_thickness} mm</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Internal: </span>
                      <span className="font-bold">
                        {result.dimensions?.internal_dimensions.length} × 
                        {result.dimensions?.internal_dimensions.width} × 
                        {result.dimensions?.internal_dimensions.height} mm
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">External: </span>
                      <span className="font-bold">
                        {result.dimensions?.external_dimensions.length} × 
                        {result.dimensions?.external_dimensions.width} × 
                        {result.dimensions?.external_dimensions.height} mm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weight Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ScaleIcon className="w-6 h-6 text-green-500" />
                    Weight Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b-2">
                          <th className="pb-2">Layer</th>
                          <th className="pb-2 text-right">GSM</th>
                          <th className="pb-2 text-right">Take-up</th>
                          <th className="pb-2 text-right">Weight (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.weight?.breakdown.map((layer, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-2 font-medium">{layer.layer}</td>
                            <td className="py-2 text-right">{layer.gsm}</td>
                            <td className="py-2 text-right">{layer.take_up?.toFixed(2) || '-'}</td>
                            <td className="py-2 text-right font-bold">{layer.weight}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td className="py-2">Total per Sheet</td>
                          <td colSpan={2}></td>
                          <td className="py-2 text-right">{result.weight?.paper_weight_per_sheet} kg</td>
                        </tr>
                        <tr className="bg-green-100 font-bold text-green-700">
                          <td className="py-2">Weight per Box</td>
                          <td colSpan={2}></td>
                          <td className="py-2 text-right text-lg">{result.weight?.box_weight} kg</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Strength */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold mb-4">💪 Strength Parameters</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-sm text-gray-500">Bursting Strength</p>
                      <p className="text-2xl font-bold text-purple-700">{result.strength?.bursting_strength}</p>
                      <p className="text-xs text-gray-400">kg/cm²</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-sm text-gray-500">ECT</p>
                      <p className="text-2xl font-bold text-purple-700">{result.strength?.ect}</p>
                      <p className="text-xs text-gray-400">kN/m</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-sm text-gray-500">BCT</p>
                      <p className="text-2xl font-bold text-purple-700">{result.strength?.bct}</p>
                      <p className="text-xs text-gray-400">N</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <p className="text-sm text-gray-500">Max Load</p>
                      <p className="text-2xl font-bold text-green-700">{result.strength?.max_stacking_load}</p>
                      <p className="text-xs text-gray-400">N (60% safety)</p>
                    </div>
                  </div>
                </div>

                {/* Cost & Pricing */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CurrencyRupeeIcon className="w-6 h-6 text-orange-500" />
                    Cost & Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cost */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700">Cost Breakdown</h4>
                      <table className="w-full">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2">Paper Cost</td>
                            <td className="py-2 text-right font-medium">₹{result.cost?.paper_cost}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 text-red-500">Wastage ({wastagePercent}%)</td>
                            <td className="py-2 text-right font-medium text-red-500">₹{result.cost?.wastage_amount}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2">Conversion</td>
                            <td className="py-2 text-right font-medium">₹{result.cost?.conversion_cost}</td>
                          </tr>
                          {(result.cost?.printing_cost || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2">Printing ({result.cost?.printing_colors} color{(result.cost?.printing_colors || 1) > 1 ? 's' : ''})</td>
                              <td className="py-2 text-right font-medium">₹{result.cost?.printing_cost}</td>
                            </tr>
                          )}
                          {(result.cost?.glue_cost || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2">Glue</td>
                              <td className="py-2 text-right font-medium">₹{result.cost?.glue_cost}</td>
                            </tr>
                          )}
                          {(result.cost?.stitching_cost || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2">Stitching</td>
                              <td className="py-2 text-right font-medium">₹{result.cost?.stitching_cost}</td>
                            </tr>
                          )}
                          {(result.cost?.labour_cost || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2">Labour</td>
                              <td className="py-2 text-right font-medium">₹{result.cost?.labour_cost}</td>
                            </tr>
                          )}
                          {(result.cost?.transportation_cost || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2">Transportation</td>
                              <td className="py-2 text-right font-medium">₹{result.cost?.transportation_cost}</td>
                            </tr>
                          )}
                          {(result.cost?.die_cost || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2">Die Cost</td>
                              <td className="py-2 text-right font-medium">₹{result.cost?.die_cost}</td>
                            </tr>
                          )}
                          {(result.cost?.other_cost || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2">Other</td>
                              <td className="py-2 text-right font-medium">₹{result.cost?.other_cost}</td>
                            </tr>
                          )}
                          <tr className="border-b bg-gray-50">
                            <td className="py-2 font-semibold text-gray-600">Sub Total</td>
                            <td className="py-2 text-right font-semibold">₹{result.cost?.sub_total}</td>
                          </tr>
                          {(result.cost?.overhead_percent || 0) > 0 && (
                            <tr className="border-b">
                              <td className="py-2 text-amber-700">Overhead ({result.cost?.overhead_percent}%)</td>
                              <td className="py-2 text-right font-medium text-amber-700">+₹{result.cost?.overhead_amount}</td>
                            </tr>
                          )}
                          <tr className="bg-orange-50 font-bold">
                            <td className="py-2">Sheet Cost</td>
                            <td className="py-2 text-right">₹{result.cost?.sheet_cost}</td>
                          </tr>
                          <tr className="bg-orange-100 font-bold text-orange-700">
                            <td className="py-3 text-lg">Cost per Box</td>
                            <td className="py-3 text-right text-xl">₹{result.cost?.cost_per_box}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pricing */}
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-700">Pricing</h4>
                      <table className="w-full">
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2">Cost per Box</td>
                            <td className="py-2 text-right font-medium">₹{result.pricing?.cost}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2">Margin ({result.pricing?.margin_percent}%)</td>
                            <td className="py-2 text-right font-medium text-green-600">+₹{result.pricing?.margin_amount}</td>
                          </tr>
                          <tr className="bg-purple-100 font-bold text-purple-700">
                            <td className="py-3 text-lg">Selling Price</td>
                            <td className="py-3 text-right text-2xl">₹{result.pricing?.selling_price}</td>
                          </tr>
                          <tr className="bg-green-50">
                            <td className="py-2">Profit per Box</td>
                            <td className="py-2 text-right font-bold text-green-600">₹{result.pricing?.profit_per_box}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Rate Info */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rate per kg:</span>
                          <span className="font-bold">
                            ₹{((result.pricing?.selling_price || 0) / (result.weight?.box_weight || 1)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-gray-500">Rate per sq.ft:</span>
                          <span className="font-bold">
                            ₹{((result.pricing?.selling_price || 0) / (result.dimensions?.sheet_area_sqft || 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formula Reference */}
                <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
                  <h4 className="font-bold mb-2">📝 Formula Reference</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>• Deckle = L + W + 35mm (joint)</div>
                    <div>• Cutting = 2L + 2W + gaps</div>
                    <div>• Paper Weight = GSM × Area × Take-up / 1000</div>
                    <div>• BCT = 5.87 × ECT × √(Perimeter × Thickness)</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <CubeIcon className="w-32 h-32 text-gray-200 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-600 mb-2">Enter Box Dimensions</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Fill in the box dimensions and configuration on the left, then click CALCULATE to see detailed results.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 max-w-lg mx-auto">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    📐 Sheet Size
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    ⚖️ Weight
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    💪 Strength
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    💰 Costing
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
