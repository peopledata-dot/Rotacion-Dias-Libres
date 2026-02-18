import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, RefreshCw, Cloud } from 'lucide-react';
import { obtenerDiasDelMes } from './fechas';

// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  databaseURL: "https://tu-proyecto.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "12345",
  appId: "1:12345:web:6789"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// ---------------------------------

const MESES_ANIO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SEMANAS_MES = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ usuario: '', password: '' });
  const [empleados, setEmpleados] = useState([]);
  const [mes, setMes] = useState('Febrero');
  const [semana, setSemana] = useState('Semana 1');
  const [asistencia, setAsistencia] = useState({});
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMes(mes, semana);

  // 1. ESCUCHAR CAMBIOS EN TIEMPO REAL (Para ver lo que otros hacen)
  useEffect(() => {
    if (isLoggedIn) {
      const asistenciaRef = ref(db, 'planificacion_global');
      onValue(asistenciaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) setAsistencia(data);
      });
    }
  }, [isLoggedIn]);

  // 2. CARGAR PERSONAL DESDE GOOGLE SHEETS
  useEffect(() => {
    if (isLoggedIn) {
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/19i5pwrIx8RX0P2OkE1qY2o5igKvvv2hxUuvb9jM_8LE/gviz/tq?tqx=out:json&gid=839594636';
      fetch(SHEET_URL)
        .then(res => res.text())
        .then(text => {
          const json = JSON.parse(text.substr(47).slice(0, -2));
          const data = json.table.rows.map(row => {
            const obj = {};
            json.table.cols.forEach((col, i) => {
              let val = row.c[i] ? row.c[i].v : '';
              let key = col.label || `col_${i}`;
              if (i === 7) key = "Sede"; 
              if (i === 17) key = "SRT";
              obj[key] = val;
            });
            return obj;
          });
          setEmpleados(data.filter(e => (e.Estatus || "").toString().toUpperCase() !== "EGRESO"));
        });
    }
  }, [isLoggedIn]);

  // 3. GUARDADO PERMANENTE PARA TODOS
  const handleGuardarGlobal = async () => {
    setCargando(true);
    try {
      await set(ref(db, 'planificacion_global'), asistencia);
      alert("¡SINCRONIZADO! Ahora todos los usuarios verán estos cambios.");
    } catch (error) {
      alert("Error al sincronizar: " + error.message);
    }
    setCargando(false);
  };

  const empleadosVisibles = empleados.filter(emp => {
    const term = busqueda.toLowerCase();
    return (emp.Nombre || "").toLowerCase().includes(term) || (emp.cedula || "").toString().includes(term);
  });

  if (!isLoggedIn) {
    return (
      <div style={{ background: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button onClick={() => setIsLoggedIn(true)} style={{ padding: '20px', background: '#FFD700', fontWeight: 'bold' }}>INGRESAR AL SISTEMA GLOBAL</button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#fff', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cloud color="#00FF00" />
          <h1 style={{ color: '#FFD700', fontSize: '18px' }}>SISTEMA SINCRONIZADO CANGURO</h1>
        </div>
        <button onClick={handleGuardarGlobal} disabled={cargando} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
          {cargando ? 'SINCRONIZANDO...' : 'GUARDAR PARA TODOS'}
        </button>
      </header>

      {/* SELECTORES DE MES Y SEMANA */}
      <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
          <select value={mes} onChange={e => setMes(e.target.value)} style={{background: '#111', color: '#fff', padding: '10px'}}>{MESES_ANIO.map(m => <option key={m} value={m}>{m}</option>)}</select>
          <select value={semana} onChange={e => setSemana(e.target.value)} style={{background: '#111', color: '#fff', padding: '10px'}}>{SEMANAS_MES.map(s => <option key={s} value={s}>{s}</option>)}</select>
          <input type="text" placeholder="Buscar..." onChange={e => setBusqueda(e.target.value)} style={{padding: '10px', borderRadius: '5px'}} />
      </div>

      <div style={{ overflowX: 'auto', background: '#080808', borderRadius: '15px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>PERSONAL COMPLETOS</th>
              {numerosDias.map((n, i) => <th key={i}>{nombresDias[i]} {n}</th>)}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.cedula || emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '10px' }}>{emp.Nombre || emp.nombre} <br/> <small style={{color: '#777'}}>{emp.Sede}</small></td>
                  {numerosDias.map((n, i) => {
                    const key = `${id}-${mes}-${semana}-${n}`;
                    const val = asistencia[key] || 'LABORAL';
                    return (
                      <td key={i}>
                        <select 
                          value={val} 
                          onChange={e => setAsistencia({...asistencia, [key]: e.target.value})}
                          style={{ background: '#000', color: val === 'LIBRE' ? '#00FF00' : '#fff', border: '1px solid #333', padding: '5px' }}
                        >
                          <option value="LABORAL">LABORAL</option>
                          <option value="LIBRE">LIBRE</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;