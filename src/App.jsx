import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Lock, User, Search, Calendar, Filter, MapPin, ShieldAlert } from 'lucide-react';
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
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMes(mes, semana);
  const anioActual = new Date().getFullYear();

  // --- 1. SISTEMA DE SEGURIDAD (BLOQUEO DE INSPECCIÓN) ---
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      // Bloquea F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || 
        (e.ctrlKey && e.keyCode === 85)
      ) {
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
              if (i === 7) key = "Sede"; 
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

  const listaRegiones = ['TODAS', ...new Set(empleados.map(emp => emp.Region).filter(Boolean))];
  const listaSedesFiltrada = ['TODAS', ...new Set(
    empleados
      .filter(emp => regionFiltro === 'TODAS' || emp.Region === regionFiltro)
      .map(emp => emp.Sede)
      .filter(Boolean)
  )];

  const empleadosVisibles = empleados.filter(emp => {
    const reg = (emp.Region || "").toString().toUpperCase();
    const sed = (emp.Sede || "").toString().toUpperCase();
    const nom = (emp.nombre || emp.Nombre || "").toString().toLowerCase();
    const ced = (emp.cedula || emp.Cedula || "").toString();
    const term = busqueda.toLowerCase();
    
    const cumpleRegion = regionFiltro === 'TODAS' || reg === regionFiltro.toUpperCase();
    const cumpleSede = sedeFiltro === 'TODAS' || sed === sedeFiltro.toUpperCase();
    const cumpleBusqueda = nom.includes(term) || ced.includes(term);
    
    return cumpleRegion && cumpleSede && cumpleBusqueda;
  });

  const exportarExcel = () => {
    const encabezados = ["COLABORADOR", "ID", "REGIÓN", "SEDE", "CARGO", ...nombresDias.map((d, i) => `${d} ${numerosDias[i]}`)];
    const filas = empleadosVisibles.map(emp => {
      const id = emp.cedula || emp.Cedula;
      return [emp.nombre || emp.Nombre, id, emp.Region, emp.Sede, emp.Cargo, ...numerosDias.map(n => asistencia[`${id}-${n}`] || 'LABORAL')];
    });
    const wb = XLSStyle.utils.book_new();
    const ws = XLSStyle.utils.aoa_to_sheet([encabezados, ...filas]);
    XLSStyle.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSStyle.writeFile(wb, `Reporte_Canguro_${mes}.xlsx`);
  };

  if (!isLoggedIn) {
    return (
      <div style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/BOT.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        fontFamily: 'sans-serif'
      }}>
        <form onSubmit={handleLogin} style={{ 
          backgroundColor: 'rgba(10, 10, 10, 0.9)', 
          padding: '40px', 
          borderRadius: '24px', 
          border: '1px solid #FFD700', 
          boxShadow: '0 0 40px rgba(255, 215, 0, 0.3)', 
          width: '350px', 
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '70px', marginBottom: '10px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '20px', fontWeight: '800', marginBottom: '5px', letterSpacing: '1px' }}>ACCESO PRIVADO</h2>
          <p style={{ color: '#FFD700', fontSize: '12px', marginBottom: '25px', opacity: 0.8 }}>Solo Uso Personal SRT</p>
          
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <User size={18} color="#FFD700" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input 
              type="text" 
              placeholder="USUARIO" 
              style={{ width: '100%', padding: '12px 12px 12px 40px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} 
              value={loginData.usuario} 
              onChange={e => setLoginData({...loginData, usuario: e.target.value})} 
            />
          </div>
          
          <div style={{ position: 'relative', marginBottom: '25px' }}>
            <Lock size={18} color="#FFD700" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input 
              type="password" 
              placeholder="CONTRASEÑA" 
              style={{ width: '100%', padding: '12px 12px 12px 40px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} 
              value={loginData.password} 
              onChange={e => setLoginData({...loginData, password: e.target.value})} 
            />
          </div>

          {errorLogin && (
            <div style={{ color: '#ff4444', fontSize: '12px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <ShieldAlert size={14}/> Credenciales incorrectas
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '14px', background: '#FFD700', color: '#000', fontWeight: '900', cursor: 'pointer', border: 'none', borderRadius: '12px', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)' }}>
            ENTRAR AL SISTEMA
          </button>
        </form>
        
        <footer style={{ marginTop: '40px', color: '#fff', fontSize: '12px', textAlign: 'center', textShadow: '1px 1px 2px #000' }}>
          <p>© {anioActual} | <b>DIRECCIÓN DE TECNOLOGÍA</b></p>
        </footer>
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

      {/* FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Calendar size={14}/> MES</label>
          <select value={mes} onChange={e => setMes(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {MESES_ANIO.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Filter size={14}/> REGIÓN</label>
          <select value={regionFiltro} onChange={e => {setRegionFiltro(e.target.value); setSedeFiltro('TODAS');}} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {listaRegiones.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><MapPin size={14}/> SEDE</label>
          <select value={sedeFiltro} onChange={e => setSedeFiltro(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {listaSedesFiltrada.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Calendar size={14}/> SEMANA</label>
          <select value={semana} onChange={e => setSemana(e.target.value)} style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px' }}>
            {SEMANAS_MES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ background: '#121212', padding: '12px', borderRadius: '12px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}><Search size={14}/> BUSCAR (NOMBRE/CI)</label>
          <input type="text" placeholder="Escriba aquí..." style={{ background: '#000', color: '#fff', border: '1px solid #333', width: '100%', padding: '8px', borderRadius: '6px', boxSizing: 'border-box' }} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      <div style={{ background: '#080808', border: '1px solid #222', borderRadius: '15px', overflow: 'hidden' }}>
        <table key={`${mes}-${semana}`} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>COLABORADOR</th>
              <th>SEDE</th>
              {nombresDias.map((d, i) => <th key={i} style={{ padding: '10px' }}>{d} {numerosDias[i]}</th>)}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.cedula || emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: '#111111' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ fontWeight: 'bold', color: '#FFF' }}>{emp.nombre || emp.Nombre}</div>
                    <div style={{ fontSize: '10px', color: '#FFD700', opacity: 0.7 }}>CI: {id} | {emp.Cargo}</div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#bbb', fontSize: '11px' }}>{emp.Sede}</td>
                  {numerosDias.map((n, i) => {
                    const val = asistencia[`${id}-${n}`] || 'LABORAL';
                    return (
                      <td key={i} style={{ padding: '5px' }}>
                        <select 
                          value={val}
                          style={{ background: '#000', color: val === 'LIBRE' ? '#00FF00' : val === 'PERMISO' ? '#FFD700' : '#fff', border: '1px solid #333', width: '100%', fontSize: '11px', padding: '4px', borderRadius: '4px' }}
                          onChange={e => setAsistencia({...asistencia, [`${id}-${n}`]: e.target.value})}
                        >
                          <option value="LABORAL">LABORAL</option>
                          <option value="LIBRE">LIBRE</option>
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
      <footer style={{ marginTop: '30px', textAlign: 'center', color: '#444', fontSize: '12px' }}>
        <p>© {anioActual} | DIRECCIÓN DE TECNOLOGÍA - CANGURO VENEZUELA</p>
      </footer>
    </div>
  );
};

export default App;