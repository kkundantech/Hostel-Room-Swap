import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  UserCheck,
  Search,
  Filter,
  User,
  Building,
  Bed,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight
} from 'lucide-react';

export const WardenStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('ALL');
  const [selectedStudentModal, setSelectedStudentModal] = useState(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.getAuthorizedStudents().catch(() => null);
      if (res && (res.results || Array.isArray(res))) {
        const list = res.results || res;
        const mapped = list.map((s, idx) => ({
          id: s.id || `s-${idx}`,
          name: s.full_name || 'Student Resident',
          regNo: s.registration_number || 'N/A',
          email: s.email || 'N/A',
          phone: s.contact_number || 'N/A',
          room: s.initial_hostel_code ? `${s.initial_hostel_code} ${s.initial_room || ''} (Bed ${s.initial_bed || 'A'})` : 'Allocated Bed',
          bed: s.initial_bed ? `Bed ${s.initial_bed}` : 'Bed A',
          program: s.department ? `${s.department}${s.year_of_study ? ` - Year ${s.year_of_study}` : ''}` : 'Undergraduate',
          avatar: s.gender === 'FEMALE' ? '/images/student_female_avatar.jpg' : '/images/student_user.jpg',
          eligibility: s.authorization_status === 'ACTIVE' ? 'Eligible' : 'Under Review',
          isRegistered: Boolean(s.is_registered),
          swapsCount: 0,
        }));
        setStudents(mapped);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.regNo.toLowerCase().includes(q) ||
      s.room.toLowerCase().includes(q);

    const matchesEligibility =
      filterEligibility === 'ALL'
        ? true
        : filterEligibility === 'REGISTERED'
        ? s.isRegistered
        : s.eligibility === filterEligibility;

    return matchesSearch && matchesEligibility;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#5B4DF5] uppercase tracking-wider mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Resident Roster</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Students Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authorized resident roster with room allocations and exchange eligibility.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Residents</p>
              <p className="text-xl font-black text-slate-900">{students.length}</p>
            </div>
            <div className="bg-[#f4f7fb] border border-slate-200/80 px-4 py-3 rounded-2xl text-center min-w-[90px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Eligible</p>
              <p className="text-xl font-black text-emerald-600">
                {students.filter((s) => s.eligibility === 'Eligible').length}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, registration number, or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f4f7fb] border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B4DF5]/20 focus:border-[#5B4DF5] transition"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={filterEligibility}
              onChange={(e) => setFilterEligibility(e.target.value)}
              className="bg-[#f4f7fb] border border-slate-200/80 text-xs font-semibold text-slate-700 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#5B4DF5]"
            >
              <option value="ALL">All Authorized Residents</option>
              <option value="REGISTERED">Registered Students Only</option>
              <option value="Eligible">Eligible for Exchange</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold">No students found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No authorized student records match your filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="py-3 px-3">Student Resident</th>
                    <th className="py-3 px-3">Allocated Room</th>
                    <th className="py-3 px-3">Academic Program</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.avatar}
                            alt={s.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{s.name}</p>
                            <p className="text-[10px] text-slate-400">Reg: {s.regNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800">{s.room}</span>
                        <span className="text-[10px] text-slate-400 block">{s.bed}</span>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-600">{s.program}</td>
                      <td className="py-3.5 px-3">
                        <p className="text-[11px] text-slate-700">{s.email}</p>
                        <p className="text-[10px] text-slate-400">{s.phone}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              s.eligibility === 'Eligible'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {s.eligibility}
                          </span>
                          {s.isRegistered ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Registered
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500">
                              Pending Signup
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedStudentModal(s)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#f4f7fb] hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-200/80"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Student Detail View */}
        {selectedStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedStudentModal.avatar}
                    alt={selectedStudentModal.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100"
                  />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedStudentModal.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Reg. No. {selectedStudentModal.regNo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudentModal(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#f8faff] border border-slate-100 space-y-1.5">
                  <p className="font-bold text-slate-700">Room Allocation</p>
                  <p className="text-slate-900 font-black text-sm">{selectedStudentModal.room} ({selectedStudentModal.bed})</p>
                  <p className="text-slate-500">{selectedStudentModal.program}</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#f8faff] border border-slate-100 space-y-1">
                  <p className="font-bold text-slate-700">Contact Details</p>
                  <p className="text-slate-800">Email: {selectedStudentModal.email}</p>
                  <p className="text-slate-800">Phone: {selectedStudentModal.phone}</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#f8faff] border border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Exchange Eligibility:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedStudentModal.eligibility}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedStudentModal(null)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-[#5B4DF5] text-white hover:bg-[#4d3ef0] transition shadow-md shadow-[#5B4DF5]/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
export default WardenStudentsPage;
