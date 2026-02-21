import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Cloud, ShieldCheck } from 'lucide-react';
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

// --- LÓGICA DE FECHAS (CALENDARIO REAL 2026) ---
const obtenerDiasDelMesLocal = (mesNombre, semanaNombre) => {
  const anio = new Date().getFullYear();
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
  const [errorLogin, setErrorLogin] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [mes, setMes] = useState('Febrero');
  const [semana, setSemana] = useState('Semana 1');
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [online, setOnline] = useState(false);

  const currentYear = new Date().getFullYear();
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMesLocal(mes, semana);

  useEffect(() => {
    if (isLoggedIn) {
      const asistenciaRef = ref(db, 'asistencia_canguro');
      get(asistenciaRef).then((snapshot) => {
        if (snapshot.exists()) {
          setAsistencia(snapshot.val());
          setOnline(true);
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

  const handleGuardar = async () => {
    setIsSaving(true);
    try {
      await set(ref(db, 'asistencia_canguro'), asistencia);
      alert("✅ Cambios guardados permanentemente.");
    } catch (error) {
      alert("❌ Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportarExcel = () => {
    const encabezados = ["COLABORADOR", "CÉDULA", "SRT", "SEDE", ...nombresDias.map((d, i) => `${d} ${numerosDias[i] || ''}`)];
    const filas = empleadosVisibles.map(emp => {
      const id = emp.Cedula || emp.cedula;
      const statusDias = numerosDias.map(n => asistencia[`${id}-${mes}-${semana}-${n}`] || 'LABORAL');
      return [emp.Nombre || emp.nombre, id, emp.SRT, emp.Sede, ...statusDias];
    });
    const dataFinal = [encabezados, ...filas];
    const ws = XLSStyle.utils.aoa_to_sheet(dataFinal);
    const wb = XLSStyle.utils.book_new();
    XLSStyle.utils.book_append_sheet(wb, ws, "Planificación");
    XLSStyle.writeFile(wb, `Planificacion_${mes}_${semana}.xlsx`);
  };

  const listaSRT = ['TODAS', ...new Set(empleados.map(emp => emp.SRT).filter(Boolean))];
  const listaRegiones = ['TODAS', ...new Set(empleados.filter(e => srtFiltro === 'TODAS' || e.SRT === srtFiltro).map(e => e.Region).filter(Boolean))];
  const listaSedes = ['TODAS', ...new Set(empleados.filter(e => (srtFiltro === 'TODAS' || e.SRT === srtFiltro) && (regionFiltro === 'TODAS' || e.Region === regionFiltro)).map(e => e.Sede).filter(Boolean))];

  const empleadosVisibles = empleados.filter(emp => {
    const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
    const cumpleReg = regionFiltro === 'TODAS' || emp.Region === regionFiltro;
    const cumpleSed = sedeFiltro === 'TODAS' || emp.Sede === sedeFiltro;
    const term = busqueda.toLowerCase();
    return cumpleSRT && cumpleReg && cumpleSed && ((emp.Nombre || "").toString().toLowerCase().includes(term) || (emp.Cedula || "").toString().includes(term));
  });

  if (!isLoggedIn) {
    return (
      <div style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url('/BOT.png')", backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: 'rgba(17, 17, 17, 0.9)', padding: '40px', borderRadius: '25px', border: '2px solid #FFD700', width: '350px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <img src="/logo-canguro.png" alt="Logo Canguro" style={{ width: '180px', marginBottom: '20px' }} />
          <h2 style={{ color: '#FFD700', marginBottom: '30px', fontWeight: '900' }}>SISTEMA SRT GLOBAL</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') setIsLoggedIn(true); else setErrorLogin(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Usuario" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff' }} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Password" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            {errorLogin && <p style={{ color: '#ff4444', fontSize: '12px' }}>Credenciales incorrectas</p>}
            <button style={{ padding: '15px', background: '#FFD700', color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px 25px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '40px' }} />
          <h1 style={{ color: '#FFD700', fontSize: '18px', margin: 0, fontWeight: '900' }}>CANGURO - PLANIFICACIÓN</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardar} disabled={isSaving} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Save size={16} /> GUARDAR CAMBIOS
          </button>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <FileSpreadsheet size={16} /> EXCEL
          </button>
          <button onClick={() => setIsLoggedIn(false)} style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer' }}>
              <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'MES', value: mes, func: setMes, list: MESES_ANIO },
          { label: 'SEMANA', value: semana, func: setSemana, list: SEMANAS_MES },
          { label: 'SRT', value: srtFiltro, func: (v) => {setSrtFiltro(v); setRegionFiltro('TODAS'); setSedeFiltro('TODAS');}, list: listaSRT },
          { label: 'REGIÓN', value: regionFiltro, func: (v) => {setRegionFiltro(v); setSedeFiltro('TODAS')}, list: listaRegiones },
          { label: 'SEDE', value: sedeFiltro, func: setSedeFiltro, list: listaSedes }
        ].map((f, i) => (
          <div key={i} style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
            <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{f.label}</label>
            <select value={f.value} onChange={e => f.func(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '13px' }}>
              {f.list.map(opt => <option key={opt} value={opt} style={{background:'#000'}}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>BUSCAR</label>
          <input type="text" placeholder="Nombre/Cédula..." style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '12px' }} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* TABLA CON CONTADORES */}
      <div style={{ background: '#080808', borderRadius: '15px', border: '1px solid #222', overflowX: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left', width: '250px' }}>COLABORADOR</th>
              <th style={{ width: '120px' }}>SEDE</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ width: '100px', textAlign: 'center', background: (d === 'Sábado' || d === 'Domingo') ? '#1a1a00' : 'none' }}>
                  <div style={{ fontSize: '10px', color: '#888' }}>{d}</div>
                  <div>{numerosDias[i]}</div>
                </th>
              ))}
            </tr>
            {/* --- FILA DE CONTADORES DE DÍAS LIBRES --- */}
            <tr style={{ background: '#151515', borderBottom: '1px solid #333' }}>
              <td colSpan="2" style={{ textAlign: 'right', padding: '10px', color: '#FFD700', fontWeight: 'bold', fontSize: '12px' }}>
                LIBRANDO HOY:
              </td>
              {numerosDias.map((n, i) => {
                const totalLibres = empleadosVisibles.reduce((acc, emp) => {
                  const key = `${emp.Cedula || emp.cedula}-${mes}-${semana}-${n}`;
                  return asistencia[key] === 'LIBRE' ? acc + 1 : acc;
                }, 0);
                return (
                  <td key={i} style={{ textAlign: 'center', color: '#00FF00', fontWeight: '900', fontSize: '14px' }}>
                    {totalLibres}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.Cedula || emp.cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{emp.Nombre || emp.nombre}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>ID: {id}</div>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '11px', color: '#888' }}>{emp.Sede}</td>
                  {numerosDias.map((n, i) => {
                    const keyID = `${id}-${mes}-${semana}-${n}`;
                    const val = asistencia[keyID] || 'LABORAL';
                    return (
                      <td key={i} style={{ padding: '4px' }}>
                        <select 
                          value={val} 
                          onChange={e => setAsistencia({...asistencia, [keyID]: e.target.value})}
                          style={{ 
                            width: '100%', background: '#000', border: '1px solid #333', 
                            color: val === 'LIBRE' ? '#0f0' : val === 'TIENDA CERRADA' ? '#ff0' : val === 'EGRESO' ? '#f44' : '#fff', 
                            borderRadius: '5px', fontSize: '10px', padding: '6px 2px', fontWeight: 'bold', cursor: 'pointer'
                          }}
                        >
                          <option value="LABORAL">LABORAL</option>
                          <option value="LIBRE">LIBRE</option>
                          <option value="EGRESO">EGRESO</option>
                          <option value="TIENDA CERRADA">TIENDA CERRADA</option>
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