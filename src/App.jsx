import React, { useState, useEffect } from 'react';
import XLSStyle from 'xlsx-js-style';
import { FileSpreadsheet, LogOut, Search, Users, MapPin, Calendar } from 'lucide-react';
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
      <div style={{ 
        backgroundImage: `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('/BOT.png')`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        fontFamily: 'sans-serif' 
      }}>
        <div style={{ 
          background: 'rgba(10, 10, 10, 0.9)', 
          padding: '50px 40px', 
          borderRadius: '35px', 
          border: '2px solid #FFD700', 
          width: '400px', 
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(255, 215, 0, 0.2)'
        }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '90px', marginBottom: '30px' }} />
          <h2 style={{ color: '#FFD700', fontSize: '24px', fontWeight: '900', marginBottom: '40px', letterSpacing: '2px' }}>ACCESO RESTRINGIDO</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Usuario" 
              style={{ width: '100%', padding: '16px 20px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '15px', marginBottom: '15px', outline: 'none', fontSize: '16px' }} 
              value={loginData.usuario} 
              onChange={e => setLoginData({...loginData, usuario: e.target.value})} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              style={{ width: '100%', padding: '16px 20px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '15px', marginBottom: '30px', outline: 'none', fontSize: '16px' }} 
              value={loginData.password} 
              onChange={e => setLoginData({...loginData, password: e.target.value})} 
            />
            {errorLogin && <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '15px' }}>Credenciales incorrectas</p>}
            <button style={{ width: '100%', padding: '16px', background: '#FFD700', color: '#000', fontWeight: '900', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#050505', minHeight: '100vh', color: '#fff', padding: '25px', fontFamily: 'sans-serif' }}>
      
      {/* BARRA SUPERIOR ESTETICA */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: '#111', 
        padding: '15px 30px', 
        borderRadius: '20px', 
        border: '1px solid #222',
        marginBottom: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo-canguro.png" alt="Logo" style={{ height: '45px' }} />
          <div style={{ borderLeft: '1px solid #333', paddingLeft: '20px' }}>
            <h1 style={{ color: '#FFD700', fontSize: '20px', margin: 0, fontWeight: '900', letterSpacing: '1px' }}>PLANIFICACIÓN DÍAS LIBRES</h1>
            <p style={{ fontSize: '10px', color: '#666', margin: 0, textTransform: 'uppercase' }}>Sistema de Gestión de Asistencia</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button style={{ 
            background: '#FFD700', color: '#000', border: 'none', padding: '12px 25px', borderRadius: '12px', 
            fontWeight: '900', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' 
          }}>
            <FileSpreadsheet size={20}/> EXPORTAR BDD
          </button>
          <button onClick={() => setIsLoggedIn(false)} style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
            <LogOut size={22} />
          </button>
        </div>
      </header>

      {/* BARRA DE FILTROS REORGANIZADA */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(6, 1fr)', 
        gap: '15px', 
        marginBottom: '30px',
        background: '#0a0a0a',
        padding: '20px',
        borderRadius: '20px',
        border: '1px solid #1a1a1a'
      }}>
        {[
          { label: 'MES ACTUAL', value: mes, func: setMes, list: MESES_ANIO, icon: <Calendar size={14}/> },
          { label: 'SUPERVISOR SRT', value: srtFiltro, func: (v) => {setSrtFiltro(v); setRegionFiltro('TODAS'); setSedeFiltro('TODAS');}, list: listaSRT, icon: <Users size={14}/> },
          { label: 'REGIÓN', value: regionFiltro, func: (v) => {setRegionFiltro(v); setSedeFiltro('TODAS')}, list: listaRegiones, icon: <MapPin size={14}/> },
          { label: 'SEDE / TIENDA', value: sedeFiltro, func: setSedeFiltro, list: listaSedes, icon: <MapPin size={14}/> },
          { label: 'SEMANA', value: semana, func: setSemana, list: SEMANAS_MES, icon: <Calendar size={14}/> }
        ].map((f, i) => (
          <div key={i}>
            <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', marginLeft: '5px' }}>
              {f.icon} {f.label}
            </label>
            <select value={f.value} onChange={e => f.func(e.target.value)} style={{ 
              width: '100%', background: '#151515', color: '#fff', border: '1px solid #333', padding: '12px', borderRadius: '12px', outline: 'none', fontSize: '14px' 
            }}>
              {f.list.map(opt => <option key={opt} value={opt} style={{background:'#000'}}>{opt}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label style={{ color: '#FFD700', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', marginLeft: '5px' }}>
            <Search size={14}/> BUSCAR COLABORADOR
          </label>
          <input 
            type="text" 
            placeholder="Nombre o Cédula..." 
            style={{ width: '100%', background: '#151515', color: '#fff', border: '1px solid #333', padding: '12px', borderRadius: '12px', outline: 'none', fontSize: '14px' }} 
            onChange={e => setBusqueda(e.target.value)} 
          />
        </div>
      </div>

      {/* TABLA DE ASISTENCIA */}
      <div key={`${mes}-${semana}`} style={{ background: '#080808', borderRadius: '25px', border: '1px solid #222', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#000', color: '#FFD700', borderBottom: '2px solid #FFD700' }}>
              <th style={{ padding: '20px', textAlign: 'left', width: '320px', fontSize: '14px' }}>DATOS DEL COLABORADOR</th>
              <th style={{ width: '180px', fontSize: '14px' }}>UBICACIÓN / SEDE</th>
              {nombresDias.map((d, i) => (
                <th key={i} style={{ width: '100px', fontSize: '13px' }}>{d} {numerosDias[i]}</th>
              ))}
            </tr>
            <tr style={{ background: '#111', color: '#00FF00' }}>
              <td colSpan="2" style={{ textAlign: 'right', padding: '15px 30px', fontWeight: '900', fontSize: '13px', color: '#FFD700' }}>TOTAL PERSONAS LIBRANDO:</td>
              {numerosDias.map((n, i) => {
                const libres = empleadosVisibles.reduce((acc, emp) => asistencia[`${emp.cedula || emp.Cedula}-${n}`] === 'LIBRE' ? acc + 1 : acc, 0);
                return <td key={i} style={{ textAlign: 'center', fontWeight: '900', fontSize: '20px' }}>{libres}</td>;
              })}
            </tr>
          </thead>
          <tbody>
            {empleadosVisibles.map(emp => {
              const id = emp.cedula || emp.Cedula;
              return (
                <tr key={id} style={{ borderBottom: '1px solid #151515', transition: '0.2s' }}>
                  <td style={{ padding: '18px 25px' }}>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: '#fff', marginBottom: '4px' }}>{emp.nombre || emp.Nombre}</div>
                    <div style={{ fontSize: '11px', color: '#FFD700', fontWeight: 'bold' }}>CI: {id} • {emp.Cargo}</div>
                  </td>
                  <td style={{ textAlign: 'center', color: '#999', fontSize: '13px', fontWeight: 'bold' }}>{emp.Sede}</td>
                  {numerosDias.map((n, i) => {
                    const val = asistencia[`${id}-${n}`] || 'LABORAL';
                    return (
                      <td key={i} style={{ padding: '10px', textAlign: 'center' }}>
                        <select 
                          value={val} 
                          autoComplete="off"
                          onChange={e => setAsistencia({...asistencia, [`${id}-${n}`]: e.target.value})}
                          style={{ 
                            width: '100%', background: '#000', border: '1.5px solid #333', 
                            color: val === 'LIBRE' ? '#00FF00' : '#fff', 
                            borderRadius: '10px', fontSize: '12px', padding: '10px 5px', 
                            textAlign: 'center', fontWeight: 'bold', cursor: 'pointer' 
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
      </div>
    </div>
  );
};

export default App;