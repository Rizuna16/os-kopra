import { useEffect, useState } from "react";
import { useBusiness } from "../business/BusinessContext";
import { listMembers, addMember, updateMemberRole, removeMember } from "../roles/roleService";
import type { Member } from "../roles/types";
import { ApiError } from "../auth/types";

export function RolePermissionList() {
  const { currentBusinessId } = useBusiness();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Member Form state
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "KASIR">("ADMIN");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const loadData = async (businessId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMembers(businessId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to load members";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentBusinessId) {
      setMembers([]);
      return;
    }
    loadData(currentBusinessId);
  }, [currentBusinessId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !newUserId.trim()) return;
    setAddError(null);
    setAdding(true);
    try {
      const added = await addMember(currentBusinessId, {
        user_id: newUserId.trim(),
        role: newRole,
      });
      setMembers((prev) => [...(Array.isArray(prev) ? prev : []), added]);
      setNewUserId("");
      setNewRole("ADMIN");
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to add member";
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (userId: string, role: "ADMIN" | "KASIR") => {
    if (!currentBusinessId) return;
    try {
      const updated = await updateMemberRole(currentBusinessId, userId, role);
      setMembers((prev) =>
        (Array.isArray(prev) ? prev : []).map((m) => (m.user.id === userId ? updated : m))
      );
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to update member role";
      alert(msg);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentBusinessId) return;
    try {
      await removeMember(currentBusinessId, userId);
      setMembers((prev) => (Array.isArray(prev) ? prev : []).filter((m) => m.user.id !== userId));
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : "Failed to remove member";
      alert(msg);
    }
  };

  const handleRetry = () => {
    if (currentBusinessId) {
      loadData(currentBusinessId);
    }
  };

  const safeMembers = Array.isArray(members) ? members : [];

  return (
    <div data-testid="role-permission-page" className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Peran & Izin Akses
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Kelola anggota tim Anda dan lihat matriks hak akses sistem di bawah ini.
          </p>
        </div>

        {/* Member List Section */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-lg font-medium leading-6 text-gray-900">
              Anggota Tim
            </h2>
          </div>

          <div className="p-6">
            {loading ? (
              <div data-testid="member-list-loading" className="flex items-center justify-center py-6 text-sm text-gray-500">
                Memuat data anggota...
              </div>
            ) : error ? (
              <div className="py-6 flex flex-col items-center">
                <div data-testid="member-list-error" className="text-sm text-red-600 mb-4">
                  {error}
                </div>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <div data-testid="member-list">
                {safeMembers.length === 0 ? (
                  <div data-testid="member-list-empty" className="text-center py-6 text-sm text-gray-500">
                    Belum ada anggota tim terdaftar.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {safeMembers.map((member) => (
                      <li
                        key={member.id}
                        data-testid={`member-item-${member.user.id}`}
                        className="py-4 flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {member.user?.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {member.user?.first_name || member.user?.last_name
                              ? `${member.user?.first_name} ${member.user?.last_name}`
                              : "-"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          {/* Role Badge */}
                          <span
                            data-testid={`member-role-${member.role}`}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.role === "ADMIN"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {member.role}
                          </span>

                          {/* Role Select Selector */}
                          <select
                            data-testid={`member-role-select-${member.user.id}`}
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member.user.id, e.target.value as "ADMIN" | "KASIR")
                            }
                            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="KASIR">KASIR</option>
                          </select>

                          {/* Remove Member Button */}
                          <button
                            data-testid={`member-remove-btn-${member.user.id}`}
                            onClick={() => handleRemoveMember(member.user.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none"
                          >
                            Hapus
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Member Form Section */}
        <div className="bg-white shadow sm:rounded-lg border border-gray-200">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium leading-6 text-gray-900">
              Tambah Anggota Baru
            </h2>
          </div>
          <form data-testid="member-add-form" onSubmit={handleAddMember} className="p-6 space-y-4">
            {addError && (
              <div data-testid="member-add-error" className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
                {addError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">
                  User ID / UUID Pengguna
                </label>
                <input
                  type="text"
                  data-testid="member-user-id-input"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Masukkan UUID pengguna"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Peran (Role)
                </label>
                <select
                  data-testid="member-role-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "ADMIN" | "KASIR")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="KASIR">KASIR</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                data-testid="member-add-submit"
                disabled={adding}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {adding ? "Menambahkan..." : "Tambah Anggota"}
              </button>
            </div>
          </form>
        </div>

        {/* Read-Only Permission Matrix */}
        <div className="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium leading-6 text-gray-900">
              Matriks Izin Akses Peran (Read-Only)
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Menampilkan deskripsi hak akses sistem untuk peran ADMIN dan KASIR.
            </p>
          </div>
          <div className="p-6 overflow-x-auto">
            <table data-testid="permission-matrix-table" className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modul / Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Izin ADMIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Izin KASIR
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr data-testid="permission-matrix-row-ADMIN">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ADMIN
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700 font-semibold">
                    Akses Operasional Penuh (Product, Inventory, Sales, Purchasing, Customer, Supplier, Employee, Location, dll)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                </tr>
                <tr data-testid="permission-matrix-row-KASIR">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    KASIR
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 font-semibold">
                    Transaksi & Pelanggan Saja (Sales, Customer Create/View, Inventory View, Shifts)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}