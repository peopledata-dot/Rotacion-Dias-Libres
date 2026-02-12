export const obtenerDiasDelMes = (mesNombre, semanaNombre) => {
  const meses = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
    'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };

  const mesIndex = meses[mesNombre];
  const anio = 2026;
  const dias = [];
  
  // Encontrar el primer lunes del mes
  let fecha = new Date(anio, mesIndex, 1);
  while (fecha.getDay() !== 1) { // 1 es Lunes
    fecha.setDate(fecha.getDate() + 1);
  }

  // Ajustar según la semana seleccionada (Semana 1 = +0 días, Semana 2 = +7 días, etc.)
  const numSemana = parseInt(semanaNombre.split(' ')[1]) - 1;
  fecha.setDate(fecha.getDate() + (numSemana * 7));

  // Generar los 7 días de esa semana
  for (let i = 0; i < 7; i++) {
    const d = new Date(fecha);
    d.setDate(fecha.getDate() + i);
    // Solo agregar si pertenece al año 2025 (evita desbordamientos extraños)
    dias.push(d.getMonth() === mesIndex ? d.getDate() : d.getDate());
  }

  return dias;
};