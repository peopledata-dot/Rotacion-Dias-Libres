import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Save, Search, Users, Calendar, MapPin } from 'lucide-react';
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

  // --- LÓGICA DE CARGA INICIAL DESDE LOCALSTORAGE ---
  const [asistencia, setAsistencia] = useState(() => {
    const persistencia = localStorage.getItem('asistencia_canguro_v1');
    return persistencia ? JSON.parse(persistencia) : {};
  });

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMes(mes, semana);
  const anioActual = new Date().getFullYear();

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

  // --- FUNCIÓN DE GUARDADO PERMANENTE ---
  const handleGuardar = () => {
    localStorage.setItem('asistencia_canguro_v1', JSON.stringify(asistencia));
    alert("✅ Planificación guardada permanentemente en este equipo.");
  };

  const exportarExcel = () => {
    const encabezados = ["COLABORADOR", "ID", "SRT", "SEDE", "CARGO", ...nombresDias.map((d, i) => `${d} ${numerosDias[i]}`)];
    const filas = empleadosVisibles.map(emp => {
      const id = emp.cedula || emp.Cedula;
      return [
        emp.nombre || emp.Nombre, 
        id, 
        emp.SRT, 
        emp.Sede, 
        emp.Cargo, 
        ...numerosDias.map(n => asistencia[`${id}-${mes}-${semana}-${n}`] || 'LABORAL')
      ];
    });
    
    const wb = XLSStyle.utils.book_new();
    const ws = XLSStyle.utils.aoa_to_sheet([encabezados, ...filas]);
    XLSStyle.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSStyle.writeFile(wb, `Reporte_Asistencia_${mes}_${semana}.xlsx`);
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
        <div style={{ background: 'rgba(10,10,10,0.95)', padding: '50px 20px', borderRadius: '35px', border: '2px solid #FFD700', width: '380px', textAlign: 'center', marginBottom: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '80px', marginBottom: '30px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '20px', fontWeight: '900', marginBottom: '35px', letterSpacing: '1px' }}>ACCESO RESTRINGIDO</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <input type="text" placeholder="Usuario" style={{ width: '85%', padding: '14px 18px', background: '#e8f0fe', border: 'none', color: '#000', borderRadius: '12px', outline: 'none', fontSize: '16px' }} value={loginData.usuario} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
            <input type="password" placeholder="Password" style={{ width: '85%', padding: '14px 18px', background: '#e8f0fe', border: 'none', color: '#000', borderRadius: '12px', outline: 'none', fontSize: '16px' }} value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            {errorLogin && <p style={{ color: '#ff4444', fontSize: '13px' }}>Credenciales incorrectas</p>}
            <button style={{ width: '90%', padding: '15px', background: '#FFD700', color: '#000', fontWeight: '900', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '16px', marginTop: '15px' }}>ENTRAR</button>
          </form>
        </div>
        <p style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px', opacity: 0.8 }}>Dirección de Tecnología - Canguro Venezuela {anioActual}</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      
      <div style={{ flex: 1 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px 25px', borderRadius: '15px', border: '1px solid #222', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/logo-canguro.png" alt="Logo" style={{ height: '40px' }} />
            <h1 style={{ color: '#FFD700', fontSize: '18px', margin: 0, fontWeight: '900' }}>PLANIFICACIÓN DÍAS LIBRES</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleGuardar} style={{ background: '#28a745', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px' }}>
                <Save size={16} /> GUARDAR
            </button>
            <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px' }}>
                <FileSpreadsheet size={16} /> EXPORTAR
            </button>
            <button onClick={() => setIsLoggedIn(false)} style={{ background: 'none', border: '1px solid #FF4444', color: '#FF4444', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '12px' }}>
                <LogOut size={16} /> SALIR
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
              <select value={f.value} onChange={e => f.func(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 'bold' }}>
                {f.list.map(opt => <option key={opt} value={opt} style={{background:'#000'}}>{opt}</option>)}
              </select>
            </div>
          ))}
          <div style={{ background: '#111', padding: '10px', borderRadius: '12px', border: '1px solid #333' }}>
            <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>BUSCAR</label>
            <input type="text" placeholder="Escriba..." style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '13px' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>

        {/* TABLA */}
        <div key={`${mes}-${semana}`} style={{ background: '#080808', borderRadius: '15px', border: '1px solid #222', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
                <th style={{ padding: '15px', textAlign: 'left', width: '300px', fontSize: '13px' }}>COLABORADOR</th>
                <th style={{ width: '180px', fontSize: '13px' }}>SEDE</th>
                <th style={{ width: '130px', fontSize: '13px' }}>SRT</th>
                {nombresDias.map((d, i) => (
                  <th key={i} style={{ width: '95px', fontSize: '12px' }}>{d} {numerosDias[i]}</th>
                ))}
              </tr>
              <tr style={{ background: '#151515', color: '#00FF00' }}>
                <td colSpan="3" style={{ textAlign: 'right', padding: '12px 25px', fontWeight: '900', fontSize: '12px', color: '#FFD700' }}>PERSONAS LIBRANDO:</td>
                {numerosDias.map((n, i) => {
                  const libres = empleadosVisibles.reduce((acc, emp) => asistencia[`${emp.cedula || emp.Cedula}-${mes}-${semana}-${n}`] === 'LIBRE' ? acc + 1 : acc, 0);
                  return <td key={i} style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px' }}>{libres}</td>;
                })}
              </tr>
            </thead>
            <tbody>
              {empleadosVisibles.map(emp => {
                const id = emp.cedula || emp.Cedula;
                return (
                  <tr key={id} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ padding: '15px 20px' }}>
                      <div style={{ fontWeight: '800', fontSize: '15px', color: '#fff' }}>{emp.nombre || emp.Nombre}</div>
                      <div style={{ fontSize: '10px', color: '#888' }}>CI: {id}</div>
                    </td>
                    <td style={{ textAlign: 'center', color: '#aaa', fontSize: '12px' }}>{emp.Sede}</td>
                    <td style={{ textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: 'bold' }}>{emp.SRT}</td>
                    {numerosDias.map((n, i) => {
                      // CLAVE ÚNICA: Incluye Mes y Semana para que no se pisen los datos
                      const keyID = `${id}-${mes}-${semana}-${n}`;
                      const val = asistencia[keyID] || 'LABORAL';
                      return (
                        <td key={i} style={{ padding: '6px', textAlign: 'center' }}>
                          <select 
                            value={val} 
                            autoComplete="off"
                            onChange={e => setAsistencia({...asistencia, [keyID]: e.target.value})}
                            style={{ width: '95%', background: '#000', border: '1px solid #333', color: val==='LIBRE'?'#00FF00':'#fff', borderRadius: '8px', fontSize: '11px', padding: '8px 2px', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            <option value="LABORAL">LABORAL</option>
                            <option value="LIBRE">LIBRE</option>
                            <option value="LIBRE">REPOSO</option>
                            <option value="LIBRE">EGRESO</option>
                            <option value="LIBRE">PERMISO</option>
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
      </div>

      <footer style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid #222', marginTop: '20px' }}>
        <p style={{ color: '#666', fontSize: '11px', fontWeight: 'bold' }}>
          Dirección de Tecnología - Canguro Venezuela {anioActual}
        </p>
      </footer>
    </div>
  );
};

export default App;