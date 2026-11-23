/**
 * Module: frontend/src/pages/super_admin/SuperAdminAddStudentPage.jsx
 *
 * Work / Purpose:
 *   Super Admin form page for pre-authorizing new student identities into the platform.
 *
 * Connected Modules (Used By / Consumers):
 *   - frontend/src/App.jsx
 *
 * Helpful / Supporting Modules (Dependencies):
 *   - frontend/src/components/layout/AppLayout.jsx
 *   - frontend/src/services/api.js
 *   - lucide-react (npm package)
 *   - react (npm package)
 *   - react-router-dom (npm package)
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  UserPlus,
  UploadCloud,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Download,
  Building,
  User,
  Mail,
  GraduationCap,
} from 'lucide-react';

export const SuperAdminAddStudentPage = () => {
  const navigate = useNavigate();

  // Tab: 'single' or 'bulk'
  const [activeTab, setActiveTab] = useState('single');
  const [hostels, setHostels] = useState([]);

  useEffect(() => {
    api.getHostels()
      .then((data) => {
        if (Array.isArray(data)) setHostels(data);
        else if (data?.results && Array.isArray(data.results)) setHostels(data.results);
      })
      .catch(() => {});
  }, []);

  // Single Student Form
  const [formData, setFormData] = useState({
    registration_number: '',
    full_name: '',
    email: '',
    eligibility_classification: 'BOYS',
    gender: 'MALE',
    department: '',
    year_of_study: 1,
    initial_hostel_code: 'BH1',
    initial_room: '',
    initial_bed: 'A',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Live Room & Bed Occupancy Check
  const [roomOccupancy, setRoomOccupancy] = useState(null);
  const [occupancyWarning, setOccupancyWarning] = useState('');
  const [checkingOccupancy, setCheckingOccupancy] = useState(false);

  useEffect(() => {
    if (!formData.initial_hostel_code || !formData.initial_room) {
      setRoomOccupancy(null);
      setOccupancyWarning('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingOccupancy(true);
        const res = await api.checkRoomOccupancy({
          hostel_code: formData.initial_hostel_code,
          room_number: formData.initial_room,
          bed_number: formData.initial_bed,
        });
        setRoomOccupancy(res);
        if (res.target_bed_occupied) {
          setOccupancyWarning(res.target_bed_warning || `Bed ${formData.initial_bed} in ${formData.initial_hostel_code} ${formData.initial_room} is already occupied!`);
        } else if (res.is_full) {
          setOccupancyWarning(`Room ${formData.initial_room} in ${formData.initial_hostel_code} is already at full capacity (${res.capacity}/${res.capacity}). All seats are taken.`);
        } else {
          setOccupancyWarning('');
        }
      } catch (err) {
        console.error('Failed to check room occupancy:', err);
      } finally {
        setCheckingOccupancy(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.initial_hostel_code, formData.initial_room, formData.initial_bed]);

  // Bulk CSV
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState('');

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (occupancyWarning) {
      setError(occupancyWarning);
      return;
    }

    setLoading(true);

    try {
      const res = await api.addStudentIdentity(formData);
      setSuccess(`Student ${res.institution_id} (${res.name}) authorized successfully with status INVITED.`);
      setFormData({
        registration_number: '',
        full_name: '',
        email: '',
        eligibility_classification: 'BOYS',
        gender: 'MALE',
        department: '',
        year_of_study: 1,
        initial_hostel_code: '',
        initial_room: '',
        initial_bed: '',
      });
    } catch (err) {
      const msg =
        err.response?.data?.registration_number?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        'Failed to authorize student identity.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      setCsvError('Please select a CSV file to upload.');
      return;
    }

    setCsvError('');
    setCsvResult(null);
    setCsvLoading(true);

    const fd = new FormData();
    fd.append('file', csvFile);

    try {
      const res = await api.importAuthorizedIdentitiesCSV(fd);
      setCsvResult(res);
      setCsvFile(null);
    } catch (err) {
      setCsvError(err.response?.data?.detail || 'CSV bulk upload failed. Please verify the file structure.');
    } finally {
      setCsvLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      "registration_number,name,email,eligibility,gender,department,year\n" +
      "12345678,Aman Sharma,aman.sharma@hostel.edu,BOYS,MALE,Computer Science,2\n" +
      "12345679,Priya Patel,priya.patel@hostel.edu,GIRLS,FEMALE,Electronics,3\n" +
      "12345680,Rohit Verma,rohit.verma@hostel.edu,BOYS,MALE,Mechanical,1\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_students_authorization.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout
      pageTitle="Authorize Student Identity"
      pageDescription="Pre-authorize university registration numbers individually or via bulk institutional CSV."
    >
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/super-admin/users"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#f78c30] shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Authorize Student Identity
            </h1>
            <p className="text-xs text-slate-500">
              Only authorized registration numbers can activate a Student account through OTP verification.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-200/70 p-1 rounded-xl flex items-center text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`py-1.5 px-3 rounded-lg transition ${
              activeTab === 'single' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Single Student
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`py-1.5 px-3 rounded-lg transition ${
              activeTab === 'bulk' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bulk CSV Upload
          </button>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="max-w-4xl mx-auto">
        {activeTab === 'single' ? (
          /* Single Student Form */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            {success && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{success}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSingleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Registration Number */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    University Registration Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value.toUpperCase() })}
                    placeholder="e.g. 12345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Must be unique across the platform.</span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Full Student Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Aman Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
                  />
                </div>

                {/* Institutional Email */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Institution-Verified Trusted Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                    placeholder="student@hostel.edu or name@lpu.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20 focus:border-[#f78c30]"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    The single-use activation OTP will be dispatched exclusively to this verified address.
                  </span>
                </div>

                {/* Eligibility Classification */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Hostel Category Eligibility *
                  </label>
                  <select
                    value={formData.eligibility_classification}
                    onChange={(e) => setFormData({ ...formData, eligibility_classification: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none"
                  >
                    <option value="BOYS">Boys' Hostel (Male Only)</option>
                    <option value="GIRLS">Girls' Hostel (Female Only)</option>
                    <option value="COED">Co-ed / Special</option>
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f78c30]/20"
                  />
                </div>

                {/* Year of Study */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Year of Study</label>
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({ ...formData, year_of_study: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>

                {/* Pre-Allocated Current Room (Required for Room Swaps) */}
                <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                  <div className="mb-2">
                    <span className="font-bold text-slate-800 text-xs block">Current Room Allocation (Required for Room Swap)</span>
                    <span className="text-[10px] text-slate-500">Specify the student's currently assigned hostel room so they can immediately initiate or join room swaps.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hostel *</label>
                      <input
                        type="text"
                        list="hostels-list"
                        required
                        value={formData.initial_hostel_code}
                        onChange={(e) => setFormData({ ...formData, initial_hostel_code: e.target.value.toUpperCase() })}
                        placeholder="e.g. BH1"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none"
                      />
                      <datalist id="hostels-list">
                        {hostels.map((h) => (
                          <option key={h.id || h.code} value={h.code}>{h.name} ({h.code})</option>
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Room Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.initial_room}
                        onChange={(e) => setFormData({ ...formData, initial_room: e.target.value })}
                        placeholder="e.g. 102"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Bed Identifier *</label>
                      <input
                        type="text"
                        required
                        value={formData.initial_bed}
                        onChange={(e) => setFormData({ ...formData, initial_bed: e.target.value.toUpperCase() })}
                        placeholder="e.g. A"
                        className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:bg-white focus:outline-none font-mono ${
                          occupancyWarning
                            ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-200'
                            : 'border-slate-200 bg-slate-50 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Live Room Occupancy Visualizer & Warning */}
                  {checkingOccupancy && (
                    <div className="mt-2.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-[#f78c30] border-t-transparent rounded-full animate-spin" />
                      <span>Checking seat availability in {formData.initial_hostel_code} {formData.initial_room}...</span>
                    </div>
                  )}

                  {roomOccupancy && roomOccupancy.exists && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          {roomOccupancy.hostel_code} Room {roomOccupancy.room_number} Seat Status:
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Capacity: {roomOccupancy.occupied_count} / {roomOccupancy.capacity} Occupied
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {roomOccupancy.beds.map((b) => {
                          const isSelected = formData.initial_bed.toUpperCase() === b.bed_number.toUpperCase();
                          return (
                            <button
                              key={b.bed_number}
                              type="button"
                              onClick={() => setFormData({ ...formData, initial_bed: b.bed_number })}
                              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                                isSelected && b.is_occupied
                                  ? 'border-rose-400 bg-rose-50 text-rose-950 font-bold'
                                  : isSelected
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-200'
                                    : b.is_occupied
                                      ? 'border-amber-200 bg-amber-50/60 text-slate-700'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-bold flex items-center gap-1.5">
                                  <span>Seat {b.bed_number}</span>
                                  {b.is_occupied ? (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                      Occupied
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      Vacant
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[170px] mt-0.5">
                                  {b.is_occupied && b.occupant ? `${b.occupant.name} (${b.occupant.registration_number || b.occupant.email})` : 'Available to assign'}
                                </div>
                              </div>
                              <div className="text-xs font-bold">
                                {isSelected ? 'Selected' : 'Pick'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {occupancyWarning && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold block text-amber-900">Warning: Seat Not Available</span>
                        <p>{occupancyWarning}</p>
                        {roomOccupancy?.available_beds && roomOccupancy.available_beds.length > 0 && (
                          <div className="pt-1 flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700">Available Alternative:</span>
                            {roomOccupancy.available_beds.map((seat) => (
                              <button
                                key={seat}
                                type="button"
                                onClick={() => setFormData({ ...formData, initial_bed: seat })}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs"
                              >
                                Assign Seat {seat} instead &rarr;
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Link
                  to="/super-admin/users"
                  className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  id="create-student-btn"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl font-bold bg-[#f78c30] hover:bg-[#4d2bd4] text-white shadow-md shadow-[#f78c30]/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Authorize Student</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Bulk CSV Upload Form */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-orange-50/70 border border-orange-100">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-slate-900 text-sm">Download Template First</h3>
                <p className="text-xs text-slate-600">
                  Format your institutional roster using the official columns before uploading.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-orange-200 text-[#f78c30] font-bold text-xs hover:bg-orange-50 shadow-2xs transition self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {csvError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{csvError}</span>
              </div>
            )}

            {csvResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Import Summary</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {csvResult.created_count} Authorized
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                      {csvResult.errors_count} Errors
                    </span>
                  </div>
                </div>

                {csvResult.errors && csvResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-rose-200 rounded-xl bg-rose-50/50 p-2 text-[11px] space-y-1">
                    {csvResult.errors.map((errItem, idx) => (
                      <div key={idx} className="text-rose-800">
                        Row {errItem.row}: {errItem.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center hover:border-[#f78c30] transition bg-slate-50/50">
                <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <label className="cursor-pointer">
                  <span className="text-xs font-bold text-[#f78c30] hover:underline block">
                    Choose a CSV file to authorize
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {csvFile ? `Selected: ${csvFile.name}` : 'UTF-8 encoded .csv files only'}
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  id="import-csv-btn"
                  disabled={csvLoading || !csvFile}
                  className="px-6 py-2.5 rounded-xl font-bold bg-[#f78c30] hover:bg-[#4d2bd4] text-white text-xs shadow-md shadow-[#f78c30]/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {csvLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload &amp; Authorize Identities</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      </div>
    </AppLayout>
  );
};

export default SuperAdminAddStudentPage;
