import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!token) return;

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    setGlobalError("");

    setLoadingPatients(true);
    fetch(`${API_BASE_URL}/patients?per_page=10`, { headers })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load patients");
        return data;
      })
      .then((data) => {
        const patientList = data.data || data || [];
        setPatients(patientList);
        if (patientList.length > 0 && !selectedPatientId) {
          setSelectedPatientId(String(patientList[0].id));
        }
      })
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingPatients(false));

    setLoadingAlerts(true);
    fetch(`${API_BASE_URL}/alerts?per_page=10`, { headers })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load alerts");
        return data;
      })
      .then((data) => setAlerts(data.data || data || []))
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingAlerts(false));

    setLoadingHistory(true);
    fetch(`${API_BASE_URL}/medication-history?per_page=10`, { headers })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load history");
        return data;
      })
      .then((data) => setHistory(data.data || data || []))
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingHistory(false));

    setLoadingSummary(true);
    fetch(`${API_BASE_URL}/dashboard/summary`, { headers })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load dashboard summary");
        return data;
      })
      .then((data) => setSummary(data))
      .catch((err) => setGlobalError(err.message))
      .finally(() => setLoadingSummary(false));
  }, [token, selectedPatientId]);

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      // ignore logout backend errors for now
    } finally {
      localStorage.removeItem("token");
      setToken("");
      setPatients([]);
      setHistory([]);
      setAlerts([]);
      setSummary(null);
      setPage("login");
    }
  };

  return (
    <div className="app">
      {page !== "login" && page !== "signup" && (
        <Navbar setPage={setPage} onLogout={handleLogout} />
      )}

      <div className="page-container">
        {globalError && (
          <p style={{ color: "red", marginBottom: "15px" }}>{globalError}</p>
        )}

        {saveMessage && (
          <p style={{ color: "green", marginBottom: "15px" }}>{saveMessage}</p>
        )}

        {page === "login" && (
          <Login
            setPage={setPage}
            setToken={setToken}
            setGlobalError={setGlobalError}
          />
        )}

        {page === "signup" && <Signup setPage={setPage} />}

        {page === "dashboard" && (
          <Dashboard
            patients={patients}
            alerts={alerts}
            summary={summary}
            loadingSummary={loadingSummary}
          />
        )}

        {page === "patients" && (
          <Patients
  patients={patients}
  loadingPatients={loadingPatients}
  token={token}
/>
        )}

        {page === "medications" && (
          <Medications
            token={token}
            patients={patients}
            selectedPatientId={selectedPatientId}
            setSelectedPatientId={setSelectedPatientId}
            setSaveMessage={setSaveMessage}
            setGlobalError={setGlobalError}
          />
        )}

        {page === "alerts" && (
  <Alerts
    alerts={alerts}
    loadingAlerts={loadingAlerts}
    token={token}
  />
)}

        {page === "history" && (
          <History history={history} loadingHistory={loadingHistory} />
        )}
      </div>
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
  const [email, setEmail] = useState("caregiver@example.com");
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
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      if (!data.token) {
        setError("No token returned from server.");
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setPage("dashboard");
    } catch (err) {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Welcome</h2>
        <p>Login to access the caregiver and medical support dashboard.</p>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

        <button className="primary-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Logging In..." : "Log In"}
        </button>

        <p style={{ marginTop: "15px" }}>Don't have an account?</p>
        <button className="primary-btn" onClick={() => setPage("signup")}>
          Sign Up
        </button>
      </div>
    </div>
  );
}
function Signup({ setPage }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");

    // Validation
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: fullName,
          email: email,
          password: password,
          password_confirmation: password,
          role: "caregiver",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Signup failed.");
        return;
      }

      // Success
      alert("Account created successfully. Please log in.");
      setPage("login");

    } catch (err) {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Create Account</h2>
        <p>Sign up to access the Smart Medication Reminder System.</p>

        <input
          type="text"
          placeholder="Full Name *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password * (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p style={{ color: "red", marginTop: "10px" }}>{error}</p>
        )}

        <button
          className="primary-btn"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </button>

        <p style={{ marginTop: "15px" }}>Already have an account?</p>
        <button
          className="primary-btn"
          onClick={() => setPage("login")}
        >
          Back to Login
        </button>
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
          <div className="card">
            <h3>Total Patients</h3>
            <p>{summary?.total_patients ?? patients.length}</p>
          </div>

          <div className="card">
            <h3>Missed Doses</h3>
            <p>{summary?.missed_doses ?? 0}</p>
          </div>

          <div className="card">
            <h3>Active Alerts</h3>
            <p>{summary?.active_alerts ?? alerts.length}</p>
          </div>

          <div className="card">
            <h3>Upcoming Refills</h3>
            <p>{summary?.upcoming_refills ?? 0}</p>
          </div>
        </div>
      )}

      <div className="section">
        <h3>Recent Alerts</h3>
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Alert</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 ? (
              <tr>
                <td colSpan="3">No alerts found.</td>
              </tr>
            ) : (
              alerts.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.patient?.full_name || item.patient || "N/A"}</td>
                  <td>{item.alert_type || item.alert || "N/A"}</td>
                  <td>{item.created_at || item.time || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Patients({ patients, loadingPatients, token }) {
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [status, setStatus] = useState("stable");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreatePatient = async () => {
    if (!fullName.trim()) {
      alert("Patient name is required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          age: age ? Number(age) : null,
          gender,
          status,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to create patient.");
        return;
      }

      alert("Patient created successfully.");
      window.location.reload();
    } catch (err) {
      alert("Unable to connect to server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Patient Management</h2>

      <div className="section">
        <button
          className="primary-btn small-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Add Patient"}
        </button>

        {showForm && (
          <div className="form-card" style={{ marginBottom: "20px" }}>
            <div className="form-row">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter patient full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Age</label>
              <input
                type="number"
                placeholder="Enter age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-row">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="stable">Stable</option>
                <option value="needs_attention">Needs Attention</option>
              </select>
            </div>

            <div className="form-row">
              <label>Notes</label>
              <textarea
                placeholder="Enter notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            <button
              className="primary-btn"
              onClick={handleCreatePatient}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Patient"}
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
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan="4">No patients found.</td>
                </tr>
              ) : (
                patients.map((patient, index) => (
                  <tr key={patient.id || index}>
                    <td>{patient.full_name || patient.name}</td>
                    <td>{patient.age ?? "N/A"}</td>
                    <td>{patient.status}</td>
                    <td>{patient.gender || "N/A"}</td>
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

function Medications({
  token,
  patients,
  selectedPatientId,
  setSelectedPatientId,
  setSaveMessage,
  setGlobalError,
}) {
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [scheduledTime, setScheduledTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveSchedule = async () => {
    setSaveMessage("");
    setGlobalError("");

    if (!selectedPatientId) {
      setGlobalError("Please select a patient.");
      return;
    }

    if (!medicationName.trim() || !dosage.trim() || !scheduledTime.trim() || !startDate.trim()) {
      setGlobalError("Medication name, dosage, time, and start date are required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/patients/${selectedPatientId}/medication-schedules`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            medication_name: medicationName,
            dosage,
            frequency,
            scheduled_time: scheduledTime,
            instructions,
            start_date: startDate,
            end_date: endDate || null,
            is_active: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setGlobalError(data.message || "Failed to save medication schedule.");
        return;
      }

      setSaveMessage("Medication schedule saved successfully.");
      setMedicationName("");
      setDosage("");
      setFrequency("daily");
      setScheduledTime("");
      setInstructions("");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setGlobalError("Unable to connect to server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="page-title">Medication Schedule</h2>

      <div className="form-card">
        <div className="form-row">
          <label>Patient</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            <option value="">Select a patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name || patient.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Medication Name</label>
          <input
            type="text"
            placeholder="Enter medication name"
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Dosage</label>
          <input
            type="text"
            placeholder="Example: 100mg"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="twice_daily">Twice Daily</option>
            <option value="three_times_daily">Three Times Daily</option>
          </select>
        </div>

        <div className="form-row">
          <label>Scheduled Time</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Instructions</label>
          <textarea
            placeholder="Enter medication instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          ></textarea>
        </div>

        <div className="form-row">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button className="primary-btn" onClick={handleSaveSchedule} disabled={saving}>
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}

function Alerts({ alerts, loadingAlerts, token }) {
  const [message, setMessage] = useState("");
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const handleAcknowledge = async (alertId) => {
    setMessage("");
    setAcknowledgingId(alertId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/alerts/${alertId}/acknowledge`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to acknowledge alert.");
        return;
      }

      setMessage("Alert acknowledged successfully.");

      // Simple refresh so updated alert status shows
      window.location.reload();
    } catch (err) {
      setMessage("Unable to connect to server.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div>
      <h2 className="page-title">Alerts</h2>

      {message && (
        <p style={{ color: message.includes("successfully") ? "green" : "red" }}>
          {message}
        </p>
      )}

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
                <tr>
                  <td colSpan="5">No alerts found.</td>
                </tr>
              ) : (
                alerts.map((item, index) => {
                  const isAcknowledged =
                    item.is_acknowledged ||
                    item.acknowledged_at ||
                    item.status === "acknowledged";

                  return (
                    <tr key={item.id || index}>
                      <td>{item.patient?.full_name || "N/A"}</td>
                      <td>{item.alert_type || item.type || item.alert || "N/A"}</td>
                      <td>{item.created_at || item.alert_time || item.time || "N/A"}</td>
                      <td>{isAcknowledged ? "Acknowledged" : "Active"}</td>
                      <td>
                        {isAcknowledged ? (
                          "Done"
                        ) : (
                          <button
                            className="primary-btn small-btn"
                            onClick={() => handleAcknowledge(item.id)}
                            disabled={acknowledgingId === item.id}
                          >
                            {acknowledgingId === item.id
                              ? "Acknowledging..."
                              : "Acknowledge"}
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

export default App;