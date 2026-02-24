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
  const [mes, setMes] = useState('Febrero');
  const [semana, setSemana] = useState('Semana 1');
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});
  const [celdasBloqueadas, setCeldasBloqueadas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const anioActual = new Date().getFullYear();
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
      alert("✅ Planificación guardada y protegida.");
    } catch (error) {
      alert("❌ Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportarExcel = () => {
    const encabezados = ["COLABORADOR", "CÉDULA", "SRT", "SEDE", ...nombresDias.map((d, i) => `${d} ${numerosDias[i]}`)];
    const filas = empleadosVisibles.map(emp => {
      const id = emp.Cedula || emp.cedula;
      const statusDias = numerosDias.map(n => asistencia[`${id}-${mes}-${semana}-${n}`] || 'LABORAL');
      return [emp.Nombre || emp.nombre, id, emp.SRT, emp.Sede, ...statusDias];
    });
    const ws = XLSStyle.utils.aoa_to_sheet([encabezados, ...filas]);
    const wb = XLSStyle.utils.book_new();
    XLSStyle.utils.book_append_sheet(wb, ws, "Planificación");
    XLSStyle.writeFile(wb, `Planificacion_Canguro_${mes}_${semana}.xlsx`);
  };

  const listaSRT = ['TODAS', ...new Set(empleados.map(emp => emp.SRT).filter(Boolean))];
  const listaSedes = ['TODAS', ...new Set(empleados.filter(e => srtFiltro === 'TODAS' || e.SRT === srtFiltro).map(e => e.Sede).filter(Boolean))];

  const empleadosVisibles = empleados.filter(emp => {
    const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
    const cumpleSed = sedeFiltro === 'TODAS' || emp.Sede === sedeFiltro;
    const term = busqueda.toLowerCase();
    return cumpleSRT && cumpleSed && ((emp.Nombre || "").toString().toLowerCase().includes(term) || (emp.Cedula || "").toString().includes(term));
  });

  if (!isLoggedIn) {
    return (
      <div style={{ 
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url('/BOT.png')", 
        backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', 
        display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' 
      }}>
        <div style={{ background: 'rgba(17, 17, 17, 0.9)', padding: '40px', borderRadius: '25px', border: '2px solid #FFD700', width: '340px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ width: '160px', marginBottom: '20px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '18px', marginBottom: '30px', fontWeight: '900' }}>SISTEMA RRHH</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') setIsLoggedIn(true); else alert('Error'); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Usuario" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: '#fff' }} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Password" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: '#fff' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            <button style={{ padding: '15px', background: '#FFD700', color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>ACCEDER</button>
          </form>
          <div style={{ marginTop: '20px', color: '#666', fontSize: '10px' }}>Dirección de Recursos Humanos - {anioActual}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '35px' }} />
          <h1 style={{ color: '#FFD700', fontSize: '16px', margin: 0, fontWeight: 'bold' }}>PLANIFICACIÓN {anioActual}</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleGuardarYBloquear} disabled={isSaving} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px' }}>
            <Save size={16} /> {isSaving ? '...' : 'GUARDAR Y BLOQUEAR'}
          </button>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px' }}>
            <FileSpreadsheet size={16} /> EXPORTAR
          </button>
          <button onClick={() => window.location.reload()} style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}><LogOut size={16} /></button>
        </div>
      </header>

      {/* FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'MES', v: mes, f: setMes, l: MESES_ANIO },
          { label: 'SEMANA', v: semana, f: setSemana, l: SEMANAS_MES },
          { label: 'SRT', v: srtFiltro, f: (v) => {setSrtFiltro(v); setSedeFiltro('TODAS');}, l: listaSRT },
          { label: 'SEDE', v: sedeFiltro, f: setSedeFiltro, l: listaSedes }
        ].map((f, i) => (
          <div key={i} style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
            <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{f.label}</label>
            <select value={f.v} onChange={e => f.f(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '13px' }}>
              {f.l.map(o => <option key={o} value={o} style={{background:'#111'}}>{o}</option>)}
            </select>
          </div>
        ))}
        <div style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={16} color="#FFD700" />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none' }} />
        </div>
      </div>

      {/* TABLA */}
      <div style={{ background: '#111', borderRadius: '20px', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700' }}>
              <th style={{ padding: '18px', textAlign: 'left', width: '250px' }}>COLABORADOR</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', opacity: 0.5 }}>{d}</div>
                  <div style={{ fontSize: '13px' }}>{numerosDias[i]}</div>
                </th>
              ))}
            </tr>
            <tr style={{ background: '#050505', borderBottom: '2px solid #FFD700' }}>
              <td style={{ textAlign: 'right', padding: '10px', color: '#FFD700', fontWeight: '900' }}>LIBRANDO HOY:</td>
              {numerosDias.map((n, i) => {
                const count = empleadosVisibles.reduce((acc, emp) => {
                  const key = `${emp.Cedula || emp.cedula}-${mes}-${semana}-${n}`;
                  return asistencia[key] === 'LIBRE' ? acc + 1 : acc;
                }, 0);
                return <td key={i} style={{ textAlign: 'center', color: '#00FF00', fontWeight: '900', fontSize: '16px' }}>{count}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.Cedula || emp.cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{emp.Nombre || emp.nombre}</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>{emp.Sede} | {id}</div>
                  </td>
                  {numerosDias.map((n, i) => {
                    const k = `${id}-${mes}-${semana}-${n}`;
                    const val = asistencia[k] || 'LABORAL';
                    const locked = celdasBloqueadas.includes(k);
                    return (
                      <td key={i} style={{ padding: '5px', position: 'relative' }}>
                        <select value={val} disabled={locked} onChange={e => setAsistencia({...asistencia, [k]: e.target.value})} style={{ 
                          width: '100%', padding: '8px', borderRadius: '8px', fontSize: '10px', background: locked ? '#000' : '#1a1a1a',
                          color: locked ? '#444' : (val==='LIBRE'?'#0f0':val==='EGRESO'?'#f44':'#fff'), border: locked ? '1px solid #222' : '1px solid #444',
                          cursor: locked ? 'not-allowed' : 'pointer', fontWeight: 'bold', textAlign: 'center'
                        }}>
                          <option value="LABORAL">LABORAL</option>
                          <option value="LIBRE">LIBRE</option>
                          <option value="EGRESO">EGRESO</option>
                          <option value="TIENDA CERRADA">TIENDA CERRADA</option>
                        </select>
                        {locked && <Lock size={8} style={{ position: 'absolute', top: '5px', right: '5px', color: '#FFD700', opacity: 0.5 }} />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <footer style={{ marginTop: '30px', textAlign: 'center', color: '#444', fontSize: '11px' }}>
        Dirección de Recursos Humanos - Canguro Venezuela {anioActual}
      </footer>
    </div>
  );
};

export default App;