import React, { useState } from "react";
import "./App.css";

function App() {
  const [page, setPage] = useState("login");

  const patients = [
    { id: 1, name: "John Doe", age: 78, role: "Patient", status: "Stable" },
    { id: 2, name: "Mary Smith", age: 82, role: "Patient", status: "Needs Attention" },
    { id: 3, name: "Robert Brown", age: 75, role: "Patient", status: "Stable" },
  ];

  const history = [
    { id: 1, patient: "John Doe", medication: "Aspirin", time: "8:00 AM", status: "Taken" },
    { id: 2, patient: "Mary Smith", medication: "Metformin", time: "9:00 AM", status: "Missed" },
    { id: 3, patient: "Robert Brown", medication: "Vitamin D", time: "1:00 PM", status: "Taken" },
  ];

  const alerts = [
    { id: 1, patient: "Mary Smith", alert: "Missed Dose", time: "9:00 AM" },
    { id: 2, patient: "John Doe", alert: "Refill Due", time: "Today" },
  ];

  return (
    <div className="app">
      {page !== "login" && <Navbar setPage={setPage} />}

      <div className="page-container">
        {page === "login" && <Login setPage={setPage} />}
        {page === "dashboard" && <Dashboard patients={patients} alerts={alerts} />}
        {page === "patients" && <Patients patients={patients} />}
        {page === "medications" && <Medications />}
        {page === "alerts" && <Alerts alerts={alerts} />}
        {page === "history" && <History history={history} />}
      </div>
    </div>
  );
}

function Navbar({ setPage }) {
  return (
    <nav className="navbar">
      <h1 className="logo">Smart Medication Reminder</h1>
      <div className="nav-links">
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("patients")}>Patients</button>
        <button onClick={() => setPage("medications")}>Medications</button>
        <button onClick={() => setPage("alerts")}>Alerts</button>
        <button onClick={() => setPage("history")}>History</button>
        <button onClick={() => setPage("login")}>Logout</button>
      </div>
    </nav>
  );
}

function Login({ setPage }) {
  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Welcome</h2>
        <p>Login to access the caregiver and medical support dashboard.</p>

        <input type="text" placeholder="Email address" />
        <input type="password" placeholder="Password" />

        <button className="primary-btn" onClick={() => setPage("dashboard")}>
          Log In
        </button>
      </div>
    </div>
  );
}

function Dashboard({ patients, alerts }) {
  return (
    <div>
      <h2 className="page-title">Dashboard</h2>

      <div className="cards">
        <div className="card">
          <h3>Total Patients</h3>
          <p>{patients.length}</p>
        </div>

        <div className="card">
          <h3>Missed Doses</h3>
          <p>1</p>
        </div>

        <div className="card">
          <h3>Active Alerts</h3>
          <p>{alerts.length}</p>
        </div>

        <div className="card">
          <h3>Upcoming Refills</h3>
          <p>2</p>
        </div>
      </div>

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
            {alerts.map((item) => (
              <tr key={item.id}>
                <td>{item.patient}</td>
                <td>{item.alert}</td>
                <td>{item.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Patients({ patients }) {
  return (
    <div>
      <h2 className="page-title">Patient Management</h2>

      <div className="section">
        <button className="primary-btn small-btn">+ Add Patient</button>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.name}</td>
                <td>{patient.age}</td>
                <td>{patient.role}</td>
                <td>{patient.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Medications() {
  return (
    <div>
      <h2 className="page-title">Medication Schedule</h2>

      <div className="form-card">
        <div className="form-row">
          <label>Patient Name</label>
          <input type="text" placeholder="Enter patient name" />
        </div>

        <div className="form-row">
          <label>Medication Name</label>
          <input type="text" placeholder="Enter medication name" />
        </div>

        <div className="form-row">
          <label>Dosage</label>
          <input type="text" placeholder="Example: 100mg" />
        </div>

        <div className="form-row">
          <label>Frequency</label>
          <select>
            <option>Once Daily</option>
            <option>Twice Daily</option>
            <option>Three Times Daily</option>
          </select>
        </div>

        <div className="form-row">
          <label>Time</label>
          <input type="time" />
        </div>

        <div className="form-row">
          <label>Instructions</label>
          <textarea placeholder="Enter medication instructions"></textarea>
        </div>

        <button className="primary-btn">Save Schedule</button>
      </div>
    </div>
  );
}

function Alerts({ alerts }) {
  return (
    <div>
      <h2 className="page-title">Alerts</h2>

      <div className="section">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Alert Type</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((item) => (
              <tr key={item.id}>
                <td>{item.patient}</td>
                <td>{item.alert}</td>
                <td>{item.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function History({ history }) {
  return (
    <div>
      <h2 className="page-title">Medication History</h2>

      <div className="section">
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
            {history.map((item) => (
              <tr key={item.id}>
                <td>{item.patient}</td>
                <td>{item.medication}</td>
                <td>{item.time}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;