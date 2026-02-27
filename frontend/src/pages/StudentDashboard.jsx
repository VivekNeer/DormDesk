import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/axios';
import ComplaintForm from '../components/ComplaintForm';
import ComplaintCard from '../components/ComplaintCard';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  async function fetchMyComplaints() {
    setLoading(true);
    try {
      const res = await api.get('/complaints/mine');
      setComplaints(res.data.complaints);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your complaints.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">DormDesk</h1>
            <p className="text-xs text-gray-400">Student Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name || user?.email}
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column: Submit complaint */}
          <div className="lg:col-span-1">
            <ComplaintForm onComplaintSubmitted={fetchMyComplaints} />
          </div>

          {/* Right column: My complaints */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              My Complaints
              {complaints.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({complaints.length})
                </span>
              )}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <p className="text-gray-400 text-lg">No complaints yet.</p>
                <p className="text-gray-400 text-sm mt-1">Submit one using the form on the left.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {complaints.map((complaint) => (
                  <ComplaintCard key={complaint.id} complaint={complaint} showHistory={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
