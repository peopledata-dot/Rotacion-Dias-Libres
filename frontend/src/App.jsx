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
  const [semana, setSemana] = useState('Semana 5');
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});
  const [celdasBloqueadas, setCeldasBloqueadas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const anioActual = 2026;
  const numerosDias = obtenerDiasDelMesLocal(mes, semana);
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    if (isLoggedIn) {
      // 1. CARGAR ASISTENCIA
      get(ref(db, 'asistencia_canguro')).then((snapshot) => {
        if (snapshot.exists()) setAsistencia(snapshot.val());
      });

      // 2. CARGAR BLOQUEOS (La lista maestra que no se borra)
      get(ref(db, 'celdas_bloqueadas_perm')).then((snapshot) => {
        if (snapshot.exists()) setCeldasBloqueadas(snapshot.val());
      });

      // 3. CARGAR GOOGLE SHEETS
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/19i5pwrIx8RX0P2OkE1qY2o5igKvvv2hxUuvb9jM_8LE/gviz/tq?tqx=out:json&gid=839594636';
      fetch(SHEET_URL)
        .then(res => res.text())
        .then(text => {
          const json = JSON.parse(text.substr(47).slice(0, -2));
          const data = json.table.rows.map(row => {
            const c = row.c;
            return {
              Nombre: c[0] ? c[0].v : '',    // Columna A
              Cedula: c[1] ? c[1].v : '',    // Columna B
              Estatus: c[6] ? c[6].v : '',   // Columna G
              Sede: c[7] ? c[7].v : '',      // Columna H
              Region: c[8] ? c[8].v : '',    // Columna I
              SRT: c[17] ? c[17].v : ''      // Columna R
            };
          });
          setEmpleados(data.filter(e => e.Nombre && e.Nombre !== "Nombre" && (e.Estatus || "").toString().toUpperCase() !== "EGRESO"));
        });
    }
  }, [isLoggedIn]);

  const handleGuardarYBloquear = async () => {
    setIsSaving(true);
    try {
      // Guardar datos actuales
      await set(ref(db, 'asistencia_canguro'), asistencia);
      
      // Obtener qué celdas tienen algo distinto a LABORAL en este momento
      const nuevasParaBloquear = Object.keys(asistencia).filter(k => asistencia[k] !== 'LABORAL');
      
      // Unir con las que ya estaban bloqueadas anteriormente (para que nunca se pierda un bloqueo)
      const listaFinal = [...new Set([...celdasBloqueadas, ...nuevasParaBloquear])];
      
      await set(ref(db, 'celdas_bloqueadas_perm'), listaFinal);
      setCeldasBloqueadas(listaFinal);
      
      alert("✅ Guardado con éxito. El personal asignado ha quedado bloqueado.");
    } catch (e) {
      alert("❌ Error de conexión.");
    } finally {
      setIsSaving(false);
    }
  };

  // ... (Resto de funciones: exportarExcel y filtros se mantienen igual que en tu código)
  const exportarExcel = () => {
    const encabezados = ["NOMBRE", "CEDULA", "REGION", "SRT", "SEDE", ...nombresDias.map((d, i) => `${d} ${numerosDias[i]}`)];
    const filas = empleadosVisibles.map(emp => {
      const id = emp.Cedula;
      const statusDias = numerosDias.map(n => asistencia[`${id}-${mes}-${semana}-${n}`] || 'LABORAL');
      return [emp.Nombre, id, emp.Region, emp.SRT, emp.Sede, ...statusDias];
    });
    const ws = XLSStyle.utils.aoa_to_sheet([encabezados, ...filas]);
    const wb = XLSStyle.utils.book_new();
    XLSStyle.utils.book_append_sheet(wb, ws, "Planificacion");
    XLSStyle.writeFile(wb, `Plan_${mes}.xlsx`);
  };

  const listaRegiones = ['TODAS', ...new Set(empleados.map(e => e.Region).filter(Boolean))];
  const listaSRT = ['TODAS', ...new Set(empleados.filter(e => regionFiltro === 'TODAS' || e.Region === regionFiltro).map(e => e.SRT).filter(Boolean))];
  const listaSedes = ['TODAS', ...new Set(empleados.filter(e => (regionFiltro === 'TODAS' || e.Region === regionFiltro) && (srtFiltro === 'TODAS' || e.SRT === srtFiltro)).map(e => e.Sede).filter(Boolean))];

  const empleadosVisibles = empleados.filter(emp => {
    const cumpleReg = regionFiltro === 'TODAS' || emp.Region === regionFiltro;
    const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
    const cumpleSed = sedeFiltro === 'TODAS' || emp.Sede === sedeFiltro;
    const term = busqueda.toLowerCase().trim();
    return cumpleReg && cumpleSRT && cumpleSed && (!term || `${emp.Nombre} ${emp.Cedula}`.toLowerCase().includes(term));
  });

  if (!isLoggedIn) {
    return (
      <div style={{ background: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#111', padding: '40px', borderRadius: '20px', border: '1px solid #FFD700', width: '320px', textAlign: 'center' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ width: '130px', marginBottom: '20px' }} />
          <h3 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '20px' }}>ADMINISTRACIÓN RRHH</h3>
          <input type="text" placeholder="Usuario" style={{ width: '100%', padding: '12px', marginBottom: '10px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
          <input type="password" placeholder="Contraseña" style={{ width: '100%', padding: '12px', marginBottom: '20px', background: '#000', color: '#fff', border: '1px solid #333', borderRadius: '8px' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          <button onClick={() => { if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') setIsLoggedIn(true); else alert('Acceso Denegado'); }} style={{ width: '100%', padding: '12px', background: '#FFD700', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>ENTRAR</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '25px' }} />
          <span style={{ color: '#FFD700', fontWeight: 'bold' }}>PLANIFICACIÓN 2026</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardarYBloquear} disabled={isSaving} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isSaving ? '...' : 'GUARDAR Y BLOQUEAR'}</button>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>EXCEL</button>
          <button onClick={() => window.location.reload()} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}><LogOut size={16}/></button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
         {/* Filtros iguales a tu diseño original */}
         <select value={mes} onChange={e => setMes(e.target.value)} style={{ background: '#111', color: '#fff', padding: '10px', border: '1px solid #333', borderRadius: '6px' }}>{MESES_ANIO.map(m => <option key={m} value={m}>{m}</option>)}</select>
         <select value={semana} onChange={e => setSemana(e.target.value)} style={{ background: '#111', color: '#fff', padding: '10px', border: '1px solid #333', borderRadius: '6px' }}>{SEMANAS_MES.map(s => <option key={s} value={s}>{s}</option>)}</select>
         <select value={regionFiltro} onChange={e => setRegionFiltro(e.target.value)} style={{ background: '#111', color: '#fff', padding: '10px', border: '1px solid #333', borderRadius: '6px' }}>{listaRegiones.map(r => <option key={r} value={r}>{r}</option>)}</select>
         <select value={srtFiltro} onChange={e => setSrtFiltro(e.target.value)} style={{ background: '#111', color: '#fff', padding: '10px', border: '1px solid #333', borderRadius: '6px' }}>{listaSRT.map(s => <option key={s} value={s}>{s}</option>)}</select>
         <select value={sedeFiltro} onChange={e => setSedeFiltro(e.target.value)} style={{ background: '#111', color: '#fff', padding: '10px', border: '1px solid #333', borderRadius: '6px' }}>{listaSedes.map(s => <option key={s} value={s}>{s}</option>)}</select>
         <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '13px', color: '#FFD700' }} />
          <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', background: '#111', color: '#fff', padding: '10px 10px 10px 30px', border: '1px solid #333', borderRadius: '6px' }} />
         </div>
      </div>

      <div style={{ background: '#111', borderRadius: '15px', border: '1px solid #222', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>COLABORADOR</th>
              {nombresDias.map((d, i) => <th key={i}>{d}<br/>{numerosDias[i]}</th>)}
            </tr>
            {/* Fila de contadores "LIBRANDO" */}
            <tr style={{ background: '#050505' }}>
              <td style={{ textAlign: 'right', padding: '10px', color: '#FFD700', fontWeight: 'bold' }}>LIBRANDO:</td>
              {numerosDias.map((n, i) => {
                const count = empleadosVisibles.reduce((acc, emp) => {
                  const key = `${emp.Cedula}-${mes}-${semana}-${n}`;
                  return asistencia[key] === 'LIBRE' ? acc + 1 : acc;
                }, 0);
                return <td key={i} style={{ textAlign: 'center', color: '#00FF00', fontWeight: 'bold', fontSize: '16px' }}>{count}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => (
              <tr key={emp.Cedula} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold' }}>{emp.Nombre}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{emp.Sede} | {emp.Region}</div>
                </td>
                {numerosDias.map(n => {
                  const k = `${emp.Cedula}-${mes}-${semana}-${n}`;
                  const isLocked = celdasBloqueadas.includes(k);
                  const val = asistencia[k] || 'LABORAL';
                  return (
                    <td key={n} style={{ padding: '5px', textAlign: 'center', position: 'relative' }}>
                      <select 
                        disabled={isLocked}
                        value={val} 
                        onChange={e => setAsistencia({...asistencia, [k]: e.target.value})}
                        style={{ 
                          width: '100%',
                          background: isLocked ? '#000' : '#1a1a1a', 
                          color: isLocked ? '#444' : (val === 'LIBRE' ? '#0f0' : '#fff'),
                          border: isLocked ? '1px solid #222' : '1px solid #444',
                          padding: '6px', borderRadius: '4px', fontSize: '10px',
                          cursor: isLocked ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <option value="LABORAL">LABORAL</option>
                        <option value="LIBRE">LIBRE</option>
                        <option value="EGRESO">EGRESO</option>
                        <option value="TIENDA CERRADA">TIENDA CERRADA</option>
                      </select>
                      {isLocked && <Lock size={8} style={{ position: 'absolute', top: '6px', right: '6px', color: '#FFD700', opacity: 0.5 }} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;