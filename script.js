// ========== APP DE ASISTENCIA ESCOLAR ==========

// ========== VARIABLES GLOBALES ==========
let attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
let qrCode = null;
let qrExpirationTime = null;
let videoStream = null;
let scanInterval = null;

// ========== INICIALIZACIÓN ==========
window.onload = function() {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const home = document.getElementById('home');
    
    if (splash) splash.classList.add('hidden');
    
    if (home) {
      home.classList.remove('hidden');
      home.classList.add('active');
    }
  }, 2000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registrado'))
      .catch(err => console.log('SW error:', err));
  }

  loadAlumnoProfile();
  renderAttendanceTable();
  renderAlumnoHistory();
  populateAlumnoFilter();
};

// ========== SISTEMA DE AUTENTICACIÓN ==========

function authMaestro() {
  const user = document.getElementById('user-maestro').value;
  const pass = document.getElementById('pass-maestro').value;

  // Credenciales de prueba: admin / 1234
  if (user === "admin" && pass === "1234") {
    sessionStorage.setItem('isMaestro', 'true');
    navigateTo('maestro');
    showNotification('Bienvenido, Maestro', 'success');
  } else {
    showNotification('Usuario o contraseña incorrectos', 'error');
  }
}

function authAlumno() {
  const matricula = document.getElementById('user-alumno').value;
  const pass = document.getElementById('pass-alumno').value;

  // Para alumnos: cualquier matrícula y contraseña '1234'
  if (matricula.trim() !== "" && pass === "1234") {
    sessionStorage.setItem('isAlumno', 'true');
    navigateTo('alumno');
    showNotification('Bienvenido, Alumno', 'success');
  } else {
    showNotification('Matrícula o contraseña incorrectos', 'error');
  }
}

function logout() {
  sessionStorage.clear();
  navigateTo('home');
  showNotification('Sesión cerrada', 'info');
}

// ========== NAVEGACIÓN PROTEGIDA ==========
function navigateTo(screenId) {
  // Protección de rutas: Si intenta ir a maestro/alumno sin login, lo mandamos al login
  if (screenId === 'maestro' && !sessionStorage.getItem('isMaestro')) {
    screenId = 'login-maestro';
  }
  if (screenId === 'alumno' && !sessionStorage.getItem('isAlumno')) {
    screenId = 'login-alumno';
  }

  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

// ========== NOTIFICACIONES ==========
function showNotification(message, type = 'info') {
  const toast = document.getElementById('notification-toast');
  const msgSpan = document.getElementById('notification-message');
  
  if (!toast || !msgSpan) return;

  toast.className = `notification ${type}`;
  msgSpan.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => closeNotification(), 4000);
}

function closeNotification() {
  const toast = document.getElementById('notification-toast');
  if (toast) toast.classList.add('hidden');
}

// ========== VISTA MAESTRO: GENERAR QR ==========
function generateQR() {
  const className = document.getElementById('class-name').value.trim();
  
  if (!className) {
    showNotification('Ingresa el nombre de la clase', 'warning');
    return;
  }

  const qrData = {
    class: className,
    timestamp: Date.now(),
    code: Math.random().toString(36).substring(2, 10).toUpperCase()
  };

  qrCode = qrData;
  qrExpirationTime = Date.now() + 5 * 60 * 1000;

  const canvas = document.getElementById('qr-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 200, 200);

  ctx.fillStyle = '#333';
  const cellSize = 20;
  const pattern = generateQRPattern(qrData.code);
  
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (pattern[y][x]) {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  document.getElementById('qr-display').classList.remove('hidden');
  showNotification('QR generado - válido por 5 minutos', 'success');

  setTimeout(() => {
    if (qrCode && qrCode.timestamp === qrData.timestamp) {
      qrCode = null;
      document.getElementById('qr-display').classList.add('hidden');
      showNotification('Código QR expirado', 'warning');
    }
  }, 5 * 60 * 1000);
}

function generateQRPattern(code) {
  const hash = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pattern = [];
  for (let i = 0; i < 10; i++) {
    const row = [];
    for (let j = 0; j < 10; j++) {
      row.push((hash + i * j) % 3 !== 0);
    }
    pattern.push(row);
  }
  return pattern;
}

// ========== VISTA MAESTRO: REPORTES ==========
function renderAttendanceTable(filteredData = null) {
  const data = filteredData || attendanceData;
  const tbody = document.getElementById('attendance-body');
  if (!tbody) return;
  
  tbody.innerHTML = data.length ? data.map(record => `
    <tr>
      <td>${formatDate(record.timestamp)}</td>
      <td>${record.class}</td>
      <td>${record.matricula}</td>
      <td>${record.nombre}</td>
      <td>${formatTime(record.timestamp)}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center;color:#666;">No hay registros</td></tr>';
}

function applyFilters() {
  const fecha = document.getElementById('filter-date').value;
  const alumno = document.getElementById('filter-alumno').value;

  let filtered = [...attendanceData];

  if (fecha) {
    filtered = filtered.filter(r => {
      const recordDate = new Date(r.timestamp).toISOString().split('T')[0];
      return recordDate === fecha;
    });
  }

  if (alumno) {
    filtered = filtered.filter(r => r.matricula === alumno);
  }

  renderAttendanceTable(filtered);
  showNotification(` ${filtered.length} registros encontrados`, 'info');
}

function populateAlumnoFilter() {
  const select = document.getElementById('filter-alumno');
  if (!select) return;

  const uniqueAlumnos = [...new Set(attendanceData.map(r => r.matricula))];
  
  select.innerHTML = '<option value="">Todos</option>' + 
    uniqueAlumnos.map(m => `<option value="${m}">${m}</option>`).join('');
}

function exportReport() {
  if (attendanceData.length === 0) {
    showNotification('No hay datos para exportar', 'warning');
    return;
  }

  let csv = 'Fecha,Clase,Matricula,Nombre,Correo,Hora\n';
  attendanceData.forEach(r => {
    csv += `${formatDate(r.timestamp)},${r.class},${r.matricula},${r.nombre},${r.correo},${formatTime(r.timestamp)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asistencia_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  showNotification('Reporte exportado', 'success');
}

// ========== VISTA ALUMNO: PERFIL ==========
function saveProfile() {
  const matricula = document.getElementById('alumno-matricula').value.trim();
  const nombre = document.getElementById('alumno-nombre').value.trim();
  const correo = document.getElementById('alumno-correo').value.trim();

  if (!matricula || !nombre || !correo) {
    showNotification('Completa todos los campos', 'warning');
    return;
  }

  const profile = { matricula, nombre, correo };
  localStorage.setItem('alumnoProfile', JSON.stringify(profile));
  
  showNotification('Perfil guardado', 'success');
}

function loadAlumnoProfile() {
  const profile = JSON.parse(localStorage.getItem('alumnoProfile'));
  const inputMatricula = document.getElementById('alumno-matricula');
  if (profile && inputMatricula) {
    inputMatricula.value = profile.matricula || '';
    document.getElementById('alumno-nombre').value = profile.nombre || '';
    document.getElementById('alumno-correo').value = profile.correo || '';
  }
}

// ========== VISTA ALUMNO: ESCANEAR QR ==========
async function startScanner() {
  const profile = JSON.parse(localStorage.getItem('alumnoProfile'));
  
  if (!profile) {
    showNotification('Primero completa tu perfil', 'warning');
    return;
  }

  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    const video = document.getElementById('camera');
    video.srcObject = videoStream;
    video.style.display = 'block';
    
    document.querySelector('.btn-primary[onclick="startScanner()"]').classList.add('hidden');
    document.querySelector('.btn-stop').classList.remove('hidden');
    document.getElementById('scan-status').textContent = 'Escaneando...';
    
    scanInterval = setTimeout(() => {
      if (qrCode) {
        registerAttendance(profile, qrCode);
      } else {
        showNotification('No hay código QR activo', 'warning');
        stopScanner();
      }
    }, 5000);
    
  } catch (err) {
    showNotification('Error al acceder a la cámara', 'error');
    console.error(err);
  }
}

function stopScanner() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  
  if (scanInterval) {
    clearTimeout(scanInterval);
    scanInterval = null;
  }
  
  const video = document.getElementById('camera');
  if (video) {
    video.style.display = 'none';
    video.srcObject = null;
  }
  
  const btnStart = document.querySelector('.btn-primary[onclick="startScanner()"]');
  const btnStop = document.querySelector('.btn-stop');
  if (btnStart) btnStart.classList.remove('hidden');
  if (btnStop) btnStop.classList.add('hidden');
  
  const status = document.getElementById('scan-status');
  if (status) status.textContent = 'Presiona el botón para escanear';
}

function registerAttendance(profile, qr) {
  if (Date.now() > qrExpirationTime) {
    showNotification('Código QR expirado', 'error');
    stopScanner();
    return;
  }

  const recent = attendanceData.find(r => 
    r.matricula === profile.matricula && 
    Date.now() - r.timestamp < 5 * 60 * 1000
  );

  if (recent) {
    showNotification('Ya te registraste recientemente', 'warning');
    stopScanner();
    return;
  }

  const record = {
    matricula: profile.matricula,
    nombre: profile.nombre,
    correo: profile.correo,
    class: qr.class,
    timestamp: Date.now(),
    code: qr.code
  };

  attendanceData.push(record);
  localStorage.setItem('attendanceData', JSON.stringify(attendanceData));

  showNotification(`Asistencia registrada: ${qr.class}`, 'success');
  stopScanner();
  renderAlumnoHistory();
  populateAlumnoFilter();
}

function renderAlumnoHistory() {
  const profile = JSON.parse(localStorage.getItem('alumnoProfile'));
  const container = document.getElementById('alumno-history');
  if (!profile || !container) return;

  const myRecords = attendanceData
    .filter(r => r.matricula === profile.matricula)
    .sort((a, b) => b.timestamp - a.timestamp);

  container.innerHTML = myRecords.length ? myRecords.map(r => `
    <div class="history-item">
      <div class="class">${r.class}</div>
      <div class="date">${formatDate(r.timestamp)} - ${formatTime(r.timestamp)}</div>
    </div>
  `).join('') : '<p style="color:#666;text-align:center;">Sin registros aún</p>';
}

// ========== UTILIDADES ==========
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('es-MX');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}