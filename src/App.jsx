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
  
  const [srtFiltro, setSrtFiltro] = useState('TODAS');
  const [regionFiltro, setRegionFiltro] = useState('TODAS');
  const [sedeFiltro, setSedeFiltro] = useState('TODAS');
  
  const [busqueda, setBusqueda] = useState('');
  const [asistencia, setAsistencia] = useState({});

  const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const numerosDias = obtenerDiasDelMes(mes, semana);

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) e.preventDefault();
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
      <div style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/BOT.png')`, backgroundSize: 'cover', backgroundPosition: 'center', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ background: 'rgba(10,10,10,0.95)', padding: '40px', borderRadius: '24px', border: '1px solid #FFD700', width: '350px', textAlign: 'center' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '70px', marginBottom: '20px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '18px', fontWeight: '800', marginBottom: '25px' }}>ACCESO RESTRINGIDO</h2>
          <input type="text" placeholder="USUARIO" style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '10px', marginBottom: '15px' }} value={loginData.usuario} onChange={e => setLoginData({...loginData, usuario: e.target.value})} />
          <input type="password" placeholder="PASSWORD" style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '10px', marginBottom: '20px' }} value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          <button style={{ width: '100%', padding: '14px', background: '#FFD700', color: '#000', fontWeight: 'bold', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>ENTRAR</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '40px' }} />
          <div>
            <h1 style={{ color: '#FFD700', fontSize: '18px', margin: 0 }}>ASISTENCIA Y LIBRES</h1>
            <p style={{ fontSize: '9px', color: '#666', margin: 0 }}>CANGURO VENEZUELA</p>
          </div>
          
          <div style={{ marginLeft: '20px', background: '#000', padding: '6px 15px', borderRadius: '8px', border: '1px solid #FFD700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14} color="#FFD700" />
            <span style={{ fontSize: '11px', color: '#FFD700', fontWeight: 'bold' }}>SRT:</span>
            <select 
                value={srtFiltro} 
                onChange={e => { setSrtFiltro(e.target.value); setRegionFiltro('TODAS'); setSedeFiltro('TODAS'); }}
                style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}
            >
              {listaSRT.map(s => <option key={s} value={s} style={{background:'#000'}}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportarExcel} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
            <FileSpreadsheet size={16}/> EXPORTAR
          </button>
          <button onClick={() => setIsLoggedIn(false)} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'MES', value: mes, func: setMes, list: MESES_ANIO },
          { label: 'REGIÓN', value: regionFiltro, func: (v) => {setRegionFiltro(v); setSedeFiltro('TODAS')}, list: listaRegiones },
          { label: 'SEDE', value: sedeFiltro, func: setSedeFiltro, list: listaSedes },
          { label: 'SEMANA', value: semana, func: setSemana, list: SEMANAS_MES }
        ].map((f, i) => (
          <div key={i} style={{ background: '#111', padding: '8px 12px', borderRadius: '10px', border: '1px solid #222' }}>
            <label style={{ color: '#FFD700', fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{f.label}</label>
            <select value={f.value} onChange={e => f.func(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '13px' }}>
              {f.list.map(opt => <option key={opt} value={opt} style={{background:'#000'}}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div style={{ background: '#111', padding: '8px 12px', borderRadius: '10px', border: '1px solid #222' }}>
          <label style={{ color: '#FFD700', fontSize: '9px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>BUSCAR</label>
          <input type="text" placeholder="Nombre/CI..." style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '13px' }} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      <div style={{ background: '#080808', borderRadius: '15px', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '1px solid #FFD700' }}>
              <th style={{ padding: '12px', textAlign: 'left', width: '250px' }}>COLABORADOR</th>
              <th style={{ width: '150px' }}>SEDE</th>
              <th style={{ width: '130px' }}>SRT</th>
              {nombresDias.map((d, i) => <th key={i} style={{ width: '80px' }}>{d.substring(0,2)} {numerosDias[i]}</th>)}
            </tr>
            <tr style={{ background: '#151515', color: '#00FF00' }}>
              <td colSpan="3" style={{ textAlign: 'right', padding: '10px 20px', fontWeight: 'bold', fontSize: '11px', color: '#FFD700' }}>PERSONAS LIBRANDO:</td>
              {numerosDias.map((n, i) => {
                const libres = empleadosVisibles.reduce((acc, emp) => asistencia[`${emp.cedula || emp.Cedula}-${n}`] === 'LIBRE' ? acc + 1 : acc, 0);
                return <td key={i} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>{libres}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.cedula || emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={{ padding: '10px 15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 'bold' }}>{emp.nombre || emp.Nombre}</div>
                    <div style={{ fontSize: '9px', color: '#555' }}>CI: {id}</div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#777', fontSize: '11px' }}>{emp.Sede}</td>
                  <td style={{ textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: 'bold' }}>{emp.SRT}</td>
                  {numerosDias.map((n, i) => {
                    const val = asistencia[`${id}-${n}`] || 'LABORAL';
                    return (
                      <td key={i} style={{ padding: '4px', textAlign: 'center' }}>
                        <select 
                          value={val} 
                          onChange={e => setAsistencia({...asistencia, [`${id}-${n}`]: e.target.value})}
                          style={{ width: '90%', background: '#000', border: '1px solid #222', color: val==='LIBRE'?'#00FF00':'#fff', borderRadius: '4px', fontSize: '10px', padding: '4px', textAlign: 'center' }}
                        >
                          <option value="LABORAL.">LAB</option>
                          <option value="LIBRE">LIB</option>
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
  );
};

export default App;