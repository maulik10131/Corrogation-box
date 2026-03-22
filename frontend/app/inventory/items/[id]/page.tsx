import Link from 'next/link';
import {
  ArrowLeftIcon,
  CubeIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
} from '@heroicons/react/24/outline';

interface ItemDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className="rounded-lg p-2 hover:bg-gray-200">
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Item Details</h1>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inventory Item ID</p>
              <p className="text-lg font-semibold text-gray-900">#{id}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            This item detail route is now active. You can connect this page to API data for full item information.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/inventory/stock-in?item=${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <ArrowDownCircleIcon className="h-5 w-5" />
              Stock In
            </Link>
            <Link
              href={`/inventory/stock-out?item=${id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <ArrowUpCircleIcon className="h-5 w-5" />
              Stock Out
            </Link>
            <Link
              href="/inventory/items"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Items
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
