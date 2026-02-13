import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Lock, User, Search, Calendar, Filter, MapPin, ShieldAlert, Users } from 'lucide-react';
import { obtenerDiasDelMes } from './fechas';

const MESES_ANIO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SEMANAS_MES = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5'];

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ usuario: '', password: '' });
  const [errorLogin, setErrorLogin] = useState(false);
  
  const [empleados, setEmpleados] = useState([]);
  const [mes, setMes] = useState('Febrero');
  const [semana, setSemana] = useState('Semana 1');
  
  // Filtros Organizacionales
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMes(mes, semana);
  const anioActual = new Date().getFullYear();

  // --- 1. SEGURIDAD ---
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- 2. CARGA DE DATOS ---
  useEffect(() => {
    if (isLoggedIn) {
      const SHEET_URL = 'https://docs.google.com/spreadsheets/d/19i5pwrIx8RX0P2OkE1qY2o5igKvvv2hxUuvb9jM_8LE/gviz/tq?tqx=out:json&gid=839594636';
      fetch(SHEET_URL)
        .then(res => res.text())
        .then(text => {
          const json = JSON.parse(text.substr(47).slice(0, -2));
          const rows = json.table.rows;
          const data = rows.map(row => {
            const obj = {};
            json.table.cols.forEach((col, i) => {
              let val = row.c[i] ? row.c[i].v : '';
              let key = col.label || `col_${i}`;
              // Mapeo manual de columnas clave
              if (i === 7) key = "Sede"; 
              if (i === 17) key = "SRT"; // Columna R
              if (key.toLowerCase().includes("nombre")) {
                val = val ? val.toString().toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : "";
              }
              obj[key] = val;
            });
            return obj;
          });
          setEmpleados(data.filter(e => (e.Estatus || "").toString().toUpperCase() !== "EGRESO"));
        }).catch(err => console.error("Error:", err));
    }
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.usuario === 'SRTCanguro' && loginData.password === 'CanguroADM*') {
      setIsLoggedIn(true);
      setErrorLogin(false);
    } else {
      setErrorLogin(true);
    }
  };

  // --- 3. LÓGICA DE FILTRADO EN CASCADA ---
  const listaSRT = ['TODAS', ...new Set(empleados.map(emp => emp.SRT).filter(Boolean))];

  const listaRegionesFiltrada = ['TODAS', ...new Set(
    empleados
      .filter(emp => srtFiltro === 'TODAS' || emp.SRT === srtFiltro)
      .map(emp => emp.Region)
      .filter(Boolean)
  )];

  const listaSedesFiltrada = ['TODAS', ...new Set(
    empleados
      .filter(emp => (srtFiltro === 'TODAS' || emp.SRT === srtFiltro) && 
                     (regionFiltro === 'TODAS' || emp.Region === regionFiltro))
      .map(emp => emp.Sede)
      .filter(Boolean)
  )];

  const empleadosVisibles = empleados.filter(emp => {
    const srt = (emp.SRT || "").toString().toUpperCase();
    const reg = (emp.Region || "").toString().toUpperCase();
    const sed = (emp.Sede || "").toString().toUpperCase();
    const nom = (emp.nombre || emp.Nombre || "").toString().toLowerCase();
    const ced = (emp.cedula || emp.Cedula || "").toString();
    const term = busqueda.toLowerCase();
    
    const cumpleSRT = srtFiltro === 'TODAS' || srt === srtFiltro.toUpperCase();
    const cumpleRegion = regionFiltro === 'TODAS' || reg === regionFiltro.toUpperCase();
    const cumpleSede = sedeFiltro === 'TODAS' || sed === sedeFiltro.toUpperCase();
    const cumpleBusqueda = nom.includes(term) || ced.includes(term);
    
    return cumpleSRT && cumpleRegion && cumpleSede && cumpleBusqueda;
  });

  const exportarExcel = () => {
    const encabezados = ["COLABORADOR", "ID", "SRT", "REGIÓN", "SEDE", "CARGO", ...nombresDias.map((d, i) => `${d} ${numerosDias[i]}`)];
    const filas = empleadosVisibles.map(emp => {
      const id = emp.cedula || emp.Cedula;
      return [emp.nombre || emp.Nombre, id, emp.SRT, emp.Region, emp.Sede, emp.Cargo, ...numerosDias.map(n => asistencia[`${id}-${n}`] || 'LABORAL')];
    });
    const wb = XLSStyle.utils.book_new();
    const ws = XLSStyle.utils.aoa_to_sheet([encabezados, ...filas]);
    XLSStyle.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSStyle.writeFile(wb, `Reporte_SRT_${mes}.xlsx`);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/BOT.png')`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', padding: '40px', borderRadius: '24px', border: '1px solid #FFD700', width: '350px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '70px', marginBottom: '10px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '20px', fontWeight: '800', marginBottom: '30px' }}>ACCESO PRIVADO</h2>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <User size={18} color="#FFD700" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input type="text" placeholder="USUARIO" style={{ width: '100%', padding: '12px 12px 12px 40px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} value={loginData.usuario} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
          </div>
          <div style={{ position: 'relative', marginBottom: '25px' }}>
            <Lock size={18} color="#FFD700" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input type="password" placeholder="CONTRASEÑA" style={{ width: '100%', padding: '12px 12px 12px 40px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          </div>
          {errorLogin && <div style={{ color: '#ff4444', fontSize: '12px', marginBottom: '15px' }}><ShieldAlert size={14}/> Credenciales incorrectas</div>}
          <button type="submit" style={{ width: '100%', padding: '14px', background: '#FFD700', color: '#000', fontWeight: '900', cursor: 'pointer', border: 'none', borderRadius: '12px' }}>ENTRAR AL SISTEMA</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0d0d0d', minHeight: '100vh', color: '#fff', padding: '25px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #FFD700', paddingBottom: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '55px' }} />
          <h1 style={{ color: '#FFD700', fontSize: '24px', margin: 0, fontWeight: '800' }}>PLANIFICACIÓN DÍAS LIBRES</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} /> EXPORTAR BDD
          </button>
          <button onClick={() => setIsLoggedIn(false)} style={{ background: '#111', color: '#FFD700', border: '1px solid #FFD700', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer' }}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* SECCIÓN DE FILTROS (6 COLUMNAS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '30px' }}>
        
        {/* FILTRO 1: MES */}
        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Calendar size={12}/> MES</label>
          <select value={mes} onChange={e => setMes(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {MESES_ANIO.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* FILTRO 2: SRT (Columna R) */}
        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Users size={12}/> SRT</label>
          <select value={srtFiltro} onChange={e => { setSrtFiltro(e.target.value); setRegionFiltro('TODAS'); setSedeFiltro('TODAS'); }} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {listaSRT.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* FILTRO 3: REGIÓN */}
        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Filter size={12}/> REGIÓN</label>
          <select value={regionFiltro} onChange={e => { setRegionFiltro(e.target.value); setSedeFiltro('TODAS'); }} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {listaRegionesFiltrada.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* FILTRO 4: SEDE */}
        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><MapPin size={12}/> SEDE</label>
          <select value={sedeFiltro} onChange={e => setSedeFiltro(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {listaSedesFiltrada.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* FILTRO 5: SEMANA */}
        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Calendar size={12}/> SEMANA</label>
          <select value={semana} onChange={e => setSemana(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {SEMANAS_MES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* FILTRO 6: BUSCADOR */}
        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Search size={12}/> BUSCAR CI/NOM</label>
          <input type="text" placeholder="Escriba..." style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px', boxSizing: 'border-box' }} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* TABLA CON CONTADOR DE LIBRANTES */}
      <div style={{ background: '#080808', border: '1px solid #222', borderRadius: '15px', overflow: 'hidden' }}>
        <table key={`${mes}-${semana}`} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>COLABORADOR</th>
              <th>SEDE</th>
              {nombresDias.map((d, i) => <th key={i} style={{ padding: '10px' }}>{d} {numerosDias[i]}</th>)}
            </tr>
            {/* FILA DE CONTEO */}
            <tr style={{ background: '#1a1a1a', color: '#00FF00' }}>
              <td colSpan="2" style={{ padding: '8px 20px', fontWeight: 'bold', textAlign: 'right', color: '#FFD700' }}>PERSONAS LIBRANDO:</td>
              {numerosDias.map((n, i) => {
                const totalLibres = empleadosVisibles.reduce((acc, emp) => {
                  const id = emp.cedula || emp.Cedula;
                  return (asistencia[`${id}-${n}`] === 'LIBRE') ? acc + 1 : acc;
                }, 0);
                return <td key={i} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>{totalLibres}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.cedula || emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: '#111' }}>
                  <td style={{ padding: '10px 20px' }}>
                    <div style={{ fontWeight: 'bold' }}>{emp.nombre || emp.Nombre}</div>
                    <div style={{ fontSize: '9px', color: '#FFD700', opacity: 0.7 }}>CI: {id} | {emp.Cargo}</div>
                  </td>
                  <td style={{ textAlign: 'center', opacity: 0.6 }}>{emp.Sede}</td>
                  {numerosDias.map((n, i) => {
                    const val = asistencia[`${id}-${n}`] || 'LABORAL';
                    return (
                      <td key={i} style={{ padding: '4px' }}>
                        <select value={val} style={{ background: '#000', color: val==='LIBRE'?'#00FF00':val==='PERMISO'?'#FFD700':'#fff', border: '1px solid #333', width: '100%', fontSize: '11px', padding: '4px', borderRadius: '4px' }} onChange={e => setAsistencia({...asistencia, [`${id}-${n}`]: e.target.value})}>
                          <option value="LABORAL">LAB</option>
                          <option value="LIBRE">LIB</option>
                          <option value="PERMISO">PER</option>
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
      <footer style={{ marginTop: '20px', textAlign: 'center', color: '#444', fontSize: '10px' }}>
        © {anioActual} | DIRECCIÓN DE TECNOLOGÍA - CANGURO VENEZUELA
      </footer>
    </div>
  );
};

export default App;