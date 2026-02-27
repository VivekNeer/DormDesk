import { useAuth } from '../auth/AuthContext';
import AdminComplaintList from '../components/AdminComplaintList';

export default function CategoryAdminDashboard() {
  const { user, logout, adminCategory } = useAuth();

  const categoryLabel = adminCategory
    ? adminCategory.charAt(0).toUpperCase() + adminCategory.slice(1)
    : 'Category';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">DormDesk</h1>
            <p className="text-xs text-gray-400">{categoryLabel} Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name || user?.email}
            </span>
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full capitalize">
              {categoryLabel} Admin
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">
          {categoryLabel} Complaints
        </h2>
        <AdminComplaintList fixedCategory={adminCategory} />
      </main>
    </div>
  );
}
