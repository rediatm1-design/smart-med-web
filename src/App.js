import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import { apiRequest, buildQuery, getCollection, getRecord } from "./api";

const emptyPatientForm = {
  full_name: "",
  age: "",
  gender: "male",
  status: "stable",
  notes: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relationship: "",
  allergies: "",
  medical_notes: "",
};

const emptyScheduleForm = {
  medication_name: "",
  dosage: "",
  frequency: "daily",
  scheduled_time: "",
  instructions: "",
  start_date: "",
  end_date: "",
  doctor_name: "",
  hospital_name: "",
  remaining_pills: "",
  refill_date: "",
  is_active: true,
};

function App() {
  const [page, setPage] = useState(localStorage.getItem("token") ? "dashboard" : "login");
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
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const data = await apiRequest("/patients?per_page=50");
      const patientList = getCollection(data);
      setPatients(patientList);
      setSelectedPatientId((current) => current || String(patientList[0]?.id || ""));
      return patientList;
    } catch (err) {
      setGlobalError(err.message);
      return [];
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  const loadAlerts = useCallback(async (filters = {}) => {
    setLoadingAlerts(true);
    try {
      const data = await apiRequest(`/alerts${buildQuery({ per_page: 50, ...filters })}`);
      setAlerts(getCollection(data));
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  const loadHistory = useCallback(async (filters = {}) => {
    setLoadingHistory(true);
    try {
      const data = await apiRequest(`/medication-history${buildQuery({ per_page: 50, ...filters })}`);
      setHistory(getCollection(data));
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await apiRequest("/dashboard/summary");
      setSummary(getRecord(data));
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    if (!token) return;
    setGlobalError("");
    await Promise.all([loadPatients(), loadAlerts(), loadHistory(), loadSummary()]);
  }, [token, loadPatients, loadAlerts, loadHistory, loadSummary]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const refreshAfterPatientChange = async () => {
    await Promise.all([loadPatients(), loadSummary()]);
  };

  const refreshAfterScheduleChange = async () => {
    await Promise.all([loadSummary()]);
  };

  const refreshAfterDoseEvent = async () => {
    await Promise.all([loadHistory(), loadAlerts(), loadSummary()]);
  };

  const refreshAfterAlertChange = async () => {
    await Promise.all([loadAlerts(), loadSummary()]);
  };

  const handleLogout = async () => {
    try {
      if (token) await apiRequest("/auth/logout", { method: "POST" });
    } catch (err) {
      // Logout should still clear the local session if the backend call fails.
    } finally {
      localStorage.removeItem("token");
      setToken("");
      setPatients([]);
      setHistory([]);
      setAlerts([]);
      setSummary(null);
      setSelectedPatientId("");
      setPage("login");
    }
  };

  return (
    <div className="app">
      {page !== "login" && page !== "signup" && <Navbar setPage={setPage} onLogout={handleLogout} />}

      <main className="page-container">
        {globalError && <p className="form-error">{globalError}</p>}
        {saveMessage && <p className="form-success">{saveMessage}</p>}

        {page === "login" && (
          <Login setPage={setPage} setToken={setToken} setGlobalError={setGlobalError} />
        )}
        {page === "signup" && <Signup setPage={setPage} />}
        {page === "dashboard" && (
          <Dashboard patients={patients} alerts={alerts} summary={summary} loadingSummary={loadingSummary} />
        )}
        {page === "patients" && (
          <Patients
            patients={patients}
            loadingPatients={loadingPatients}
            refreshPatients={refreshAfterPatientChange}
            setGlobalError={setGlobalError}
            setSaveMessage={setSaveMessage}
            setSelectedPatientId={setSelectedPatientId}
            setPage={setPage}
          />
        )}
        {page === "medications" && (
          <Medications
            patients={patients}
            selectedPatientId={selectedPatientId}
            setSelectedPatientId={setSelectedPatientId}
            refreshAfterDoseEvent={refreshAfterDoseEvent}
            refreshAfterScheduleChange={refreshAfterScheduleChange}
            setSaveMessage={setSaveMessage}
            setGlobalError={setGlobalError}
          />
        )}
        {page === "alerts" && (
          <Alerts
            alerts={alerts}
            patients={patients}
            loadingAlerts={loadingAlerts}
            loadAlerts={loadAlerts}
            refreshAfterAlertChange={refreshAfterAlertChange}
          />
        )}
        {page === "history" && (
          <History
            history={history}
            patients={patients}
            loadingHistory={loadingHistory}
            loadHistory={loadHistory}
          />
        )}
      </main>
    </div>
  );
}

function Navbar({ setPage, onLogout }) {
  return (
    <nav className="navbar">
      <h1 className="logo">Smart Medication Reminder</h1>
      <div className="nav-links">
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("patients")}>Patients</button>
        <button onClick={() => setPage("medications")}>Medications</button>
        <button onClick={() => setPage("alerts")}>Alerts</button>
        <button onClick={() => setPage("history")}>History</button>
        <button onClick={onLogout}>Logout</button>
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
    setError("");
    setGlobalError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const record = getRecord(data);
      const nextToken = data?.token || record?.token || data?.access_token || record?.access_token;

      if (!nextToken) {
        setError("No token returned from server.");
        return;
      }

      localStorage.setItem("token", nextToken);
      setToken(nextToken);
      setPage("dashboard");
    } catch (err) {
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Welcome</h2>
        <p>Login to access the caregiver and medical support dashboard.</p>
        <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Logging In..." : "Log In"}
        </button>
        <p style={{ marginTop: "15px" }}>Don't have an account?</p>
        <button className="primary-btn" onClick={() => setPage("signup")}>Sign Up</button>
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
    setError("");
    setSuccess("");

    if (!fullName.trim()) return setError("Full name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address.");
    if (!password.trim()) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: fullName,
          email,
          password,
          password_confirmation: password,
          role: "caregiver",
        }),
      });
      setSuccess("Account created successfully. Please log in.");
      setPage("login");
    } catch (err) {
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Create Account</h2>
        <p>Sign up to access the Smart Medication Reminder System.</p>
        <input type="text" placeholder="Full Name *" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input type="email" placeholder="Email address *" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password * (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <button className="primary-btn" onClick={handleSignup} disabled={loading}>
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
        <p style={{ marginTop: "15px" }}>Already have an account?</p>
        <button className="primary-btn" onClick={() => setPage("login")}>Back to Login</button>
      </div>
    </div>
  );
}

function Dashboard({ patients, alerts, summary, loadingSummary }) {
  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      {loadingSummary ? (
        <p>Loading dashboard summary...</p>
      ) : (
        <div className="cards">
          <Metric title="Total Patients" value={summary?.total_patients ?? patients.length} />
          <Metric title="Missed Doses" value={summary?.missed_doses ?? 0} />
          <Metric title="Active Alerts" value={summary?.active_alerts ?? alerts.length} />
          <Metric title="Upcoming Refills" value={summary?.upcoming_refills ?? 0} />
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

function Patients({
  patients,
  loadingPatients,
  refreshPatients,
  setGlobalError,
  setSaveMessage,
  setSelectedPatientId,
  setPage,
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyPatientForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [localError, setLocalError] = useState("");

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setForm(emptyPatientForm);
    setEditingId(null);
    setShowForm(false);
  };

  const beginEdit = (patient) => {
    setForm({
      ...emptyPatientForm,
      ...patient,
      age: patient.age ?? "",
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_phone: patient.emergency_contact_phone || "",
      emergency_contact_relationship: patient.emergency_contact_relationship || "",
      allergies: patient.allergies || "",
      medical_notes: patient.medical_notes || "",
    });
    setEditingId(patient.id);
    setShowForm(true);
    setLocalError("");
  };

  const patientPayload = () => ({
    ...form,
    age: form.age === "" ? null : Number(form.age),
  });

  const handleSavePatient = async () => {
    setLocalError("");
    setGlobalError("");
    setSaveMessage("");

    if (!form.full_name.trim()) {
      setLocalError("Patient name is required.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest(editingId ? `/patients/${editingId}` : "/patients", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(patientPayload()),
      });
      setSaveMessage(editingId ? "Patient updated successfully." : "Patient created successfully.");
      resetForm();
      await refreshPatients();
    } catch (err) {
      setLocalError(err.message || "Unable to save patient.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (patientId) => {
    if (!window.confirm("Delete this patient?")) return;

    setDeletingId(patientId);
    setLocalError("");
    setSaveMessage("");
    try {
      await apiRequest(`/patients/${patientId}`, { method: "DELETE" });
      setSaveMessage("Patient deleted successfully.");
      await refreshPatients();
    } catch (err) {
      setLocalError(err.message || "Unable to delete patient.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewDetail = async (patientId) => {
    setLoadingDetailId(patientId);
    setLocalError("");
    try {
      const data = await apiRequest(`/patients/${patientId}`);
      setDetail(getRecord(data));
    } catch (err) {
      setLocalError(err.message || "Unable to load patient detail.");
    } finally {
      setLoadingDetailId(null);
    }
  };

  return (
    <div>
      <h2 className="page-title">Patient Management</h2>
      <div className="section">
        <button className="primary-btn small-btn" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? "Cancel" : "+ Add Patient"}
        </button>

        {localError && <p className="form-error">{localError}</p>}

        {showForm && (
          <div className="form-card inline-form">
            <h3>{editingId ? "Edit Patient" : "Add Patient"}</h3>
            <PatientFields form={form} updateForm={updateForm} />
            <button className="primary-btn" onClick={handleSavePatient} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Patient" : "Save Patient"}
            </button>
          </div>
        )}

        {loadingPatients ? (
          <p>Loading patients...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Status</th>
                <th>Gender</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan="5">No patients found.</td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.full_name || patient.name}</td>
                    <td>{patient.age ?? "N/A"}</td>
                    <td>{patient.status || "N/A"}</td>
                    <td>{patient.gender || "N/A"}</td>
                    <td>
                      <div className="table-actions">
                        <button className="secondary-btn small-btn" onClick={() => handleViewDetail(patient.id)} disabled={loadingDetailId === patient.id}>
                          {loadingDetailId === patient.id ? "Loading..." : "View"}
                        </button>
                        <button className="secondary-btn small-btn" onClick={() => beginEdit(patient)}>Edit</button>
                        <button className="danger-btn small-btn" onClick={() => handleDelete(patient.id)} disabled={deletingId === patient.id}>
                          {deletingId === patient.id ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          className="primary-btn small-btn"
                          onClick={() => {
                            setSelectedPatientId(String(patient.id));
                            setPage("medications");
                          }}
                        >
                          Meds
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {detail && <PatientDetail patient={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function PatientFields({ form, updateForm }) {
  return (
    <>
      <div className="form-grid">
        <FormInput label="Full Name" value={form.full_name} onChange={(value) => updateForm("full_name", value)} />
        <FormInput label="Age" type="number" value={form.age} onChange={(value) => updateForm("age", value)} />
        <div className="form-row">
          <label>Gender</label>
          <select value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-row">
          <label>Status</label>
          <select value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
            <option value="stable">Stable</option>
            <option value="needs_attention">Needs Attention</option>
            <option value="critical">Critical</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <FormInput label="Emergency Contact Name" value={form.emergency_contact_name} onChange={(value) => updateForm("emergency_contact_name", value)} />
        <FormInput label="Emergency Contact Phone" value={form.emergency_contact_phone} onChange={(value) => updateForm("emergency_contact_phone", value)} />
        <FormInput label="Emergency Contact Relationship" value={form.emergency_contact_relationship} onChange={(value) => updateForm("emergency_contact_relationship", value)} />
      </div>
      <FormTextarea label="Notes" value={form.notes} onChange={(value) => updateForm("notes", value)} />
      <FormTextarea label="Allergies" value={form.allergies} onChange={(value) => updateForm("allergies", value)} />
      <FormTextarea label="Medical Notes" value={form.medical_notes} onChange={(value) => updateForm("medical_notes", value)} />
    </>
  );
}

function PatientDetail({ patient, onClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{patient.full_name || patient.name || "Patient Detail"}</h3>
          <button className="secondary-btn small-btn" onClick={onClose}>Close</button>
        </div>
        <div className="detail-grid">
          <Detail label="Age" value={patient.age} />
          <Detail label="Gender" value={patient.gender} />
          <Detail label="Status" value={patient.status} />
          <Detail label="Emergency Contact" value={[patient.emergency_contact_name, patient.emergency_contact_phone, patient.emergency_contact_relationship].filter(Boolean).join(" | ")} />
          <Detail label="Allergies" value={patient.allergies} />
          <Detail label="Medical Notes" value={patient.medical_notes} />
          <Detail label="Total Medications" value={patient.total_medications} />
          <Detail label="Adherence Rate" value={patient.adherence_rate !== undefined ? `${patient.adherence_rate}%` : ""} />
          <Detail label="Last Taken At" value={patient.last_taken_at} />
          <Detail label="Notes" value={patient.notes} />
        </div>
      </div>
    </div>
  );
}

function Medications({
  patients,
  selectedPatientId,
  setSelectedPatientId,
  refreshAfterDoseEvent,
  refreshAfterScheduleChange,
  setSaveMessage,
  setGlobalError,
}) {
  const [form, setForm] = useState(emptyScheduleForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [doseLoadingKey, setDoseLoadingKey] = useState("");
  const [localError, setLocalError] = useState("");

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const fetchSchedules = useCallback(async (patientId) => {
    if (!patientId) {
      setSchedules([]);
      return;
    }

    setLoadingSchedules(true);
    try {
      const data = await apiRequest(`/patients/${patientId}/medication-schedules`);
      setSchedules(getCollection(data));
    } catch (err) {
      setLocalError(err.message || "Failed to fetch schedules.");
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules(selectedPatientId);
  }, [selectedPatientId, fetchSchedules]);

  const resetScheduleForm = () => {
    setForm(emptyScheduleForm);
    setEditingId(null);
  };

  const schedulePayload = () => ({
    ...form,
    end_date: form.end_date || null,
    refill_date: form.refill_date || null,
    remaining_pills: form.remaining_pills === "" ? null : Number(form.remaining_pills),
    is_active: Boolean(form.is_active),
  });

  const beginEditSchedule = (schedule) => {
    setForm({
      ...emptyScheduleForm,
      ...schedule,
      end_date: schedule.end_date || "",
      refill_date: schedule.refill_date || "",
      remaining_pills: schedule.remaining_pills ?? "",
      is_active: schedule.is_active !== false,
    });
    setEditingId(schedule.id);
    setLocalError("");
  };

  const handleSaveSchedule = async () => {
    setSaveMessage("");
    setGlobalError("");
    setLocalError("");

    if (!selectedPatientId) return setLocalError("Please select a patient.");
    if (!form.medication_name.trim() || !form.dosage.trim() || !form.scheduled_time.trim() || !form.start_date.trim()) {
      return setLocalError("Medication name, dosage, time, and start date are required.");
    }

    setSaving(true);
    try {
      await apiRequest(
        editingId
          ? `/patients/${selectedPatientId}/medication-schedules/${editingId}`
          : `/patients/${selectedPatientId}/medication-schedules`,
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(schedulePayload()),
        }
      );
      setSaveMessage(editingId ? "Medication schedule updated successfully." : "Medication schedule saved successfully.");
      resetScheduleForm();
      await Promise.all([fetchSchedules(selectedPatientId), refreshAfterScheduleChange()]);
    } catch (err) {
      setLocalError(err.message || "Unable to save medication schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Delete this medication schedule?")) return;

    setDeletingId(scheduleId);
    setLocalError("");
    try {
      await apiRequest(`/patients/${selectedPatientId}/medication-schedules/${scheduleId}`, { method: "DELETE" });
      setSaveMessage("Medication schedule deleted successfully.");
      await Promise.all([fetchSchedules(selectedPatientId), refreshAfterScheduleChange()]);
    } catch (err) {
      setLocalError(err.message || "Unable to delete medication schedule.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRecordDose = async (scheduleId, status) => {
    if (!selectedPatientId || !scheduleId) {
      setLocalError("Patient and medication schedule are required.");
      return;
    }

    const loadingKey = `${scheduleId}-${status}`;
    setDoseLoadingKey(loadingKey);
    setLocalError("");
    setSaveMessage("");

    try {
      await apiRequest("/dose-events", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(selectedPatientId),
          medication_schedule_id: scheduleId,
          status,
          event_time: formatLocalDateTime(new Date()),
          notes: `Marked as ${status} from web app`,
        }),
      });
      setSaveMessage(`Dose marked as ${status}.`);
      await Promise.all([fetchSchedules(selectedPatientId), refreshAfterDoseEvent()]);
    } catch (err) {
      setLocalError(err.message || "Unable to record dose event.");
    } finally {
      setDoseLoadingKey("");
    }
  };

  return (
    <div>
      <h2 className="page-title">Medication Schedule</h2>
      <div className="form-card medication-card">
        {localError && <p className="form-error">{localError}</p>}
        <div className="form-row">
          <label>Patient</label>
          <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
            <option value="">Select a patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>{patient.full_name || patient.name}</option>
            ))}
          </select>
        </div>

        <div className="section nested-section">
          <h3>Saved Medications</h3>
          {loadingSchedules ? (
            <p>Loading schedules...</p>
          ) : (
            <table className="medication-table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Time</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr><td colSpan="6">No medication schedules found.</td></tr>
                ) : (
                  schedules.map((item) => (
                    <tr key={item.id}>
                      <td>{item.medication_name}</td>
                      <td>{item.dosage}</td>
                      <td>{item.frequency}</td>
                      <td>{item.scheduled_time}</td>
                      <td>{item.is_active === false ? "No" : "Yes"}</td>
                      <td className="actions-cell">
                        <div className="action-btns schedule-actions">
                          {["taken", "missed", "skipped"].map((status) => (
                            <button
                              key={status}
                              className={`dose-btn dose-${status}`}
                              onClick={() => handleRecordDose(item.id, status)}
                              disabled={doseLoadingKey === `${item.id}-${status}`}
                            >
                              {doseLoadingKey === `${item.id}-${status}` ? "Saving..." : titleCase(status)}
                            </button>
                          ))}
                          <button className="secondary-btn small-btn" onClick={() => beginEditSchedule(item)}>Edit</button>
                          <button className="danger-btn small-btn" onClick={() => handleDeleteSchedule(item.id)} disabled={deletingId === item.id}>
                            {deletingId === item.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <h3>{editingId ? "Edit Schedule" : "Add Schedule"}</h3>
        <ScheduleFields form={form} updateForm={updateForm} />
        <div className="button-row">
          <button className="primary-btn" onClick={handleSaveSchedule} disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Schedule" : "Save Schedule"}
          </button>
          {editingId && <button className="secondary-btn" onClick={resetScheduleForm}>Cancel Edit</button>}
        </div>
      </div>
    </div>
  );
}

function ScheduleFields({ form, updateForm }) {
  return (
    <>
      <div className="form-grid">
        <FormInput label="Medication Name" value={form.medication_name} onChange={(value) => updateForm("medication_name", value)} />
        <FormInput label="Dosage" value={form.dosage} onChange={(value) => updateForm("dosage", value)} />
        <div className="form-row">
          <label>Frequency</label>
          <select value={form.frequency} onChange={(e) => updateForm("frequency", e.target.value)}>
            <option value="daily">Daily</option>
            <option value="twice_daily">Twice Daily</option>
            <option value="three_times_daily">Three Times Daily</option>
            <option value="weekly">Weekly</option>
            <option value="as_needed">As Needed</option>
          </select>
        </div>
        <FormInput label="Scheduled Time" type="time" value={form.scheduled_time} onChange={(value) => updateForm("scheduled_time", value)} />
        <FormInput label="Start Date" type="date" value={form.start_date} onChange={(value) => updateForm("start_date", value)} />
        <FormInput label="End Date" type="date" value={form.end_date} onChange={(value) => updateForm("end_date", value)} />
        <FormInput label="Doctor Name" value={form.doctor_name} onChange={(value) => updateForm("doctor_name", value)} />
        <FormInput label="Hospital Name" value={form.hospital_name} onChange={(value) => updateForm("hospital_name", value)} />
        <FormInput label="Remaining Pills" type="number" value={form.remaining_pills} onChange={(value) => updateForm("remaining_pills", value)} />
        <FormInput label="Refill Date" type="date" value={form.refill_date} onChange={(value) => updateForm("refill_date", value)} />
        <label className="checkbox-row">
          <input type="checkbox" checked={form.is_active} onChange={(e) => updateForm("is_active", e.target.checked)} />
          Active
        </label>
      </div>
      <FormTextarea label="Instructions" value={form.instructions} onChange={(value) => updateForm("instructions", value)} />
    </>
  );
}

function Alerts({ alerts, patients, loadingAlerts, loadAlerts, refreshAfterAlertChange }) {
  const [message, setMessage] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [filters, setFilters] = useState({ patient_id: "", type: "", is_acknowledged: "" });

  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));

  const handleAcknowledge = async (alertId) => {
    setMessage("");
    setLoadingId(alertId);

    try {
      await apiRequest(`/alerts/${alertId}/acknowledge`, { method: "PATCH" });
      setMessage("Alert acknowledged successfully.");
      await refreshAfterAlertChange();
    } catch (err) {
      setMessage(err.message || "Unable to acknowledge alert.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <h2 className="page-title">Alerts</h2>
      {message && <p className={message.includes("success") ? "form-success" : "form-error"}>{message}</p>}
      <FilterBar onApply={() => loadAlerts(filters)} onClear={() => {
        const cleared = { patient_id: "", type: "", is_acknowledged: "" };
        setFilters(cleared);
        loadAlerts(cleared);
      }}>
        <PatientSelect patients={patients} value={filters.patient_id} onChange={(value) => updateFilter("patient_id", value)} />
        <FormInput label="Type" value={filters.type} onChange={(value) => updateFilter("type", value)} />
        <div className="form-row">
          <label>Status</label>
          <select value={filters.is_acknowledged} onChange={(e) => updateFilter("is_acknowledged", e.target.value)}>
            <option value="">All</option>
            <option value="0">Active</option>
            <option value="1">Acknowledged</option>
          </select>
        </div>
      </FilterBar>
      <div className="section">
        {loadingAlerts ? (
          <p>Loading alerts...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Alert Type</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan="5">No alerts found.</td></tr>
              ) : (
                alerts.map((item) => {
                  const isDone = item.is_acknowledged || item.acknowledged_at || item.status === "acknowledged";
                  return (
                    <tr key={item.id}>
                      <td>{item.patient?.full_name || item.patient_name || "N/A"}</td>
                      <td>{item.alert_type || item.type || "N/A"}</td>
                      <td>{item.created_at || item.alert_time || "N/A"}</td>
                      <td>{isDone ? "Acknowledged" : "Active"}</td>
                      <td>
                        {isDone ? (
                          "Done"
                        ) : (
                          <button className="primary-btn small-btn" onClick={() => handleAcknowledge(item.id)} disabled={loadingId === item.id}>
                            {loadingId === item.id ? "Processing..." : "Acknowledge"}
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

function History({ history, patients, loadingHistory, loadHistory }) {
  const [filters, setFilters] = useState({ patient_id: "", status: "", date_from: "", date_to: "" });
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));

  return (
    <div>
      <h2 className="page-title">Medication History</h2>
      <FilterBar onApply={() => loadHistory(filters)} onClear={() => {
        const cleared = { patient_id: "", status: "", date_from: "", date_to: "" };
        setFilters(cleared);
        loadHistory(cleared);
      }}>
        <PatientSelect patients={patients} value={filters.patient_id} onChange={(value) => updateFilter("patient_id", value)} />
        <div className="form-row">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
            <option value="">All</option>
            <option value="taken">Taken</option>
            <option value="missed">Missed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
        <FormInput label="Date From" type="date" value={filters.date_from} onChange={(value) => updateFilter("date_from", value)} />
        <FormInput label="Date To" type="date" value={filters.date_to} onChange={(value) => updateFilter("date_to", value)} />
      </FilterBar>
      <div className="section">
        {loadingHistory ? (
          <p>Loading medication history...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Medication</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="4">No medication history found.</td></tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.patient?.full_name || item.patient?.name || item.patient_name || "N/A"}</td>
                    <td>{item.medication_schedule?.medication_name || item.medication_name || "N/A"}</td>
                    <td>{item.event_time || "N/A"}</td>
                    <td>{item.status}</td>
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

function FilterBar({ children, onApply, onClear }) {
  return (
    <div className="filter-bar">
      <div className="filter-grid">{children}</div>
      <div className="button-row">
        <button className="primary-btn small-btn" onClick={onApply}>Apply Filters</button>
        <button className="secondary-btn small-btn" onClick={onClear}>Clear</button>
      </div>
    </div>
  );
}

function PatientSelect({ patients, value, onChange }) {
  return (
    <div className="form-row">
      <label>Patient</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All patients</option>
        {patients.map((patient) => (
          <option key={patient.id} value={patient.id}>{patient.full_name || patient.name}</option>
        ))}
      </select>
    </div>
  );
}

function FormInput({ label, type = "text", value, onChange }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FormTextarea({ label, value, onChange }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>
      <p>{value === undefined || value === null || value === "" ? "N/A" : value}</p>
    </div>
  );
}

function formatLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default App;
