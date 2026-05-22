"use client";

import { useState, useEffect } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ShieldAlert, Users, Database, AlertTriangle, Trash2, ShieldCheck, Loader2 } from "lucide-react";

export default function AdminPage() {
  const { getToken } = useAuth();
  
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8787";

  const fetchAdminData = async () => {
    try {
      const token = await getToken();
      
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${apiUrl}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        if (statsRes.status === 403) throw new Error("Forbidden: You are not an admin.");
        throw new Error("Failed to fetch admin data.");
      }

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [getToken, apiUrl]);

  const handleBanUser = async (targetUserId: string) => {
    if (!confirm("Are you sure? This will BAN the user and permanently DELETE all their files.")) return;
    
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/admin/ban`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ targetUserId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(data.message);
      fetchAdminData(); // Refresh list
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return <div className="h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>;
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-950 text-white flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-6">{error}</p>
        <Link href="/dashboard" className="px-6 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-red-400">
            <ShieldCheck className="w-6 h-6" /> Admin Panel
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors mr-2">Dashboard</Link>
            <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 flex flex-col gap-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 text-gray-400 mb-2"><Users className="w-5 h-5"/> Total Users</div>
            <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 text-gray-400 mb-2"><Database className="w-5 h-5"/> Total Images</div>
            <div className="text-3xl font-bold">{stats?.total_images || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-3 text-gray-400 mb-2"><Database className="w-5 h-5"/> Storage Used</div>
            <div className="text-3xl font-bold">{((stats?.total_bytes || 0) / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <div className="bg-gray-900 border border-red-900/50 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
            <div className="flex items-center gap-3 text-red-400 mb-2"><AlertTriangle className="w-5 h-5"/> Reported</div>
            <div className="text-3xl font-bold text-red-300">{stats?.reported_images || 0}</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">User Directory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-950/50 text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">User ID</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Images</th>
                  <th className="px-6 py-3 font-medium">Storage</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map(u => (
                  <tr key={u.clerk_user_id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{u.clerk_user_id} {u.is_banned ? <span className="ml-2 text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded">BANNED</span> : null}</td>
                    <td className="px-6 py-4">{u.role}</td>
                    <td className="px-6 py-4">{u.image_count || 0}</td>
                    <td className="px-6 py-4">{((u.total_bytes || 0) / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="px-6 py-4 text-right">
                      {!u.is_banned && u.role !== 'admin' && (
                        <button 
                          onClick={() => handleBanUser(u.clerk_user_id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded flex items-center gap-2 inline-flex"
                        >
                          <Trash2 className="w-4 h-4"/> Ban & Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
