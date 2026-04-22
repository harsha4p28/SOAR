import { useState } from 'react';
import { useSoar } from '../context/SoarContext';
import { focusOutput } from '../utils/focusOutput';

const defaultLabPayload = {
  target: 'http://127.0.0.1:5055',
  attack: 'sqli',
};

function LabPage() {
  const { setStatus } = useSoar();
  const [payload, setPayload] = useState(defaultLabPayload);
  const [result, setResult] = useState(null);

  async function triggerAttack() {
    try {
      const response = await fetch(`${payload.target}/demo/attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack: payload.attack }),
      });
      const data = await response.json();
      setResult(data);
      setStatus(`Demo attack ${payload.attack} executed against vulnerable app.`);
      focusOutput('lab-response-output');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function enableSecureMode() {
    try {
      const response = await fetch(`${payload.target}/demo/remediate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setResult(data);
      setStatus('Secure mode enabled in vulnerable app. Attack paths now use corrective handlers.');
      focusOutput('lab-response-output');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function resetLabMode() {
    try {
      const response = await fetch(`${payload.target}/demo/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setResult(data);
      setStatus('Lab reset to vulnerable mode.');
      focusOutput('lab-response-output');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="grid two-cols">
      <article className="card">
        <h2>Vulnerability Lab Trigger</h2>
        <p>Use this page to fire intentional attacks against the demo vulnerable app integrated with SOAR ingestion.</p>
        <label>Vulnerable App Base URL</label>
        <input
          value={payload.target}
          onChange={(event) => setPayload({ ...payload, target: event.target.value })}
        />
        <label>Attack Type</label>
        <select
          value={payload.attack}
          onChange={(event) => setPayload({ ...payload, attack: event.target.value })}
        >
          <option value="sqli">SQL Injection Probe</option>
          <option value="xss">Cross-Site Scripting Probe</option>
          <option value="ssrf">SSRF Probe</option>
        </select>
        <button onClick={triggerAttack}>Trigger Attack</button>
        <button onClick={enableSecureMode}>Enable Corrective Changes</button>
        <button onClick={resetLabMode}>Reset to Vulnerable Mode</button>
      </article>

      <article className="card focus-target" id="lab-response-output" tabIndex="-1">
        <h2>Last Lab Response</h2>
        {result ? <pre className="json-box">{JSON.stringify(result, null, 2)}</pre> : <p>No attack triggered yet.</p>}
      </article>
    </section>
  );
}

export default LabPage;
