import React, { useEffect, useState, useCallback } from "react";
import "./App.css";

const API_BASE_URL = "https://medication.infancyapp.com/api";

function App() {
  const [page, setPage] = useState("login");
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  const [patients, setPatients] = useState([]);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [globalError, setGlobalError] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const authHeaders = useCallback(
    () => ({ Accept: "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    const headers = authHeaders();
    setGlobalError("");

    setLoadingPatients(true);
    fetch(`${API_BASE_URL}/patients?per_page=50`, { headers })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message || "Failed to load patients"); return data; })
      .then((data) => {
        const list = data.data || data || [];
        setPatients(list);
        if (list.length > 0 && !selectedPatientId) setSelectedPatientId(String(list[0].id));
      })
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingPatients(false));

    setLoadingAlerts(true);
    fetch(`${API_BASE_URL}/alerts?per_page=50`, { headers })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message || "Failed to load alerts"); return data; })
      .then((data) => setAlerts(data.data || data || []))
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingAlerts(false));

    setLoadingHistory(true);
    fetch(`${API_BASE_URL}/medication-history?per_page=50`, { headers })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message || "Failed to load history"); return data; })
      .then((data) => setHistory(data.data || data || []))
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingHistory(false));

    setLoadingSummary(true);
    fetch(`${API_BASE_URL}/dashboard/summary`, { headers })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message || "Failed to load summary"); return data; })
      .then((data) => setSummary(data))
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingSummary(false));
  }, [token, authHeaders]); // ← selectedPatientId removed from deps to prevent re-fetch loop

  useEffect(() => { if (token) fetchDashboardData(); }, [token, fetchDashboardData]);

  useEffect(() => {
    if (saveMessage) { const t = setTimeout(() => setSaveMessage(""), 4000); return () => clearTimeout(t); }
  }, [saveMessage]);

  useEffect(() => {
    if (globalError) { const t = setTimeout(() => setGlobalError(""), 6000); return () => clearTimeout(t); }
  }, [globalError]);

  const handleLogout = async () => {
    try { if (token) await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", headers: authHeaders() }); } catch (_) {}
    localStorage.removeItem("token");
    setToken(""); setPatients([]); setHistory([]); setAlerts([]); setSummary(null); setSelectedPatientId("");
    setPage("login");
  };

  return (
    <div className="app">
      {page !== "login" && page !== "signup" && (
        <Navbar setPage={setPage} onLogout={handleLogout} currentPage={page} />
      )}
      <div className="page-container">
        {globalError && <div className="toast toast-error">{globalError}</div>}
        {saveMessage && <div className="toast toast-success">{saveMessage}</div>}

        {page === "login" && <Login setPage={setPage} setToken={setToken} setGlobalError={setGlobalError} />}
        {page === "signup" && <Signup setPage={setPage} />}
        {page === "dashboard" && <Dashboard patients={patients} alerts={alerts} summary={summary} loadingSummary={loadingSummary} />}
        {page === "patients" && (
          <Patients patients={patients} setPatients={setPatients} loadingPatients={loadingPatients}
            token={token} authHeaders={authHeaders} setGlobalError={setGlobalError} setSaveMessage={setSaveMessage}
            selectedPatientId={selectedPatientId} setSelectedPatientId={setSelectedPatientId} />
        )}
        {page === "medications" && (
          <Medications token={token} authHeaders={authHeaders} patients={patients}
            selectedPatientId={selectedPatientId} setSelectedPatientId={setSelectedPatientId}
            setSaveMessage={setSaveMessage} setGlobalError={setGlobalError} setHistory={setHistory} />
        )}
        {page === "alerts" && (
          <Alerts alerts={alerts} setAlerts={setAlerts} loadingAlerts={loadingAlerts}
            authHeaders={authHeaders} setGlobalError={setGlobalError} setSaveMessage={setSaveMessage} />
        )}
        {page === "history" && <History history={history} loadingHistory={loadingHistory} />}
      </div>
    </div>
  );
}

function Navbar({ setPage, onLogout, currentPage }) {
  const links = ["dashboard", "patients", "medications", "alerts", "history"];
  return (
    <nav className="navbar">
      <h1 className="logo">💊 Smart Medication Reminder</h1>
      <div className="nav-links">
        {links.map((l) => (
          <button key={l} onClick={() => setPage(l)} className={currentPage === l ? "nav-active" : ""}>
            {l.charAt(0).toUpperCase() + l.slice(1)}
          </button>
        ))}
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}

function Login({ setPage, setToken, setGlobalError }) {
  const [email, setEmail] = useState("testcaregiver123@gmail.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(""); setGlobalError("");
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Login failed."); return; }
      if (!data.token) { setError("No token returned from server."); return; }
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setPage("dashboard");
    } catch { setError("Unable to connect to server."); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-icon">💊</div>
        <h2>Welcome Back</h2>
        <p>Login to access the caregiver dashboard.</p>
        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" onClick={handleLogin} disabled={loading}>{loading ? "Logging In…" : "Log In"}</button>
        <p style={{ marginTop: "15px" }}>Don't have an account?</p>
        <button className="secondary-btn" onClick={() => setPage("signup")}>Sign Up</button>
      </div>
    </div>
  );
}

function Signup({ setPage }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError(""); setSuccess("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: fullName, email, password, password_confirmation: password, role: "caregiver" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Signup failed."); return; }
      setSuccess("Account created! Redirecting to login…");
      setTimeout(() => setPage("login"), 1500);
    } catch { setError("Unable to connect to server."); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-icon">🩺</div>
        <h2>Create Account</h2>
        <p>Sign up to access the Smart Medication Reminder System.</p>
        <input type="text" placeholder="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input type="email" placeholder="Email address *" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password * (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <button className="primary-btn" onClick={handleSignup} disabled={loading}>{loading ? "Signing Up…" : "Sign Up"}</button>
        <p style={{ marginTop: "15px" }}>Already have an account?</p>
        <button className="secondary-btn" onClick={() => setPage("login")}>Back to Login</button>
      </div>
    </div>
  );
}

function Dashboard({ patients, alerts, summary, loadingSummary }) {
  const activeAlerts = alerts.filter((a) => !a.is_acknowledged && !a.acknowledged_at && a.status !== "acknowledged");
  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      {loadingSummary ? <div className="loading-state">Loading dashboard…</div> : (
        <div className="cards">
          <div className="card card-blue"><div className="card-icon">👥</div><h3>Total Patients</h3><p className="card-value">{summary?.total_patients ?? patients.length}</p></div>
          <div className="card card-red"><div className="card-icon">⚠️</div><h3>Missed Doses</h3><p className="card-value">{summary?.missed_doses ?? 0}</p></div>
          <div className="card card-orange"><div className="card-icon">🔔</div><h3>Active Alerts</h3><p className="card-value">{summary?.active_alerts ?? activeAlerts.length}</p></div>
          <div className="card card-green"><div className="card-icon">💊</div><h3>Upcoming Refills</h3><p className="card-value">{summary?.upcoming_refills ?? 0}</p></div>
        </div>
      )}
      <div className="section">
        <h3>Recent Alerts</h3>
        <table>
          <thead><tr><th>Patient</th><th>Alert Type</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            {alerts.length === 0 ? <tr><td colSpan="4" className="empty-row">No alerts found.</td></tr> : (
              alerts.slice(0, 10).map((item, i) => {
                const isDone = item.is_acknowledged || item.acknowledged_at || item.status === "acknowledged";
                return (
                  <tr key={item.id || i}>
                    <td>{item.patient?.full_name || "N/A"}</td>
                    <td>{item.alert_type || item.type || "N/A"}</td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}</td>
                    <td><span className={`badge ${isDone ? "badge-success" : "badge-warning"}`}>{isDone ? "Acknowledged" : "Active"}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Patients({ patients, setPatients, loadingPatients, authHeaders, setGlobalError, setSaveMessage, selectedPatientId, setSelectedPatientId }) {
  const [showForm, setShowForm] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [status, setStatus] = useState("stable");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const resetForm = () => { setFullName(""); setAge(""); setGender("male"); setStatus("stable"); setNotes(""); setEditPatient(null); setShowForm(false); };

  const openEditForm = (p) => {
    setEditPatient(p); setFullName(p.full_name || p.name || ""); setAge(p.age ?? "");
    setGender(p.gender || "male"); setStatus(p.status || "stable"); setNotes(p.notes || ""); setShowForm(true);
  };

  const handleSave = async () => {
    if (!fullName.trim()) { setGlobalError("Patient name is required."); return; }
    setSaving(true);
    const body = { full_name: fullName, age: age ? Number(age) : null, gender, status, notes };
    const isEdit = !!editPatient;
    try {
      const res = await fetch(isEdit ? `${API_BASE_URL}/patients/${editPatient.id}` : `${API_BASE_URL}/patients`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setGlobalError(data.message || "Failed to save patient."); return; }
      const saved = data.data || data;
      if (isEdit) {
        setPatients((prev) => prev.map((p) => p.id === saved.id ? saved : p));
        setSaveMessage("Patient updated successfully.");
      } else {
        setPatients((prev) => [...prev, saved]);
        if (!selectedPatientId) setSelectedPatientId(String(saved.id));
        setSaveMessage("Patient created successfully.");
      }
      resetForm();
    } catch { setGlobalError("Unable to connect to server."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (patientId) => {
    if (!window.confirm("Are you sure you want to delete this patient?")) return;
    setDeletingId(patientId);
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); setGlobalError(d.message || "Failed to delete patient."); return; }
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      if (String(selectedPatientId) === String(patientId)) setSelectedPatientId("");
      setSaveMessage("Patient deleted.");
    } catch { setGlobalError("Unable to connect to server."); }
    finally { setDeletingId(null); }
  };

  return (
    <div>
      <h2 className="page-title">Patient Management</h2>
      <div className="section">
        <button className="primary-btn small-btn" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm && !editPatient ? "Cancel" : "+ Add Patient"}
        </button>
        {showForm && (
          <div className="form-card" style={{ marginTop: "16px" }}>
            <h3>{editPatient ? "Edit Patient" : "New Patient"}</h3>
            <div className="form-row"><label>Full Name *</label><input type="text" placeholder="Enter patient full name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div className="form-row"><label>Age</label><input type="number" placeholder="Enter age" value={age} onChange={(e) => setAge(e.target.value)} /></div>
            <div className="form-row"><label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div className="form-row"><label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="stable">Stable</option><option value="needs_attention">Needs Attention</option>
              </select>
            </div>
            <div className="form-row"><label>Notes</label><textarea placeholder="Enter notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="primary-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editPatient ? "Update Patient" : "Save Patient"}</button>
              <button className="secondary-btn" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        )}
        {loadingPatients ? <div className="loading-state">Loading patients…</div> : (
          <table>
            <thead><tr><th>Name</th><th>Age</th><th>Gender</th><th>Status</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {patients.length === 0 ? <tr><td colSpan="6" className="empty-row">No patients found. Add one above.</td></tr> : (
                patients.map((patient, i) => (
                  <tr key={patient.id || i}>
                    <td>{patient.full_name || patient.name}</td>
                    <td>{patient.age ?? "N/A"}</td>
                    <td>{patient.gender || "N/A"}</td>
                    <td><span className={`badge ${patient.status === "stable" ? "badge-success" : "badge-warning"}`}>{patient.status}</span></td>
                    <td className="notes-cell">{patient.notes || "—"}</td>
                    <td>
                      <div className="action-btns">
                        <button className="primary-btn small-btn" onClick={() => openEditForm(patient)}>Edit</button>
                        <button className="danger-btn small-btn" onClick={() => handleDelete(patient.id)} disabled={deletingId === patient.id}>{deletingId === patient.id ? "…" : "Delete"}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Medications({ authHeaders, patients, selectedPatientId, setSelectedPatientId, setSaveMessage, setGlobalError, setHistory }) {
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [scheduledTime, setScheduledTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [doseLoading, setDoseLoading] = useState(null);

  const fetchSchedules = useCallback(async (patientId) => {
    if (!patientId) return;
    setLoadingSchedules(true);
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}/medication-schedules`, { headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setSchedules(data.data || data || []);
      else setGlobalError(data.message || "Failed to load schedules.");
    } catch { setGlobalError("Unable to connect to server."); }
    finally { setLoadingSchedules(false); }
  }, [authHeaders, setGlobalError]);

  useEffect(() => { if (selectedPatientId) fetchSchedules(selectedPatientId); else setSchedules([]); }, [selectedPatientId, fetchSchedules]);

  const resetForm = () => {
    setMedicationName(""); setDosage(""); setFrequency("daily");
    setScheduledTime(""); setInstructions(""); setStartDate(""); setEndDate("");
    setEditSchedule(null); setShowForm(false);
  };

  const openEditForm = (sched) => {
    setEditSchedule(sched); setMedicationName(sched.medication_name || ""); setDosage(sched.dosage || "");
    setFrequency(sched.frequency || "daily"); setScheduledTime(sched.scheduled_time || "");
    setInstructions(sched.instructions || ""); setStartDate(sched.start_date || ""); setEndDate(sched.end_date || "");
    setShowForm(true);
  };

  const handleSaveSchedule = async () => {
    setGlobalError("");
    if (!selectedPatientId) { setGlobalError("Please select a patient."); return; }
    if (!medicationName.trim() || !dosage.trim() || !scheduledTime.trim() || !startDate.trim()) {
      setGlobalError("Medication name, dosage, time, and start date are required."); return;
    }
    setSaving(true);
    const body = { medication_name: medicationName, dosage, frequency, scheduled_time: scheduledTime, instructions, start_date: startDate, end_date: endDate || null, is_active: true };
    const isEdit = !!editSchedule;
    try {
      const res = await fetch(
        isEdit ? `${API_BASE_URL}/patients/${selectedPatientId}/medication-schedules/${editSchedule.id}` : `${API_BASE_URL}/patients/${selectedPatientId}/medication-schedules`,
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body) }
      );
      const data = await res.json();
      if (!res.ok) { setGlobalError(data.message || "Failed to save schedule."); return; }
      const saved = data.data || data;
      if (isEdit) {
        setSchedules((prev) => prev.map((s) => s.id === saved.id ? saved : s));
        setSaveMessage("Medication schedule updated successfully.");
      } else {
        setSchedules((prev) => [...prev, saved]);
        setSaveMessage("Medication schedule saved successfully.");
      }
      resetForm();
    } catch { setGlobalError("Unable to connect to server."); }
    finally { setSaving(false); }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Delete this medication schedule?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${selectedPatientId}/medication-schedules/${scheduleId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); setGlobalError(d.message || "Failed to delete."); return; }
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setSaveMessage("Schedule deleted.");
    } catch { setGlobalError("Unable to connect to server."); }
  };

  const handleRecordDose = async (scheduleId, status) => {
    if (!selectedPatientId || !scheduleId) return;
    const key = `${scheduleId}-${status}`;
    setDoseLoading(key);
    const eventTime = new Date().toISOString().slice(0, 19).replace("T", " ");
    try {
      const res = await fetch(`${API_BASE_URL}/dose-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ patient_id: Number(selectedPatientId), medication_schedule_id: scheduleId, status, event_time: eventTime, notes: `Marked as ${status} from web app` }),
      });
      const data = await res.json();
      if (!res.ok) { setGlobalError(data.message || "Failed to record dose."); return; }
      const patient = patients.find((p) => String(p.id) === String(selectedPatientId));
      const schedule = schedules.find((s) => s.id === scheduleId);
      setHistory((prev) => [{
        id: data.id || Date.now(),
        patient: { full_name: patient?.full_name || patient?.name || "N/A" },
        medication_schedule: { medication_name: schedule?.medication_name || "N/A" },
        event_time: eventTime, status,
      }, ...prev]);
      setSaveMessage(`Dose marked as "${status}".`);
    } catch { setGlobalError("Unable to connect to server."); }
    finally { setDoseLoading(null); }
  };

  return (
    <div>
      <h2 className="page-title">Medication Schedule</h2>
      <div className="form-card" style={{ marginBottom: "20px" }}>
        <div className="form-row">
          <label>Select Patient</label>
          <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
            <option value="">— Select a patient —</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.name}</option>)}
          </select>
        </div>
      </div>
      {selectedPatientId ? (
        <div className="section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3>Saved Medications</h3>
            <button className="primary-btn small-btn" onClick={() => { resetForm(); setShowForm(!showForm); }}>
              {showForm && !editSchedule ? "Cancel" : "+ Add Medication"}
            </button>
          </div>
          {showForm && (
            <div className="form-card" style={{ marginBottom: "20px" }}>
              <h3>{editSchedule ? "Edit Medication" : "New Medication Schedule"}</h3>
              <div className="form-row"><label>Medication Name *</label><input type="text" placeholder="e.g. Metformin" value={medicationName} onChange={(e) => setMedicationName(e.target.value)} /></div>
              <div className="form-row"><label>Dosage *</label><input type="text" placeholder="e.g. 500mg" value={dosage} onChange={(e) => setDosage(e.target.value)} /></div>
              <div className="form-row"><label>Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option value="daily">Daily</option><option value="twice_daily">Twice Daily</option>
                  <option value="three_times_daily">Three Times Daily</option><option value="weekly">Weekly</option>
                  <option value="as_needed">As Needed</option>
                </select>
              </div>
              <div className="form-row"><label>Scheduled Time *</label><input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} /></div>
              <div className="form-row"><label>Instructions</label><textarea placeholder="e.g. Take with food" value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
              <div className="form-row"><label>Start Date *</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="form-row"><label>End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="primary-btn" onClick={handleSaveSchedule} disabled={saving}>{saving ? "Saving…" : editSchedule ? "Update Schedule" : "Save Schedule"}</button>
                <button className="secondary-btn" onClick={resetForm}>Cancel</button>
              </div>
            </div>
          )}
          {loadingSchedules ? <div className="loading-state">Loading schedules…</div> : (
            <table>
              <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Time</th><th>Instructions</th><th>Dates</th><th>Record Dose</th><th>Actions</th></tr></thead>
              <tbody>
                {schedules.length === 0 ? <tr><td colSpan="8" className="empty-row">No medication schedules found. Add one above.</td></tr> : (
                  schedules.map((item, i) => (
                    <tr key={item.id || i}>
                      <td><strong>{item.medication_name}</strong></td>
                      <td>{item.dosage}</td><td>{item.frequency}</td><td>{item.scheduled_time}</td>
                      <td>{item.instructions || "—"}</td>
                      <td style={{ fontSize: "0.8em" }}>{item.start_date || "—"}{item.end_date ? ` → ${item.end_date}` : ""}</td>
                      <td>
                        <div className="action-btns">
                          {["taken", "missed", "skipped"].map((s) => {
                            const key = `${item.id}-${s}`;
                            return <button key={s} className={`dose-btn dose-${s}`} onClick={() => handleRecordDose(item.id, s)} disabled={doseLoading === key}>{doseLoading === key ? "…" : s.charAt(0).toUpperCase() + s.slice(1)}</button>;
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="primary-btn small-btn" onClick={() => openEditForm(item)}>Edit</button>
                          <button className="danger-btn small-btn" onClick={() => handleDeleteSchedule(item.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : <div className="empty-state"><p>👆 Please select a patient to manage their medications.</p></div>}
    </div>
  );
}

function Alerts({ alerts, setAlerts, loadingAlerts, authHeaders, setGlobalError, setSaveMessage }) {
  const [loadingId, setLoadingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const handleAcknowledge = async (alertId) => {
    setLoadingId(alertId);
    try {
      const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, { method: "PATCH", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { setGlobalError(data.message || "Failed to acknowledge alert."); return; }
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, is_acknowledged: true, acknowledged_at: new Date().toISOString(), status: "acknowledged" } : a));
      setSaveMessage("Alert acknowledged.");
    } catch { setGlobalError("Unable to connect to server."); }
    finally { setLoadingId(null); }
  };

  const filtered = alerts.filter((a) => {
    const isDone = a.is_acknowledged || a.acknowledged_at || a.status === "acknowledged";
    if (filterStatus === "active") return !isDone;
    if (filterStatus === "acknowledged") return isDone;
    return true;
  });

  return (
    <div>
      <h2 className="page-title">Alerts</h2>
      <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
        {["all", "active", "acknowledged"].map((f) => (
          <button key={f} className={filterStatus === f ? "primary-btn small-btn" : "secondary-btn small-btn"} onClick={() => setFilterStatus(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="section">
        {loadingAlerts ? <div className="loading-state">Loading alerts…</div> : (
          <table>
            <thead><tr><th>Patient</th><th>Alert Type</th><th>Time</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan="5" className="empty-row">No alerts found.</td></tr> : (
                filtered.map((item, i) => {
                  const isDone = item.is_acknowledged || item.acknowledged_at || item.status === "acknowledged";
                  return (
                    <tr key={item.id || i}>
                      <td>{item.patient?.full_name || "N/A"}</td>
                      <td>{item.alert_type || item.type || "N/A"}</td>
                      <td>{item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}</td>
                      <td><span className={`badge ${isDone ? "badge-success" : "badge-warning"}`}>{isDone ? "Acknowledged" : "Active"}</span></td>
                      <td>
                        {isDone ? <span style={{ color: "#888", fontSize: "0.85em" }}>Done</span> : (
                          <button className="primary-btn small-btn" onClick={() => handleAcknowledge(item.id)} disabled={loadingId === item.id}>
                            {loadingId === item.id ? "Processing…" : "Acknowledge"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function History({ history, loadingHistory }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? history : history.filter((h) => h.status === filter);
  const statusCounts = history.reduce((acc, h) => { acc[h.status] = (acc[h.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      <h2 className="page-title">Medication History</h2>
      <div className="cards" style={{ marginBottom: "20px" }}>
        {[{ label: "Taken", key: "taken", color: "card-green" }, { label: "Missed", key: "missed", color: "card-red" }, { label: "Skipped", key: "skipped", color: "card-orange" }].map(({ label, key, color }) => (
          <div key={key} className={`card ${color}`} style={{ cursor: "pointer" }} onClick={() => setFilter(filter === key ? "all" : key)}>
            <h3>{label}</h3><p className="card-value">{statusCounts[key] || 0}</p>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
        {["all", "taken", "missed", "skipped"].map((f) => (
          <button key={f} className={filter === f ? "primary-btn small-btn" : "secondary-btn small-btn"} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="section">
        {loadingHistory ? <div className="loading-state">Loading medication history…</div> : (
          <table>
            <thead><tr><th>Patient</th><th>Medication</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan="4" className="empty-row">No records found.</td></tr> : (
                filtered.map((item, i) => (
                  <tr key={item.id || i}>
                    <td>{item.patient?.full_name || item.patient?.name || "N/A"}</td>
                    <td>{item.medication_schedule?.medication_name || item.medication_name || "N/A"}</td>
                    <td>{item.event_time ? new Date(item.event_time).toLocaleString() : "N/A"}</td>
                    <td><span className={`badge badge-${item.status === "taken" ? "success" : item.status === "missed" ? "danger" : "warning"}`}>{item.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;