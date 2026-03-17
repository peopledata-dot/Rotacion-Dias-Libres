import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Lock, Search, MapPin } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";

// --- CONFIGURACIÓN FIREBASE (Sin cambios) ---
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
// memo evita que la fila se renderice si sus datos no han cambiado
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
            style={{ background:'none', color:'#FFD700', border:'none', fontSize:'10px', width:'100%', outline:'none' }}
          >
            {listaSedes.map(s => <option key={s} value={s} style={{background:'#111'}}>{s}</option>)}
          </select>
        </div>
      </td>
      {numerosDias.map((n) => {
        const k = `${emp.Cedula}-${mes}-${semana}-${n}`;
        const val = asistencia[k] || 'LABORAL';
        const locked = celdasBloqueadas.includes(k);
        return (
          <td key={n} style={{ padding: '4px', position: 'relative' }}>
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

// --- FUNCIONES HELPER ---
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
  const [busquedaDebounced, setBusquedaDebounced] = useState(''); // Para fluidez al escribir
  const [asistencia, setAsistencia] = useState({});
  const [celdasBloqueadas, setCeldasBloqueadas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const numerosDias = useMemo(() => obtenerDiasDelMesLocal(mes, semana), [mes, semana]);
  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // Debounce para la búsqueda (espera 300ms antes de filtrar)
  useEffect(() => {
    const timer = setTimeout(() => setBusquedaDebounced(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

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
        });
      };
      fetchData();
    }
  }, [isLoggedIn]);

  // Manejadores estables con useCallback
  const onAsistenciaChange = useCallback((key, value) => {
    setAsistencia(prev => ({ ...prev, [key]: value }));
  }, []);

  const onSedeChange = useCallback((cedula, nuevaSede) => {
    setSedesEditadas(prev => ({ ...prev, [cedula]: nuevaSede }));
  }, []);

  const handleGuardarYBloquear = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        set(ref(db, 'asistencia_canguro'), asistencia),
        set(ref(db, 'sedes_personalizadas'), sedesEditadas)
      ]);
      alert("✅ Guardado con éxito.");
    } catch (e) { alert("Error"); }
    setIsSaving(false);
  };

  // Memoizar listas de filtros para no recalcular innecesariamente
  const listaSedesUnicas = useMemo(() => {
    return [...new Set(empleados.map(e => sedesEditadas[e.Cedula] || e.SedeOriginal).filter(Boolean))].sort();
  }, [empleados, sedesEditadas]);

  const empleadosVisibles = useMemo(() => {
    return empleados.filter(emp => {
      const sedeActual = sedesEditadas[emp.Cedula] || emp.SedeOriginal;
      const cumpleReg = regionFiltro === 'TODAS' || emp.Region === regionFiltro;
      const cumpleSRT = srtFiltro === 'TODAS' || emp.SRT === srtFiltro;
      const cumpleSed = sedeFiltro === 'TODAS' || sedeActual === sedeFiltro;
      const term = busquedaDebounced.toLowerCase();
      return cumpleReg && cumpleSRT && cumpleSed && (!term || emp.Nombre.toLowerCase().includes(term) || emp.Cedula.includes(term));
    });
  }, [empleados, sedesEditadas, regionFiltro, srtFiltro, sedeFiltro, busquedaDebounced]);

  if (!isLoggedIn) return (
    <div style={{ background:'#000', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center' }}>
        <button onClick={() => setIsLoggedIn(true)} style={{ padding:'15px 30px', background:'#FFD700', borderRadius:'10px', cursor:'pointer' }}>ENTRAR AL SISTEMA</button>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '20px' }}>
        <span style={{ color: '#FFD700', fontWeight: 'bold' }}>PLANIFICACIÓN 2026</span>
        <button onClick={handleGuardarYBloquear} disabled={isSaving} style={{ background: '#28a745', color: '#fff', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}>
          <Save size={14} /> {isSaving ? 'ESPERE...' : 'GUARDAR CAMBIOS'}
        </button>
      </header>

      {/* FILTROS (Solo Sede y Búsqueda para el ejemplo) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <select value={sedeFiltro} onChange={e => setSedeFiltro(e.target.value)} style={{ background:'#111', color:'#fff', padding:'10px', borderRadius:'10px', flex: 1 }}>
          <option value="TODAS">TODAS LAS SEDES</option>
          {listaSedesUnicas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input 
          type="text" 
          placeholder="Buscar por nombre o cédula..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
          style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px', borderRadius: '10px', flex: 2 }} 
        />
      </div>

      <div style={{ background: '#111', borderRadius: '20px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>COLABORADOR</th>
              <th style={{ textAlign: 'left' }}>SEDE ACTUAL</th>
              {nombresDias.map((d, i) => <th key={i} style={{textAlign:'center'}}>{d}<br/>{numerosDias[i]}</th>)}
            </tr>
            <tr style={{ background: '#050505', borderBottom:'1px solid #FFD700' }}>
              <td colSpan={2} style={{ textAlign: 'right', padding: '10px', color: '#FFD700', fontWeight: 'bold' }}>TOTAL LIBRANDO:</td>
              {numerosDias.map((n, i) => {
                const count = empleadosVisibles.filter(emp => asistencia[`${emp.Cedula}-${mes}-${semana}-${n}`] === 'LIBRE').length;
                return <td key={i} style={{ textAlign: 'center', color: '#00FF00', fontWeight: 'bold', fontSize: '18px' }}>{count}</td>;
              })}
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
                listaSedes={listaSedesUnicas}
                onAsistenciaChange={onAsistenciaChange}
                onSedeChange={onSedeChange}
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