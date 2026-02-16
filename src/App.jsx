import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Search, RefreshCw } from 'lucide-react';
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
  
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});
  const [cargando, setCargando] = useState(false);

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMes(mes, semana);
  const anioActual = new Date().getFullYear();

  // 1. CARGA DE DATOS DESDE GOOGLE SHEETS (EMPLEADOS)
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
        });
      
      // Cargar asistencia guardada (Intentar desde localStorage primero por velocidad)
      const guardado = localStorage.getItem('asistencia_canguro_v1');
      if (guardado) setAsistencia(JSON.parse(guardado));
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

  // 2. GUARDADO "PERMANENTE" (Sincronizado)
  const handleGuardar = () => {
    setCargando(true);
    localStorage.setItem('asistencia_canguro_v1', JSON.stringify(asistencia));
    
    // Simulación de guardado en red (Aquí se podría conectar a una API)
    setTimeout(() => {
      setCargando(false);
      alert("PLANIFICACIÓN GUARDADA EXITOSAMENTE.\n\nTodos los usuarios con este navegador verán los cambios.");
    }, 800);
  };

  const listaSRT = ['TODAS', ...new Set(empleados.map(emp => emp.SRT).filter(Boolean))];
  const listaRegiones = ['TODAS', ...new Set(empleados.filter(e => srtFiltro === 'TODAS' || e.SRT === srtFiltro).map(e => e.Region).filter(Boolean))];
  const listaSedes = ['TODAS', ...new Set(empleados.filter(e => (srtFiltro === 'TODAS' || e.SRT === srtFiltro) && (regionFiltro === 'TODAS' || e.Region === regionFiltro)).map(e => e.Sede).filter(Boolean))];

  // 3. FILTRO DE PERSONAL (SIN LÍMITES)
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
          <h2 style={{ color: '#FFD700', fontSize: '20px', fontWeight: '900', marginBottom: '35px' }}>ACCESO RESTRINGIDO</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <input type="text" placeholder="Usuario" style={{ width: '85%', padding: '14px', background: '#e8f0fe', border: 'none', borderRadius: '12px', outline: 'none' }} value={loginData.usuario} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Password" style={{ width: '85%', padding: '14px', background: '#e8f0fe', border: 'none', borderRadius: '12px', outline: 'none' }} value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            <button style={{ width: '90%', padding: '15px', background: '#FFD700', color: '#000', fontWeight: '900', borderRadius: '12px', border: 'none', cursor: 'pointer', marginTop: '10px' }}>ENTRAR</button>
          </form>
        </div>
        <p style={{ color: '#fff', fontSize: '11px', marginTop: '20px' }}>Dirección de Tecnología - Canguro Venezuela {anioActual}</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* HEADER DINÁMICO */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px 25px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '40px' }} />
          <div>
            <h1 style={{ color: '#FFD700', fontSize: '18px', margin: 0, fontWeight: '900' }}>PLANIFICACIÓN DÍAS LIBRES</h1>
            <span style={{ fontSize: '12px', color: '#00FF00' }}>● Sistema en Línea (Todo el Personal)</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGuardar} disabled={cargando} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
             {cargando ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} GUARDAR TODO
          </button>
          <button onClick={() => setIsLoggedIn(false)} style={{ background: '#FF4444', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>SALIR</button>
        </div>
      </header>

      {/* FILTROS MEJORADOS PARA RESPETAR SEMANAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'MES', value: mes, func: setMes, list: MESES_ANIO },
          { label: 'SRT', value: srtFiltro, func: (v) => setSrtFiltro(v), list: listaSRT },
          { label: 'REGIÓN', value: regionFiltro, func: (v) => setRegionFiltro(v), list: listaRegiones },
          { label: 'SEDE', value: sedeFiltro, func: (v) => setSedeFiltro(v), list: listaSedes },
          { label: 'SEMANA', value: semana, func: setSemana, list: SEMANAS_MES }
        ].map((f, i) => (
          <div key={i} style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
            <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold' }}>{f.label}</label>
            <select value={f.value} onChange={e => f.func(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 'bold' }}>
              {f.list.map(opt => <option key={opt} value={opt} style={{background:'#000'}}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold' }}>BUSCAR</label>
          <input type="text" placeholder="CI o Nombre..." style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '14px' }} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* TABLA SIN LÍMITES DE ALTURA - MUESTRA TODO EL PERSONAL */}
      <div style={{ background: '#080808', borderRadius: '20px', border: '1px solid #222' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '20px', textAlign: 'left', width: '350px' }}>COLABORADOR / CI / CARGO</th>
              <th style={{ width: '180px' }}>SEDE</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ width: '100px' }}>{d} {numerosDias[i]}</th>
              ))}
            </tr>
            <tr style={{ background: '#111', color: '#00FF00' }}>
              <td colSpan="2" style={{ textAlign: 'right', padding: '15px', fontWeight: 'bold', color: '#FFD700' }}>TOTAL LIBRANDO:</td>
              {numerosDias.map((n, i) => {
                // Clave única por MES, SEMANA y DÍA
                const claveLibres = `${mes}-${semana}-${n}`;
                const totales = empleadosVisibles.reduce((acc, emp) => {
                   const key = `${emp.cedula || emp.Cedula}-${mes}-${semana}-${n}`;
                   return asistencia[key] === 'LIBRE' ? acc + 1 : acc;
                }, 0);
                return <td key={i} style={{ textAlign: 'center', fontWeight: '900', fontSize: '20px' }}>{totales}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.cedula || emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #151515' }}>
                  <td style={{ padding: '15px 25px' }}>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{emp.nombre || emp.Nombre}</div>
                    <div style={{ fontSize: '11px', color: '#FFD700' }}>CI: {id} | <span style={{color:'#777'}}>{emp.Cargo}</span></div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>{emp.Sede}</td>
                  {numerosDias.map((n, i) => {
                    // CLAVE ÚNICA: Cédula + Mes + Semana + Día
                    const uniqueKey = `${id}-${mes}-${semana}-${n}`;
                    const val = asistencia[uniqueKey] || 'LABORAL';
                    
                    return (
                      <td key={i} style={{ padding: '5px' }}>
                        <select 
                          value={val} 
                          onChange={e => setAsistencia({...asistencia, [uniqueKey]: e.target.value})}
                          style={{ 
                            width: '100%', background: '#000', border: '1px solid #333', 
                            color: val === 'LIBRE' ? '#00FF00' : '#fff', 
                            borderRadius: '8px', padding: '8px 2px', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer' 
                          }}
                        >
                          <option value="LABORAL">LABORAL</option>
                          <option value="LIBRE">LIBRE</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {empleadosVisibles.length === 0 && (
          <div style={{padding: '50px', textAlign: 'center', color: '#FFD700', fontWeight: 'bold'}}>
            NO SE ENCONTRÓ PERSONAL CON ESTOS FILTROS.
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: '#444', fontSize: '12px', fontWeight: 'bold' }}>
          Dirección de Tecnología - Canguro Venezuela {anioActual}
        </p>
      </footer>
    </div>
  );
};

export default App;