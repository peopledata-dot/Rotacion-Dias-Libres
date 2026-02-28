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
  const mesIndex = mesesNum[mesNombre] || 0;
  const numSemana = parseInt(semanaNombre.split(' ')[1]) || 1;
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
  const [mes, setMes] = useState('Marzo');
  const [semana, setSemana] = useState('Semana 1');
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});
  const [celdasBloqueadas, setCeldasBloqueadas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const numerosDias = obtenerDiasDelMesLocal(mes, semana);
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    if (isLoggedIn) {
      get(ref(db, 'asistencia_canguro')).then((snapshot) => {
        if (snapshot.exists()) setAsistencia(snapshot.val());
      });
      get(ref(db, 'celdas_bloqueadas_perm')).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setCeldasBloqueadas(Array.isArray(data) ? data : []);
        }
      });
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/19i5pwrIx8RX0P2OkE1qY2o5igKvvv2hxUuvb9jM_8LE/gviz/tq?tqx=out:json&gid=839594636';
      fetch(SHEET_URL)
        .then(res => res.text())
        .then(text => {
          try {
            const json = JSON.parse(text.substr(47).slice(0, -2));
            const data = json.table.rows.map(row => ({
              Nombre: row.c[0]?.v || '',
              Cedula: row.c[1]?.v || '',
              Estatus: row.c[6]?.v || '',
              Sede: row.c[7]?.v || '',
              Region: row.c[8]?.v || '',
              SRT: row.c[17]?.v || ''
            }));
            setEmpleados(data.filter(e => e.Nombre && e.Nombre !== "Nombre" && String(e.Estatus).toUpperCase() !== "EGRESO"));
          } catch (e) { console.error("Error cargando empleados", e); }
        });
    }
  }, [isLoggedIn]);

  const handleGuardarYBloquear = async () => {
    setIsSaving(true);
    try {
      // 1. Guardar todos los estados de asistencia actuales
      await set(ref(db, 'asistencia_canguro'), asistencia);
      
      // 2. Obtener los bloqueos que ya existen en la nube
      const snap = await get(ref(db, 'celdas_bloqueadas_perm'));
      let bloqueosBase = snap.exists() ? (Array.isArray(snap.val()) ? snap.val() : []) : [];
      
      // 3. LÓGICA CORREGIDA: Solo identificar para bloquear lo que NO sea "LABORAL"
      // Solo se agregan a la lista de bloqueados si el valor es LIBRE, EGRESO, etc.
      const nuevasParaBloquear = Object.keys(asistencia).filter(k => 
        asistencia[k] !== 'LABORAL' && asistencia[k] !== ''
      );
      
      const listaFinal = [...new Set([...bloqueosBase, ...nuevasParaBloquear])];
      
      // 4. Actualizar base de datos y estado local
      await set(ref(db, 'celdas_bloqueadas_perm'), listaFinal);
      setCeldasBloqueadas(listaFinal);
      
      alert("✅ Guardado: Los días LIBRES han sido bloqueados. Los LABORALES siguen editables.");
    } catch (error) { 
      alert("❌ Error: " + error.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

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
    XLSStyle.writeFile(wb, `Planificacion_${mes}_${semana}.xlsx`);
  };

  const listaRegiones = ['TODAS', ...new Set(empleados.map(e => e.Region).filter(Boolean))];
  const listaSRT = ['TODAS', ...new Set(empleados.filter(e => regionFiltro === 'TODAS' || e.Region === regionFiltro).map(e => e.SRT).filter(Boolean))];
  const listaSedes = ['TODAS', ...new Set(empleados.filter(e => (regionFiltro === 'TODAS' || e.Region === regionFiltro) && (srtFiltro === 'TODAS' || e.SRT === srtFiltro)).map(e => e.Sede).filter(Boolean))];

  const empleadosVisibles = empleados.filter(emp => {
    const cumpleReg = regionFiltro === 'TODAS' || emp.Region === regionFiltro;
    const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
    const cumpleSed = sedeFiltro === 'TODAS' || emp.Sede === sedeFiltro;
    const term = busqueda.toLowerCase().trim();
    const dataString = `${emp.Nombre} ${emp.Cedula} ${emp.Sede} ${emp.Region} ${emp.SRT}`.toLowerCase();
    return cumpleReg && cumpleSRT && cumpleSed && (!term || dataString.includes(term));
  });

  if (!isLoggedIn) {
    return (
      <div style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('/BOT.png')", backgroundSize:'cover', backgroundPosition:'center', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', fontFamily:'sans-serif' }}>
        <div style={{ background:'rgba(20,20,20,0.95)', padding:'40px', borderRadius:'30px', border:'1px solid #FFD700', width:'340px', textAlign:'center', backdropFilter:'blur(10px)' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ width:'150px', marginBottom:'20px' }} />
          <h2 style={{ color:'#FFD700', fontSize:'16px', letterSpacing:'2px' }}>CANGURO RRHH</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') setIsLoggedIn(true); else alert('Error de acceso'); }} style={{ display:'flex', flexDirection:'column', gap:'15px', marginTop:'20px' }}>
            <input type="text" placeholder="Usuario" style={{ padding:'14px', borderRadius:'10px', background:'#111', color:'#fff', border:'1px solid #333' }} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Contraseña" style={{ padding:'14px', borderRadius:'10px', background:'#111', color:'#fff', border:'1px solid #333' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            <button style={{ padding:'14px', background:'#FFD700', color:'#000', fontWeight:'bold', borderRadius:'10px', border:'none', cursor:'pointer' }}>ACCEDER</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '30px' }} />
          <span style={{ color: '#FFD700', fontWeight: 'bold' }}>PLANIFICACIÓN MARZO 2026</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardarYBloquear} disabled={isSaving} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            <Save size={14} /> {isSaving ? 'PROCESANDO...' : 'GUARDAR Y BLOQUEAR'}
          </button>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            <FileSpreadsheet size={14} /> EXCEL
          </button>
          <button onClick={() => window.location.reload()} style={{ background: '#444', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><LogOut size={14} /></button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'MES', v: mes, f: setMes, l: MESES_ANIO },
          { label: 'SEMANA', v: semana, f: setSemana, l: SEMANAS_MES },
          { label: 'REGIÓN', v: regionFiltro, f: (v)=>{setRegionFiltro(v); setSrtFiltro('TODAS'); setSedeFiltro('TODAS');}, l: listaRegiones },
          { label: 'SRT', v: srtFiltro, f: (v)=>{setSrtFiltro(v); setSedeFiltro('TODAS');}, l: listaSRT },
          { label: 'SEDE', v: sedeFiltro, f: setSedeFiltro, l: listaSedes }
        ].map((f, i) => (
          <div key={i} style={{ background: '#111', padding: '8px', borderRadius: '10px', border: '1px solid #333' }}>
            <label style={{ color: '#FFD700', fontSize: '9px', fontWeight: 'bold', display: 'block' }}>{f.label}</label>
            <select value={f.v} onChange={e => f.f(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '12px' }}>
              {f.l.map(o => <option key={o} value={o} style={{background:'#111'}}>{o}</option>)}
            </select>
          </div>
        ))}
        <div style={{ background: '#111', padding: '8px', borderRadius: '10px', border: '1px solid #333', display:'flex', alignItems:'center', gap:'8px' }}>
          <Search size={14} color="#FFD700" />
          <input type="text" placeholder="Búsqueda..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '12px' }} />
        </div>
      </div>

      <div style={{ background: '#111', borderRadius: '20px', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left', width: '220px' }}>COLABORADOR</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', opacity: 0.5 }}>{d}</div>
                  <div style={{ fontSize:'13px' }}>{numerosDias[i]}</div>
                </th>
              ))}
            </tr>
            <tr style={{ background: '#050505', borderBottom:'1px solid #FFD700' }}>
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
            {empleadosVisibles.map(emp => {
              const id = emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{emp.Nombre}</div>
                    <div style={{ fontSize: '9px', color: '#aaa' }}>{emp.Sede} | {emp.Region}</div>
                  </td>
                  {numerosDias.map((n, i) => {
                    const k = `${id}-${mes}-${semana}-${n}`;
                    const val = asistencia[k] || 'LABORAL';
                    const locked = celdasBloqueadas.includes(k);
                    return (
                      <td key={i} style={{ padding: '4px', position: 'relative' }}>
                        <select value={val} disabled={locked} onChange={e => setAsistencia({...asistencia, [k]: e.target.value})} style={{ 
                          width: '100%', padding: '7px', borderRadius: '6px', fontSize: '10px', background: locked ? '#000' : '#1a1a1a',
                          color: locked ? (val === 'LABORAL' ? '#444' : '#0f0') : (val==='LIBRE'?'#0f0':'#fff'), 
                          border: locked ? '1px solid #222' : '1px solid #444',
                          cursor: locked ? 'not-allowed' : 'pointer', textAlign: 'center'
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
    </div>
  );
};

export default App;