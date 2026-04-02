'use client';

import { useState, useEffect } from 'react';
import { FileText, DollarSign, ShoppingCart, Upload, Loader2, Trash2, Edit3, Save } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface AdminDoc {
  id: string;
  title: string;
  slug: string;
  price: number;
  active: boolean;
  featured: boolean;
  category: { name: string } | null;
  brand: { name: string } | null;
  download_count: number;
}

interface AdminOrder {
  id: string;
  customer_email: string;
  amount: number;
  created_at: string;
  downloaded_at: string | null;
  document: { title: string } | null;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [secret, setSecret] = useState('');
  const [activeTab, setActiveTab] = useState<'docs' | 'orders' | 'upload'>('docs');
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalDocs: 0, totalOrders: 0, totalRevenue: 0 });

  async function handleAuth() {
    if (!secret.trim()) return;
    const res = await fetch('/api/admin/documents', {
      headers: { 'x-admin-secret': secret.trim() },
    });
    if (res.ok) {
      localStorage.setItem('admin_secret', secret.trim());
      setAuthenticated(true);
      loadData();
    } else {
      alert('Invalid admin secret');
    }
  }

  async function loadData() {
    const adminSecret = localStorage.getItem('admin_secret') || secret;
    setLoading(true);

    const [docsRes, ordersRes] = await Promise.all([
      fetch('/api/admin/documents', { headers: { 'x-admin-secret': adminSecret } }),
      fetch('/api/admin/orders', { headers: { 'x-admin-secret': adminSecret } }),
    ]);

    if (docsRes.ok) {
      const d = await docsRes.json();
      setDocs(d.documents || []);
      setStats(prev => ({ ...prev, totalDocs: d.documents?.length || 0 }));
    }
    if (ordersRes.ok) {
      const o = await ordersRes.json();
      setOrders(o.orders || []);
      const revenue = (o.orders || []).reduce((sum: number, ord: any) => sum + ord.amount, 0);
      setStats(prev => ({ ...prev, totalOrders: o.orders?.length || 0, totalRevenue: revenue }));
    }

    setLoading(false);
  }

  useEffect(() => {
    const saved = localStorage.getItem('admin_secret');
    if (saved) {
      setSecret(saved);
      setAuthenticated(true);
      setTimeout(loadData, 100);
    }
  }, []);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl border border-gray-200 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4">Admin Access</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            placeholder="Enter admin secret"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          />
          <button
            onClick={handleAuth}
            className="w-full bg-emerald-700 text-white py-2 rounded-lg font-medium hover:bg-emerald-800"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <FileText className="h-10 w-10 text-emerald-700" />
          <div>
            <p className="text-2xl font-bold">{stats.totalDocs}</p>
            <p className="text-sm text-gray-500">Documents</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <ShoppingCart className="h-10 w-10 text-green-600" />
          <div>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
            <p className="text-sm text-gray-500">Orders</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <DollarSign className="h-10 w-10 text-amber-600" />
          <div>
            <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
            <p className="text-sm text-gray-500">Revenue</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {(['docs', 'orders', 'upload'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'docs' ? 'Documents' : tab === 'orders' ? 'Orders' : 'Upload'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : activeTab === 'docs' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Brand</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Active</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Featured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{doc.title}</td>
                  <td className="px-4 py-3 text-gray-500">{doc.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{doc.brand?.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-900 text-right">{formatPrice(doc.price)}</td>
                  <td className="px-4 py-3 text-center">{doc.active ? '✓' : '✗'}</td>
                  <td className="px-4 py-3 text-center">{doc.featured ? '★' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'orders' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Document</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Downloaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{order.customer_email}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {order.document?.title || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 text-right">{formatPrice(order.amount)}</td>
                  <td className="px-4 py-3 text-center">{order.downloaded_at ? '✓' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
          <p className="text-gray-500 mb-4">
            Use the import script to bulk upload documents from your local drive.
          </p>
          <code className="bg-gray-100 px-4 py-2 rounded text-sm">
            npm run import-docs
          </code>
        </div>
      )}
    </div>
  );
}
