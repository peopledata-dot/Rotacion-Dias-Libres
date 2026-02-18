import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Cloud, ShieldCheck } from 'lucide-react';
import { obtenerDiasDelMes } from './fechas';

// --- CONFIGURACIÓN DE FIREBASE (Verificada con tu URL) ---
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA0D6uB6dID2UySULeacwMsUxO-HUL5Qc4",
  authDomain: "rotacion-dias-libres-canguro.firebaseapp.com",
  // URL exacta de tu consola para que no se quede "guardando"
  databaseURL: "https://rotacion-dias-libres-canguro-default-rtdb.firebaseio.com", 
  projectId: "rotacion-dias-libres-canguro",
  storageBucket: "rotacion-dias-libres-canguro.firebasestorage.app",
  messagingSenderId: "545579480005",
  appId: "1:545579480005:web:d5208e164ed992b32051ac",
  measurementId: "G-7LZN80HZ19"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  
  // Estado de asistencia sincronizado
  const [asistencia, setAsistencia] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [online, setOnline] = useState(false);

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMes(mes, semana);
  const anioActual = new Date().getFullYear();

  // 1. ESCUCHAR CAMBIOS EN TIEMPO REAL
  useEffect(() => {
    if (isLoggedIn) {
      const asistenciaRef = ref(db, 'asistencia_canguro');
      // Este método "onValue" actualiza tu pantalla automáticamente si otro guarda
      const unsubscribe = onValue(asistenciaRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAsistencia(data);
          setOnline(true);
        }
      }, (error) => {
        console.error("Error de permisos en Firebase:", error);
        setOnline(false);
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  // 2. CARGA DE EMPLEADOS DESDE GOOGLE SHEETS
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
              if (key.toLowerCase().includes("nombre")) {
                val = val ? val.toString().toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : "";
              }
              obj[key] = val;
            });
            return obj;
          });
          setEmpleados(data.filter(e => (e.Estatus || "").toString().toUpperCase() !== "EGRESO"));
        }).catch(err => console.error(err));
    }
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') {
      setIsLoggedIn(true);
    } else {
      setErrorLogin(true);
    }
  };

  // 3. GUARDADO GLOBAL (CON CONTROL DE ERRORES PARA QUE NO SE TRABE)
  const handleGuardar = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Guardamos en la nube
      await set(ref(db, 'asistencia_canguro'), asistencia);
      alert("✅ Planificación sincronizada para todos los usuarios.");
    } catch (error) {
      console.error(error);
      alert("❌ ERROR: No se pudo guardar. Revisa que las Reglas de Firebase estén en 'true'.");
    } finally {
      // Pase lo que pase, el botón vuelve a la normalidad
      setIsSaving(false);
    }
  };

  const exportarExcel = () => {
    const encabezados = ["COLABORADOR", "ID", "SRT", "SEDE", "CARGO", ...nombresDias.map((d, i) => `${d} ${numerosDias[i]}`)];
    const filas = empleadosVisibles.map(emp => {
      const id = emp.cedula || emp.Cedula;
      return [
        emp.nombre || emp.Nombre, id, emp.SRT, emp.Sede, emp.Cargo, 
        ...numerosDias.map(n => asistencia[`${id}-${mes}-${semana}-${n}`] || 'LABORAL')
      ];
    });
    const wb = XLSStyle.utils.book_new();
    const ws = XLSStyle.utils.aoa_to_sheet([encabezados, ...filas]);
    XLSStyle.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSStyle.writeFile(wb, `Planificacion_Canguro_${mes}.xlsx`);
  };

  const listaSRT = ['TODAS', ...new Set(empleados.map(emp => emp.SRT).filter(Boolean))];
  const listaRegiones = ['TODAS', ...new Set(empleados.filter(e => srtFiltro === 'TODAS' || e.SRT === srtFiltro).map(e => e.Region).filter(Boolean))];
  const listaSedes = ['TODAS', ...new Set(empleados.filter(e => (srtFiltro === 'TODAS' || e.SRT === srtFiltro) && (regionFiltro === 'TODAS' || e.Region === regionFiltro)).map(e => e.Sede).filter(Boolean))];

  const empleadosVisibles = empleados.filter(emp => {
    const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
    const cumpleReg = regionFiltro === 'TODAS' || emp.Region === regionFiltro;
    const cumpleSed = sedeFiltro === 'TODAS' || emp.Sede === sedeFiltro;
    const term = busqueda.toLowerCase();
    const cumpleBusq = (emp.nombre || emp.Nombre || "").toLowerCase().includes(term) || (emp.cedula || emp.Cedula || "").toString().includes(term);
    return cumpleSRT && cumpleReg && cumpleSed && cumpleBusq;
  });

  if (!isLoggedIn) {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('/BOT.png')`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: 'rgba(10,10,10,0.95)', padding: '50px 20px', borderRadius: '35px', border: '2px solid #FFD700', width: '380px', textAlign: 'center' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '80px', marginBottom: '30px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '20px', fontWeight: '900', marginBottom: '35px' }}>ACCESO SRT GLOBAL</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <input type="text" placeholder="Usuario" style={{ width: '85%', padding: '14px', borderRadius: '12px', border: 'none' }} value={loginData.usuario} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Password" style={{ width: '85%', padding: '14px', borderRadius: '12px', border: 'none' }} value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            {errorLogin && <p style={{ color: '#ff4444', fontSize: '13px' }}>Credenciales incorrectas</p>}
            <button style={{ width: '90%', padding: '15px', background: '#FFD700', color: '#000', fontWeight: '900', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>ENTRAR</button>
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
          <div>
            <h1 style={{ color: '#FFD700', fontSize: '18px', margin: 0, fontWeight: '900' }}>ROTACIÓN DÍAS LIBRES</h1>
            <div style={{ color: online ? '#00FF00' : '#ff4444', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
               {online ? <ShieldCheck size={12}/> : <Cloud size={12}/>} {online ? 'SINCRONIZADO EN TIEMPO REAL' : 'CONECTANDO A FIREBASE...'}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardar} disabled={isSaving} style={{ background: isSaving ? '#555' : '#28a745', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px' }}>
              <Save size={16} /> {isSaving ? 'GUARDANDO...' : 'GUARDAR GLOBAL'}
          </button>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px' }}>
              <FileSpreadsheet size={16} /> EXPORTAR
          </button>
          <button onClick={() => setIsLoggedIn(false)} style={{ background: 'none', border: '1px solid #FF4444', color: '#FF4444', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px' }}>
              SALIR
          </button>
        </div>
      </header>

      {/* FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'MES', value: mes, func: setMes, list: MESES_ANIO },
          { label: 'SRT', value: srtFiltro, func: (v) => {setSrtFiltro(v); setRegionFiltro('TODAS'); setSedeFiltro('TODAS');}, list: listaSRT },
          { label: 'REGIÓN', value: regionFiltro, func: (v) => {setRegionFiltro(v); setSedeFiltro('TODAS')}, list: listaRegiones },
          { label: 'SEDE', value: sedeFiltro, func: setSedeFiltro, list: listaSedes },
          { label: 'SEMANA', value: semana, func: setSemana, list: SEMANAS_MES }
        ].map((f, i) => (
          <div key={i} style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
            <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{f.label}</label>
            <select value={f.value} onChange={e => f.func(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', fontSize: '13px' }}>
              {f.list.map(opt => <option key={opt} value={opt} style={{background:'#000'}}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>BUSCAR</label>
          <input type="text" placeholder="Escriba..." style={{ width: '100%', background: 'none', color: '#fff', border: 'none', fontSize: '13px' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* TABLA */}
      <div style={{ background: '#080808', borderRadius: '15px', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left', width: '300px' }}>COLABORADOR</th>
              <th style={{ width: '180px' }}>SEDE</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ width: '95px', fontSize: '12px' }}>{d} {numerosDias[i]}</th>
              ))}
            </tr>
            <tr style={{ background: '#151515' }}>
              <td colSpan="2" style={{ textAlign: 'right', padding: '10px', color: '#FFD700', fontWeight: 'bold' }}>LIBRANDO POR DÍA:</td>
              {numerosDias.map((n, i) => {
                const libres = empleadosVisibles.reduce((acc, emp) => asistencia[`${emp.cedula || emp.Cedula}-${mes}-${semana}-${n}`] === 'LIBRE' ? acc + 1 : acc, 0);
                return <td key={i} style={{ textAlign: 'center', color: '#00FF00', fontWeight: '900' }}>{libres}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.cedula || emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontWeight: 'bold' }}>{emp.nombre || emp.Nombre}</div>
                    <div style={{ fontSize: '10px', color: '#777' }}>CI: {id}</div>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '12px' }}>{emp.Sede}</td>
                  {numerosDias.map((n, i) => {
                    const keyID = `${id}-${mes}-${semana}-${n}`;
                    const val = asistencia[keyID] || 'LABORAL';
                    return (
                      <td key={i} style={{ padding: '5px' }}>
                        <select 
                          value={val} 
                          onChange={e => setAsistencia({...asistencia, [keyID]: e.target.value})}
                          style={{ 
                            width: '100%', background: '#000', border: '1px solid #333', 
                            color: val === 'LIBRE' ? '#00FF00' : val === 'REPOSO' ? '#ff4444' : '#fff', 
                            borderRadius: '5px', fontSize: '10px', padding: '5px'
                          }}
                        >
                          <option value="LABORAL">LABORAL</option>
                          <option value="LIBRE">LIBRE</option>
                          <option value="REPOSO">REPOSO</option>
                          <option value="EGRESO">EGRESO</option>
                          <option value="PERMISO">PERMISO</option>
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
      <p style={{textAlign:'center', color:'#444', fontSize:'10px', marginTop:'20px'}}>Canguro Venezuela - Dirección de Tecnología © {anioActual}</p>
    </div>
  );
};

export default App;