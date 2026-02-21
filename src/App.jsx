import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Cloud, ShieldCheck } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

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

// --- LÓGICA DE FECHAS ---
// --- LÓGICA DE FECHAS CORREGIDA ---
const obtenerDiasDelMesLocal = (mesNombre, semanaNombre) => {
  const anio = new Date().getFullYear();
  const mesesNum = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
    'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };
  
  const mesIndex = mesesNum[mesNombre];
  const numSemana = parseInt(semanaNombre.split(' ')[1]);

  // 1. Buscamos el primer día del mes
  const primerDiaMes = new Date(anio, mesIndex, 1);
  
  // 2. Buscamos el primer lunes del mes (o días antes si el mes no empieza en lunes)
  // getDay() devuelve 0 para domingo, 1 para lunes... lo ajustamos para que Lunes sea 0
  const ajusteLunes = (primerDiaMes.getDay() === 0 ? 6 : primerDiaMes.getDay() - 1);
  const inicioPrimerSemana = new Date(anio, mesIndex, 1 - ajusteLunes);

  // 3. Calculamos el inicio de la semana seleccionada
  const inicioSemanaSeleccionada = new Date(inicioPrimerSemana);
  inicioSemanaSeleccionada.setDate(inicioPrimerSemana.getDate() + (numSemana - 1) * 7);

  // 4. Generamos los 7 días de esa semana
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemanaSeleccionada);
    dia.setDate(inicioSemanaSeleccionada.getDate() + i);
    return dia.getDate(); // Retorna el número del día (22, 23, etc.)
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

  // Año actual dinámico
  const currentYear = new Date().getFullYear();

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMesLocal(mes, semana);

  useEffect(() => {
    if (isLoggedIn) {
      const asistenciaRef = ref(db, 'asistencia_canguro');
      const unsubscribe = onValue(asistenciaRef, (snapshot) => {
        if (snapshot.exists()) {
          setAsistencia(snapshot.val());
          setOnline(true);
        }
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

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

  const handleGuardar = async () => {
    setIsSaving(true);
    try {
      await set(ref(db, 'asistencia_canguro'), asistencia);
      alert("✅ Sincronización exitosa.");
    } catch (error) {
      alert("❌ Error de conexión.");
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

    const headerStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "FFD700" } },
      border: { outline: { style: "thin", color: { rgb: "000000" } } }
    };

    encabezados.forEach((_, i) => {
      const cellRef = XLSStyle.utils.encode_cell({ r: 0, c: i });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    });

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
      <div style={{ 
        // Aplicamos un overlay oscuro sobre la imagen BOT.png
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/BOT.png')", 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        fontFamily: 'sans-serif' 
      }}>
        <div style={{ 
          background: 'rgba(17, 17, 17, 0.85)', 
          padding: '40px', 
          borderRadius: '25px', 
          border: '2px solid #FFD700', 
          width: '350px', 
          textAlign: 'center', 
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <img src="/logo-canguro.png" alt="Logo Canguro" style={{ width: '180px', marginBottom: '20px' }} />
          <h2 style={{ color: '#FFD700', marginBottom: '30px', fontWeight: '900', letterSpacing: '1px' }}>SISTEMA SRT GLOBAL</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') setIsLoggedIn(true); else setErrorLogin(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Usuario" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff' }} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Password" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: '#fff' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            {errorLogin && <p style={{ color: '#ff4444', fontSize: '12px', fontWeight: 'bold' }}>Credenciales incorrectas</p>}
            <button style={{ padding: '15px', background: '#FFD700', color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: '0.3s' }}>ENTRAR</button>
          </form>
        </div>
        
        {/* Pie de página con año dinámico */}
        <footer style={{ marginTop: '30px', color: 'rgba(255, 215, 0, 0.8)', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
          Dirección de Tecnología - Canguro Venezuela {currentYear}
        </footer>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px 25px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '45px' }} />
          <div style={{ borderLeft: '1px solid #333', paddingLeft: '20px' }}>
            <h1 style={{ color: '#FFD700', fontSize: '18px', margin: 0, fontWeight: '900' }}>CANGURO - PLANIFICACIÓN</h1>
            <div style={{ color: online ? '#00FF00' : '#ff4444', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
               {online ? <ShieldCheck size={12}/> : <Cloud size={12}/>} {online ? 'SISTEMA ONLINE' : 'SIN CONEXIÓN'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardar} disabled={isSaving} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Save size={16} /> {isSaving ? '...' : 'GUARDAR'}
          </button>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <FileSpreadsheet size={16} /> EXPORTAR EXCEL
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
          <input type="text" placeholder="Cédula/Nombre..." style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '12px' }} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* TABLA */}
      <div style={{ background: '#080808', borderRadius: '15px', border: '1px solid #222', overflowX: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left', width: '250px' }}>COLABORADOR</th>
              <th style={{ width: '120px' }}>SEDE</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ width: '100px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#888' }}>{d}</div>
                  <div>{numerosDias[i]}</div>
                </th>
              ))}
            </tr>
            <tr style={{ background: '#151515' }}>
              <td colSpan="2" style={{ textAlign: 'right', padding: '10px', color: '#FFD700', fontWeight: 'bold' }}>LIBRANDO POR DÍA:</td>
              {numerosDias.map((n, i) => {
                const count = empleadosVisibles.reduce((acc, emp) => {
                  const key = `${emp.Cedula || emp.cedula}-${mes}-${semana}-${n}`;
                  return asistencia[key] === 'LIBRE' ? acc + 1 : acc;
                }, 0);
                return <td key={i} style={{ textAlign: 'center', color: '#00FF00', fontWeight: 'bold' }}>{count}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.Cedula || emp.cedula;
              return (
                <tr key={`${id}-${mes}-${semana}`} style={{ borderBottom: '1px solid #111' }}>
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
                            color: val === 'LIBRE' ? '#0f0' : val === 'REPOSO' ? '#f44' : val === 'PERMISO' ? '#3498db' : '#fff', 
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
      
      {/* Pie de página en vista interna también */}
      <footer style={{ marginTop: '20px', color: '#666', fontSize: '11px', textAlign: 'center' }}>
        Dirección de Tecnología - Canguro Venezuela {currentYear}
      </footer>
    </div>
  );
};

export default App;