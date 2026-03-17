import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Lock, Search, MapPin } from 'lucide-react';
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

// --- COMPONENTE DE FILA OPTIMIZADO ---
// React.memo evita que esta fila se vuelva a dibujar si sus datos no han cambiado
const FilaEmpleado = memo(({ emp, numerosDias, asistencia, celdasBloqueadas, sedeActual, listaSedes, onAsistenciaChange, onSedeChange, mes, semana }) => {
  return (
    <tr style={{ borderBottom: '1px solid #222' }}>
      <td style={{ padding: '12px' }}>
        <div style={{ fontWeight: 'bold', color: '#fff' }}>{emp.Nombre}</div>
        <div style={{ fontSize: '9px', color: '#aaa' }}>{emp.Cedula} | {emp.Region}</div>
      </td>
      <td style={{ padding: '12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'#000', padding:'5px', borderRadius:'5px', border:'1px solid #333' }}>
          <MapPin size={10} color="#FFD700" />
          <select 
            value={sedeActual}
            onChange={(e) => onSedeChange(emp.Cedula, e.target.value)}
            style={{ background:'none', color:'#FFD700', border:'none', fontSize:'10px', width:'100%', outline:'none', cursor:'pointer' }}
          >
            {listaSedes.map(s => <option key={s} value={s} style={{background:'#111'}}>{s}</option>)}
          </select>
        </div>
      </td>
      {numerosDias.map((n, i) => {
        const k = `${emp.Cedula}-${mes}-${semana}-${n}`;
        const val = asistencia[k] || 'LABORAL';
        const locked = celdasBloqueadas.includes(k);
        return (
          <td key={i} style={{ padding: '4px', position: 'relative' }}>
            <select 
              value={val} 
              disabled={locked} 
              onChange={e => onAsistenciaChange(k, e.target.value)} 
              style={{ 
                width: '100%', padding: '7px', borderRadius: '6px', fontSize: '10px', 
                background: locked ? '#000' : '#1a1a1a',
                color: locked || val === 'LIBRE' ? '#0f0' : '#fff', 
                border: locked ? '1px solid #222' : '1px solid #444',
                textAlign: 'center'
              }}
            >
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
});

const obtenerDiasDelMesLocal = (mesNombre, semanaNombre) => {
  const anio = 2026;
  const mesesNum = { 'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5, 'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11 };
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
  const [sedesEditadas, setSedesEditadas] = useState({});
  const [mes, setMes] = useState('Marzo');
  const [semana, setSemana] = useState('Semana 1');
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});
  const [celdasBloqueadas, setCeldasBloqueadas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // useMemo evita que los días se recalculen en cada tipeo
  const numerosDias = useMemo(() => obtenerDiasDelMesLocal(mes, semana), [mes, semana]);
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        const [sedesSnap, asistSnap, blockSnap] = await Promise.all([
          get(ref(db, 'sedes_personalizadas')),
          get(ref(db, 'asistencia_canguro')),
          get(ref(db, 'celdas_bloqueadas_perm'))
        ]);
        
        setSedesEditadas(sedesSnap.exists() ? sedesSnap.val() : {});
        setAsistencia(asistSnap.exists() ? asistSnap.val() : {});
        setCeldasBloqueadas(blockSnap.exists() ? (Array.isArray(blockSnap.val()) ? blockSnap.val() : []) : []);

        const SHEET_URL = 'https://docs.google.com/spreadsheets/d/19i5pwrIx8RX0P2OkE1qY2o5igKvvv2hxUuvb9jM_8LE/gviz/tq?tqx=out:json&gid=839594636';
        fetch(SHEET_URL).then(res => res.text()).then(text => {
          try {
            const json = JSON.parse(text.substr(47).slice(0, -2));
            const data = json.table.rows.map(row => ({
              Nombre: row.c[0]?.v || '',
              Cedula: String(row.c[1]?.v || ''),
              Estatus: row.c[6]?.v || '',
              SedeOriginal: row.c[7]?.v || '',
              Region: row.c[8]?.v || '',
              SRT: row.c[17]?.v || ''
            })).filter((emp, index, self) => 
              emp.Nombre && emp.Nombre !== "Nombre" && 
              String(emp.Estatus).toUpperCase() !== "EGRESO" &&
              index === self.findIndex(t => t.Cedula === emp.Cedula)
            );
            setEmpleados(data);
          } catch (e) { console.error(e); }
        });
      };
      fetchData();
    }
  }, [isLoggedIn]);

  // Funciones estables para evitar re-renders
  const handleAsistenciaChange = useCallback((key, value) => {
    setAsistencia(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSedeChange = useCallback((id, value) => {
    setSedesEditadas(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleGuardarYBloquear = async () => {
    setIsSaving(true);
    try {
      await set(ref(db, 'asistencia_canguro'), asistencia);
      await set(ref(db, 'sedes_personalizadas'), sedesEditadas);
      alert("✅ Datos guardados.");
    } catch (error) { alert("❌ Error"); }
    setIsSaving(false);
  };

  const listaSedes = useMemo(() => 
    ['TODAS', ...new Set(empleados.map(e => sedesEditadas[e.Cedula] || e.SedeOriginal).filter(Boolean))],
  [empleados, sedesEditadas]);

  const empleadosVisibles = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    return empleados.filter(emp => {
      const sedeActual = sedesEditadas[emp.Cedula] || emp.SedeOriginal;
      const cumpleReg = regionFiltro === 'TODAS' || emp.Region === regionFiltro;
      const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
      const cumpleSed = sedeFiltro === 'TODAS' || sedeActual === sedeFiltro;
      const dataString = `${emp.Nombre} ${emp.Cedula} ${sedeActual}`.toLowerCase();
      return cumpleReg && cumpleSRT && cumpleSed && (!term || dataString.includes(term));
    });
  }, [empleados, sedesEditadas, regionFiltro, srtFiltro, sedeFiltro, busqueda]);

  if (!isLoggedIn) {
    return (
      <div style={{ background:'#000', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center' }}>
        <div style={{ background:'#111', padding:'40px', borderRadius:'30px', border:'1px solid #FFD700', width:'340px' }}>
          <form onSubmit={(e) => { e.preventDefault(); if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') setIsLoggedIn(true); else alert('Error'); }} style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
            <h2 style={{ color:'#FFD700', textAlign:'center' }}>ACCESO RRHH</h2>
            <input type="text" placeholder="Usuario" style={{ padding:'12px', background:'#222', color:'#fff', border:'1px solid #333' }} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Contraseña" style={{ padding:'12px', background:'#222', color:'#fff', border:'1px solid #333' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            <button style={{ padding:'12px', background:'#FFD700', fontWeight:'bold', cursor:'pointer' }}>ENTRAR</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
        <span style={{ color: '#FFD700', fontWeight: 'bold' }}>CANGURO 2026</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardarYBloquear} disabled={isSaving} style={{ background: '#28a745', color: '#fff', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>
            {isSaving ? '...' : 'GUARDAR'}
          </button>
          <button onClick={() => window.location.reload()} style={{ background: '#444', color: '#fff', padding: '10px', borderRadius: '8px' }}><LogOut size={14} /></button>
        </div>
      </header>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px', borderRadius: '10px' }} />
        <select value={sedeFiltro} onChange={e => setSedeFiltro(e.target.value)} style={{ background: '#111', color: '#fff', padding: '10px', borderRadius: '10px' }}>
          {listaSedes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background: '#111', borderRadius: '20px', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>COLABORADOR</th>
              <th style={{ textAlign: 'left' }}>SEDE ACTUAL</th>
              {nombresDias.map((d, i) => <th key={i} style={{textAlign:'center'}}>{d}<br/>{numerosDias[i]}</th>)}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => (
              <FilaEmpleado 
                key={emp.Cedula}
                emp={emp}
                numerosDias={numerosDias}
                asistencia={asistencia}
                celdasBloqueadas={celdasBloqueadas}
                sedeActual={sedesEditadas[emp.Cedula] || emp.SedeOriginal}
                listaSedes={listaSedes.filter(s => s !== 'TODAS')}
                onAsistenciaChange={handleAsistenciaChange}
                onSedeChange={handleSedeChange}
                mes={mes}
                semana={semana}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;