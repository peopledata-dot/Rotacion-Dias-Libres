import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Lock, Search } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA0D6uB6dID2UySULeacwMsUxO-HUL5Qc4",
  authDomain: "rotacion-dias-libres-canguro.firebaseapp.com",
  databaseURL: "https://rotacion-dias-libres-canguro-default-rtdb.firebaseio.com", 
  projectId: "rotacion-dias-libres-canguro",
  storageBucket: "rotacion-dias-libres-canguro.firebasestorage.app",
  messagingSenderId: "545579480005",
  appId: "1:545579480005:web:d5208e164ed992b32051ac"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- LÓGICA DE CALENDARIO 2026 ---
const obtenerDiasDelMesLocal = (mesNombre, semanaNombre) => {
  const anio = 2026;
  const mesesNum = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
    'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };
  const mesIndex = mesesNum[mesNombre];
  const numSemana = parseInt(semanaNombre.split(' ')[1]);
  const primerDiaMes = new Date(anio, mesIndex, 1);
  const ajusteLunes = (primerDiaMes.getDay() === 0 ? 6 : primerDiaMes.getDay() - 1);
  const inicioSemana = new Date(anio, mesIndex, 1 - ajusteLunes + (numSemana - 1) * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana);
    dia.setDate(inicioSemana.getDate() + i);
    return dia.getDate();
  });
};

const MESES_ANIO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SEMANAS_MES = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ usuario: '', password: '' });
  const [empleados, setEmpleados] = useState([]);
  
  // Filtros
  const [mes, setMes] = useState('Febrero');
  const [semana, setSemana] = useState('Semana 1');
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  
  // Datos y Bloqueo
  const [asistencia, setAsistencia] = useState({});
  const [celdasBloqueadas, setCeldasBloqueadas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const numerosDias = obtenerDiasDelMesLocal(mes, semana);
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    if (isLoggedIn) {
      const asistenciaRef = ref(db, 'asistencia_canguro');
      get(asistenciaRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setAsistencia(data);
          const llavesGuardadas = Object.keys(data).filter(key => data[key] !== 'LABORAL');
          setCeldasBloqueadas(llavesGuardadas);
        }
      });

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

  const handleGuardarYBloquear = async () => {
    setIsSaving(true);
    try {
      await set(ref(db, 'asistencia_canguro'), asistencia);
      const nuevasBloqueadas = Object.keys(asistencia).filter(k => asistencia[k] !== 'LABORAL');
      setCeldasBloqueadas(nuevasBloqueadas);
      alert("✅ Cambios guardados y celdas bloqueadas.");
    } catch (error) {
      alert("❌ Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- LÓGICA DE LISTAS DESPLEGABLES PARA FILTROS ---
  const listaSRT = ['TODAS', ...new Set(empleados.map(emp => emp.SRT).filter(Boolean))];
  const listaSedes = ['TODAS', ...new Set(empleados.filter(e => srtFiltro === 'TODAS' || e.SRT === srtFiltro).map(e => e.Sede).filter(Boolean))];

  const empleadosVisibles = empleados.filter(emp => {
    const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
    const cumpleSed = sedeFiltro === 'TODAS' || emp.Sede === sedeFiltro;
    const term = busqueda.toLowerCase();
    const cumpleBusqueda = (emp.Nombre || "").toString().toLowerCase().includes(term) || (emp.Cedula || "").toString().includes(term);
    return cumpleSRT && cumpleSed && cumpleBusqueda;
  });

  if (!isLoggedIn) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#111', padding: '40px', borderRadius: '20px', border: '2px solid #FFD700', width: '320px', textAlign: 'center' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ width: '150px', marginBottom: '20px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '20px' }}>SISTEMA DE PLANIFICACIÓN</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') setIsLoggedIn(true); else alert('Credenciales incorrectas'); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Usuario" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Contraseña" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            <button style={{ padding: '12px', background: '#FFD700', color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '30px' }} />
          <span style={{ color: '#FFD700', fontWeight: 'bold' }}>PLANIFICACIÓN SRT 2026</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardarYBloquear} disabled={isSaving} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            <Save size={14} /> {isSaving ? 'GUARDANDO...' : 'GUARDAR Y BLOQUEAR'}
          </button>
          <button onClick={() => window.location.reload()} style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><LogOut size={14} /></button>
        </div>
      </header>

      {/* FILTROS (Restaurados) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '20px' }}>
        <div style={{ background: '#111', padding: '10px', borderRadius: '10px', border: '1px solid #222' }}>
          <label style={{ fontSize: '10px', color: '#FFD700', fontWeight: 'bold' }}>MES</label>
          <select value={mes} onChange={e => setMes(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none' }}>
            {MESES_ANIO.map(m => <option key={m} value={m} style={{background:'#111'}}>{m}</option>)}
          </select>
        </div>
        <div style={{ background: '#111', padding: '10px', borderRadius: '10px', border: '1px solid #222' }}>
          <label style={{ fontSize: '10px', color: '#FFD700', fontWeight: 'bold' }}>SEMANA</label>
          <select value={semana} onChange={e => setSemana(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none' }}>
            {SEMANAS_MES.map(s => <option key={s} value={s} style={{background:'#111'}}>{s}</option>)}
          </select>
        </div>
        <div style={{ background: '#111', padding: '10px', borderRadius: '10px', border: '1px solid #222' }}>
          <label style={{ fontSize: '10px', color: '#FFD700', fontWeight: 'bold' }}>SRT</label>
          <select value={srtFiltro} onChange={e => {setSrtFiltro(e.target.value); setSedeFiltro('TODAS');}} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none' }}>
            {listaSRT.map(s => <option key={s} value={s} style={{background:'#111'}}>{s}</option>)}
          </select>
        </div>
        <div style={{ background: '#111', padding: '10px', borderRadius: '10px', border: '1px solid #222' }}>
          <label style={{ fontSize: '10px', color: '#FFD700', fontWeight: 'bold' }}>SEDE</label>
          <select value={sedeFiltro} onChange={e => setSedeFiltro(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none' }}>
            {listaSedes.map(s => <option key={s} value={s} style={{background:'#111'}}>{s}</option>)}
          </select>
        </div>
        <div style={{ background: '#111', padding: '10px', borderRadius: '10px', border: '1px solid #222', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={14} color="#FFD700" />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '13px' }} />
        </div>
      </div>

      {/* TABLA */}
      <div style={{ background: '#111', borderRadius: '15px', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left', width: '220px' }}>COLABORADOR</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ textAlign: 'center', padding: '10px' }}>
                  <div style={{ fontSize: '9px', opacity: 0.6 }}>{d}</div>
                  <div>{numerosDias[i]}</div>
                </th>
              ))}
            </tr>
            <tr style={{ background: '#080808' }}>
              <td style={{ textAlign: 'right', padding: '10px', color: '#FFD700', fontWeight: 'bold' }}>LIBRANDO HOY:</td>
              {numerosDias.map((n, i) => {
                const count = empleadosVisibles.reduce((acc, emp) => {
                  const key = `${emp.Cedula || emp.cedula}-${mes}-${semana}-${n}`;
                  return asistencia[key] === 'LIBRE' ? acc + 1 : acc;
                }, 0);
                return <td key={i} style={{ textAlign: 'center', color: '#00FF00', fontWeight: 'bold', fontSize: '14px' }}>{count}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.Cedula || emp.cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{emp.Nombre || emp.nombre}</div>
                    <div style={{ fontSize: '9px', color: '#666' }}>{emp.Sede} | {emp.SRT}</div>
                  </td>
                  {numerosDias.map((n, i) => {
                    const keyID = `${id}-${mes}-${semana}-${n}`;
                    const val = asistencia[keyID] || 'LABORAL';
                    const estaBloqueada = celdasBloqueadas.includes(keyID);

                    return (
                      <td key={i} style={{ padding: '4px', position: 'relative' }}>
                        <select 
                          value={val} 
                          disabled={estaBloqueada}
                          onChange={e => setAsistencia({...asistencia, [keyID]: e.target.value})}
                          style={{ 
                            width: '100%', padding: '6px', borderRadius: '5px', fontSize: '10px',
                            background: estaBloqueada ? '#000' : '#1a1a1a',
                            color: estaBloqueada ? '#555' : (val === 'LIBRE' ? '#0f0' : '#fff'),
                            border: estaBloqueada ? '1px solid #333' : '1px solid #444',
                            cursor: estaBloqueada ? 'not-allowed' : 'pointer',
                            appearance: 'none', textAlign: 'center'
                          }}
                        >
                          <option value="LABORAL">LABORAL</option>
                          <option value="LIBRE">LIBRE</option>
                          <option value="EGRESO">EGRESO</option>
                          <option value="TIENDA CERRADA">TIENDA CERRADA</option>
                        </select>
                        {estaBloqueada && <Lock size={8} style={{ position: 'absolute', top: '5px', right: '5px', color: '#FFD700', opacity: 0.6 }} />}
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