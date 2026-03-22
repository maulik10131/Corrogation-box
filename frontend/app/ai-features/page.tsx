'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  BellAlertIcon,
  ShieldExclamationIcon,
  CpuChipIcon,
  DocumentCheckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const forecastData = [
  { month: 'Mar', forecast: 320, lower: 290, upper: 350 },
  { month: 'Apr', forecast: 345, lower: 310, upper: 380 },
  { month: 'May', forecast: 390, lower: 350, upper: 430 },
  { month: 'Jun', forecast: 420, lower: 375, upper: 465 },
  { month: 'Jul', forecast: 410, lower: 365, upper: 455 },
  { month: 'Aug', forecast: 460, lower: 410, upper: 510 },
];

const historicalDemand = [
  { month: 'Sep 25', orders: 280 },
  { month: 'Oct 25', orders: 310 },
  { month: 'Nov 25', orders: 295 },
  { month: 'Dec 25', orders: 340 },
  { month: 'Jan 26', orders: 360 },
  { month: 'Feb 26', orders: 375 },
];

const paperRateHistory = [
  { week: 'W1', kraft: 52, duplex: 48 },
  { week: 'W2', kraft: 53, duplex: 49 },
  { week: 'W3', kraft: 55, duplex: 50 },
  { week: 'W4', kraft: 58, duplex: 52 },
  { week: 'W5', kraft: 61, duplex: 54 },
  { week: 'W6', kraft: 65, duplex: 57 },
];

const smartQuoteSuggestions = [
  {
    id: 1,
    customer: 'Mehta Packaging Ltd',
    product: '3-Ply RSC Box 12x10x8',
    suggestedRate: 42.5,
    currentMarket: 44.0,
    confidence: 91,
    urgency: 'high',
    reason: 'Customer last ordered 45 days ago. Paper rates +12%. Lock in now.',
  },
  {
    id: 2,
    customer: 'Shah Industries',
    product: '5-Ply Box 18x14x12',
    suggestedRate: 68.0,
    currentMarket: 70.5,
    confidence: 85,
    urgency: 'medium',
    reason: 'Bulk order opportunity. Competitor pricing gap detected.',
  },
  {
    id: 3,
    customer: 'Patel Exports',
    product: 'Die-Cut Box 9x7x5',
    suggestedRate: 28.0,
    currentMarket: 28.5,
    confidence: 78,
    urgency: 'low',
    reason: 'Standard reorder cycle. Marginal rate adjustment recommended.',
  },
];

const profitRiskAlerts = [
  {
    id: 1,
    order: 'WO-2024-089',
    customer: 'Joshi Traders',
    risk: 'critical',
    margin: -3.2,
    issue: 'Paper cost exceeded quoted rate by 18%',
    action: 'Renegotiate or absorb loss of Rs.4,200',
  },
  {
    id: 2,
    order: 'WO-2024-091',
    customer: 'Desai Corp',
    risk: 'warning',
    margin: 4.1,
    issue: 'Margin below 5% threshold due to overtime labor',
    action: 'Review production schedule to reduce overtime',
  },
  {
    id: 3,
    order: 'WO-2024-094',
    customer: 'Kumar Packaging',
    risk: 'safe',
    margin: 18.5,
    issue: 'All within parameters',
    action: 'No action required',
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabKey = 'quote' | 'paper' | 'profit' | 'demand';

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AIFeaturesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('quote' as TabKey);

  useEffect(() => {
    const token = localStorage.getItem('pms_token');
    if (!token) router.push('/login');
  }, [router]);

  const kpiCards = [
    {
      label: 'Quote Suggestions',
      value: '3',
      sub: 'Ready to send',
      icon: LightBulbIcon,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      label: 'Rate Alerts',
      value: '2',
      sub: 'Paper prices rising',
      icon: BellAlertIcon,
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    },
    {
      label: 'Profit Risks',
      value: '1',
      sub: 'Critical order',
      icon: ShieldExclamationIcon,
      gradient: 'bg-gradient-to-br from-rose-500 to-red-600',
    },
    {
      label: 'Forecast Accuracy',
      value: '87%',
      sub: 'Next 6 months',
      icon: ArrowTrendingUpIcon,
      gradient: 'bg-gradient-to-br from-emerald-500 to-green-600',
    },
  ];

  const tabs: { key: TabKey; label: string; icon: typeof SparklesIcon }[] = [
    { key: 'quote',  label: 'Smart Quote Suggestion', icon: LightBulbIcon },
    { key: 'paper',  label: 'Paper Rate Alert',        icon: BellAlertIcon },
    { key: 'profit', label: 'Profit Risk Alert',       icon: ShieldExclamationIcon },
    { key: 'demand', label: 'Demand Forecasting',      icon: ArrowTrendingUpIcon },
  ];

  function renderQuoteTab() {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            AI analyzed order history, paper cost trends and market pricing to generate these quote recommendations.
          </p>
        </div>

        {smartQuoteSuggestions.map((s) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{s.customer}</h3>
                <p className="text-sm text-gray-500">{s.product}</p>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  s.urgency === 'high'
                    ? 'bg-red-100 text-red-700'
                    : s.urgency === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {s.urgency.toUpperCase()} URGENCY
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">AI Suggested Rate</p>
                <p className="text-lg font-bold text-blue-700">Rs.{s.suggestedRate}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Current Market</p>
                <p className="text-lg font-bold text-gray-700">Rs.{s.currentMarket}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">AI Confidence</p>
                <p className="text-lg font-bold text-green-700">{s.confidence}%</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
              <span className="font-medium">Why:</span> {s.reason}
            </p>
          </div>
        ))}
      </div>
    );
  }

  function renderPaperTab() {
    return (
      <div className="space-y-5">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-800">
            Kraft paper rates have risen <strong>25% in the last 6 weeks</strong>. Review all open quotations to protect margins.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Kraft Paper',       rate: 'Rs.65/kg', change: '+25%', up: true },
            { label: 'Duplex Board',      rate: 'Rs.57/kg', change: '+18%', up: true },
            { label: 'Corrugated Medium', rate: 'Rs.44/kg', change: '-2%',  up: false },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-1">{item.label}</p>
              <p className="text-xl font-bold text-gray-900">{item.rate}</p>
              <span className={`inline-flex items-center gap-1 text-sm font-medium mt-1 ${item.up ? 'text-red-600' : 'text-green-600'}`}>
                {item.up ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                {item.change} this month
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Rate Trend (6 Weeks)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={paperRateHistory}>
              <defs>
                <linearGradient id="kraftGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="duplexGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="kraft"  name="Kraft (Rs./kg)"  stroke="#f97316" fill="url(#kraftGrad)"  strokeWidth={2} />
              <Area type="monotone" dataKey="duplex" name="Duplex (Rs./kg)" stroke="#3b82f6" fill="url(#duplexGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Upcoming Threshold Alerts</h3>
          <div className="space-y-2">
            {[
              { label: 'Kraft crosses Rs.70/kg',  eta: '~2 weeks', level: 'warning' },
              { label: 'Duplex crosses Rs.60/kg', eta: '~4 weeks', level: 'info' },
            ].map((alert) => (
              <div
                key={alert.label}
                className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                  alert.level === 'warning' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <span className={`text-sm font-medium ${alert.level === 'warning' ? 'text-red-700' : 'text-blue-700'}`}>
                  {alert.label}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" /> {alert.eta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderProfitTab() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Critical Orders', value: '1', color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'At-Risk Orders',  value: '1', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { label: 'Healthy Orders',  value: '1', color: 'bg-green-50 border-green-200 text-green-700' },
          ].map((s) => (
            <div key={s.label} className={`border rounded-xl p-4 text-center ${s.color}`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {profitRiskAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`bg-white border rounded-xl p-5 shadow-sm ${
              alert.risk === 'critical'
                ? 'border-l-4 border-l-red-500'
                : alert.risk === 'warning'
                ? 'border-l-4 border-l-yellow-500'
                : 'border-l-4 border-l-green-500'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-mono text-gray-400">{alert.order}</span>
                <h3 className="font-semibold text-gray-900">{alert.customer}</h3>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    alert.risk === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : alert.risk === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {alert.risk.toUpperCase()}
                </span>
                <p
                  className={`text-lg font-bold mt-1 ${
                    alert.margin < 0 ? 'text-red-600' : alert.margin < 5 ? 'text-yellow-600' : 'text-green-600'
                  }`}
                >
                  {alert.margin > 0 ? '+' : ''}{alert.margin}% margin
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{alert.issue}</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <CheckCircleIcon className="h-4 w-4 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-700">{alert.action}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderDemandTab() {
    return (
      <div className="space-y-5">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <SparklesIcon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">
            AI forecast based on 18 months of historical orders, seasonal patterns and customer growth trends.
            Prediction accuracy: <strong>87%</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Historical Demand (units/month)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={historicalDemand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">AI Demand Forecast (next 6 months)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="upper"    name="Upper Band" stroke="#bbf7d0" fill="none" strokeDasharray="4 4" strokeWidth={1} />
                <Area type="monotone" dataKey="forecast" name="Forecast"   stroke="#22c55e" fill="url(#forecastGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="lower"    name="Lower Band" stroke="#bbf7d0" fill="none" strokeDasharray="4 4" strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Recommended Actions</h3>
          <div className="space-y-3">
            {[
              {
                icon: DocumentCheckIcon,
                color: 'text-blue-600 bg-blue-50',
                title: 'Pre-book Kraft Paper',
                desc: 'Demand expected to peak in May-Jun. Pre-book 15 MT at current rates.',
              },
              {
                icon: ChartBarIcon,
                color: 'text-purple-600 bg-purple-50',
                title: 'Increase Production Capacity',
                desc: 'Hire 2 additional operators for the Aug surge (+21% vs Jul).',
              },
              {
                icon: BellAlertIcon,
                color: 'text-orange-600 bg-orange-50',
                title: 'Alert Key Customers',
                desc: 'Notify top 5 customers of upcoming lead time increase in Jun-Jul.',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className={`p-2 rounded-lg ${item.color.split(' ')[1]}`}>
                  <item.icon className={`h-4 w-4 ${item.color.split(' ')[0]}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <CpuChipIcon className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Smart AI Features</h1>
          <span className="ml-2 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
            FUTURE VISION
          </span>
        </div>
        <p className="text-sm text-gray-500 ml-10">
          AI-powered insights to help you price smarter, react faster and plan better.
        </p>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {kpiCards.map((card) => (
            <div key={card.label} className={`${card.gradient} rounded-2xl p-5 text-white shadow-md`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-80">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs opacity-70 mt-0.5">{card.sub}</p>
                </div>
                <card.icon className="w-10 h-10 opacity-30" />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'quote'  && renderQuoteTab()}
            {activeTab === 'paper'  && renderPaperTab()}
            {activeTab === 'profit' && renderProfitTab()}
            {activeTab === 'demand' && renderDemandTab()}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5" />
          All insights are AI-generated based on your business data. Human review recommended before action.
        </p>
      </div>
    </div>
  );
}

