import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Search, Users } from 'lucide-react';
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

  const nombresDias = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const numerosDias = obtenerDiasDelMes(mes, semana);

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

  if (!isLoggedIn) {
    return (
      <div style={{ backgroundColor: '#000', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#0a0a0a', padding: '50px 40px', borderRadius: '30px', border: '1.5px solid #FFD700', width: '380px', textAlign: 'center' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '80px', marginBottom: '30px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '22px', fontWeight: '900', marginBottom: '35px', letterSpacing: '1px' }}>ACCESO RESTRINGIDO</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Usuario" 
              style={{ width: '100%', padding: '14px 20px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '15px', outline: 'none', fontSize: '15px' }} 
              value={loginData.usuario} 
              onChange={e => setLoginData({...loginData, usuario: e.target.value})} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              style={{ width: '100%', padding: '14px 20px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '12px', marginBottom: '30px', outline: 'none', fontSize: '15px' }} 
              value={loginData.password} 
              onChange={e => setLoginData({...loginData, password: e.target.value})} 
            />
            {errorLogin && <p style={{ color: '#ff4444', fontSize: '13px', marginBottom: '15px' }}>Credenciales incorrectas</p>}
            <button style={{ width: '100%', padding: '15px', background: '#FFD700', color: '#000', fontWeight: '800', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '16px', textTransform: 'uppercase' }}>
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '40px' }} />
          <div>
            <h1 style={{ color: '#FFD700', fontSize: '18px', margin: 0, fontWeight: '900' }}>PLANIFICACIÓN DÍAS LIBRES</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button style={{ background: '#FFD700', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18}/> EXPORTAR BDD
          </button>
          <button onClick={() => setIsLoggedIn(false)} style={{ background: 'none', border: '1px solid #FFD700', color: '#FFD700', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '25px' }}>
        {[
          { label: 'MES', value: mes, func: setMes, list: MESES_ANIO },
          { label: 'SRT', value: srtFiltro, func: (v) => {setSrtFiltro(v); setRegionFiltro('TODAS'); setSedeFiltro('TODAS');}, list: listaSRT },
          { label: 'REGIÓN', value: regionFiltro, func: (v) => {setRegionFiltro(v); setSedeFiltro('TODAS')}, list: listaRegiones },
          { label: 'SEDE', value: sedeFiltro, func: setSedeFiltro, list: listaSedes },
          { label: 'SEMANA', value: semana, func: setSemana, list: SEMANAS_MES }
        ].map((f, i) => (
          <div key={i} style={{ background: '#111', padding: '10px 15px', borderRadius: '12px', border: '1px solid #333' }}>
            <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{f.label}</label>
            <select value={f.value} onChange={e => f.func(e.target.value)} style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 'bold' }}>
              {f.list.map(opt => <option key={opt} value={opt} style={{background:'#000'}}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div style={{ background: '#111', padding: '10px 15px', borderRadius: '12px', border: '1px solid #333' }}>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>BUSCAR CI/NOM</label>
          <input type="text" placeholder="Escriba..." style={{ width: '100%', background: 'none', color: '#fff', border: 'none', outline: 'none', fontSize: '14px' }} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* TABLA */}
      <div key={`${mes}-${semana}`} style={{ background: '#080808', borderRadius: '15px', border: '1px solid #222', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '15px', textAlign: 'left', width: '300px', fontSize: '14px' }}>COLABORADOR</th>
              <th style={{ width: '200px', fontSize: '14px' }}>SEDE</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ width: '100px', fontSize: '13px' }}>{d} {numerosDias[i]}</th>
              ))}
            </tr>
            <tr style={{ background: '#151515', color: '#00FF00' }}>
              <td colSpan="2" style={{ textAlign: 'right', padding: '12px 25px', fontWeight: '900', fontSize: '12px', color: '#FFD700' }}>PERSONAS LIBRANDO:</td>
              {numerosDias.map((n, i) => {
                const libres = empleadosVisibles.reduce((acc, emp) => asistencia[`${emp.cedula || emp.Cedula}-${n}`] === 'LIBRE' ? acc + 1 : acc, 0);
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
                    <div style={{ fontSize: '10px', color: '#FFD700' }}>CI: {id} | {emp.Cargo}</div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#aaa', fontSize: '12px' }}>{emp.Sede}</td>
                  {numerosDias.map((n, i) => {
                    const val = asistencia[`${id}-${n}`] || 'LABORAL';
                    return (
                      <td key={i} style={{ padding: '8px', textAlign: 'center' }}>
                        <select 
                          value={val} 
                          autoComplete="off"
                          onChange={e => setAsistencia({...asistencia, [`${id}-${n}`]: e.target.value})}
                          style={{ width: '100%', background: '#000', border: '1px solid #333', color: val==='LIBRE'?'#00FF00':'#fff', borderRadius: '8px', fontSize: '12px', padding: '8px 4px', textAlign: 'center', fontWeight: 'bold' }}
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
      </div>
    </div>
  );
};

export default App;