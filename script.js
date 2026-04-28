// ========== APP DE ASISTENCIA ESCOLAR ==========

// ========== VARIABLES GLOBALES ==========
let attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
let qrCode = null;
let qrExpirationTime = null;
let videoStream = null;
let scanInterval = null;

// ========== INICIALIZACIÓN ==========
// Usar window.onload para asegurar que todo está cargado
window.onload = function() {
  // Splash screen - ocultar después de 2 segundos
// Splash screen - ocultar después de 2 segundos
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const home = document.getElementById('home');
    
    if (splash) splash.classList.add('hidden');
    
    if (home) {
      home.classList.remove('hidden'); // <--- Línea crucial
      home.classList.add('active');
    }
  }, 2000);

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registrado'))
      .catch(err => console.log('SW error:', err));
  }

  // Cargar datos guardados
  if (typeof loadAlumnoProfile === 'function') loadAlumnoProfile();
  if (typeof renderAttendanceTable === 'function') renderAttendanceTable();
  if (typeof renderAlumnoHistory === 'function') renderAlumnoHistory();
  if (typeof populateAlumnoFilter === 'function') populateAlumnoFilter();
};

// ========== NAVEGACIÓN ==========
function navigateTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden'); // Asegura que todas se oculten
  });
  
  const target = document.getElementById(screenId);
  target.classList.remove('hidden'); // Muestra la seleccionada
  target.classList.add('active');
}

// ========== NOTIFICACIONES ==========
function showNotification(message, type = 'info') {
  const toast = document.getElementById('notification-toast');
  const msgSpan = document.getElementById('notification-message');
  
  toast.className = `notification ${type}`;
  msgSpan.textContent = message;
  toast.classList.remove('hidden');
  
  setTimeout(() => closeNotification(), 4000);
}

function closeNotification() {
  document.getElementById('notification-toast').classList.add('hidden');
}

// ========== VISTA MAESTRO: GENERAR QR ==========
function generateQR() {
  const className = document.getElementById('class-name').value.trim();
  
  if (!className) {
    showNotification('Ingresa el nombre de la clase', 'warning');
    return;
  }

  // Generar código único
  const qrData = {
    class: className,
    timestamp: Date.now(),
    code: Math.random().toString(36).substring(2, 10).toUpperCase()
  };

  qrCode = qrData;
  qrExpirationTime = Date.now() + 5 * 60 * 1000; // 5 minutos

  // Generar QR visual (simulado)
  const canvas = document.getElementById('qr-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;

  // Fondo blanco
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 200, 200);

  // Dibujar patrón QR simulado
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

  // Mostrar QR
  document.getElementById('qr-display').classList.remove('hidden');
  showNotification('QR generado - válido por 5 minutos', 'success');

  // Auto-expirar
  setTimeout(() => {
    if (qrCode && qrCode.timestamp === qrData.timestamp) {
      qrCode = null;
      document.getElementById('qr-display').classList.add('hidden');
      showNotification('Código QR expirado', 'warning');
    }
  }, 5 * 60 * 1000);
}

function generateQRPattern(code) {
  // Patrón simulado basado en el código
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
  const uniqueAlumnos = [...new Set(attendanceData.map(r => r.matricula))];
  const select = document.getElementById('filter-alumno');
  
  select.innerHTML = '<option value="">Todos</option>' + 
    uniqueAlumnos.map(m => `<option value="${m}">${m}</option>`).join('');
}

function exportReport() {
  if (attendanceData.length === 0) {
    showNotification('No hay datos para exportar', 'warning');
    return;
  }

  // Crear CSV
  let csv = 'Fecha,Clase,Matricula,Nombre,Correo,Hora\n';
  attendanceData.forEach(r => {
    csv += `${formatDate(r.timestamp)},${r.class},${r.matricula},${r.nombre},${r.correo},${formatTime(r.timestamp)}\n`;
  });

  // Descargar
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
  if (profile) {
    document.getElementById('alumno-matricula').value = profile.matricula || '';
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
    
    // Simular detección después de 3 segundos (para demo)
    // En producción usarías una librería como html5-qrcode
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
  video.style.display = 'none';
  video.srcObject = null;
  
  document.querySelector('.btn-primary[onclick="startScanner()"]').classList.remove('hidden');
  document.querySelector('.btn-stop').classList.add('hidden');
  document.getElementById('scan-status').textContent = 'Presiona el botón para escanear';
}

function registerAttendance(profile, qr) {
  // Verificar si el código no ha expirado
  if (Date.now() > qrExpirationTime) {
    showNotification('Código QR expirado', 'error');
    stopScanner();
    return;
  }

  // Verificar si ya se registró en los últimos 5 minutos
  const recent = attendanceData.find(r => 
    r.matricula === profile.matricula && 
    Date.now() - r.timestamp < 5 * 60 * 1000
  );

  if (recent) {
    showNotification('Ya te registraste recientemente', 'warning');
    stopScanner();
    return;
  }

  // Registrar asistencia
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
  if (!profile) return;

  const myRecords = attendanceData
    .filter(r => r.matricula === profile.matricula)
    .sort((a, b) => b.timestamp - a.timestamp);

  const container = document.getElementById('alumno-history');
  
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
  statusElement.textContent = '✅ La app está instalada y funcionando';
  statusElement.style.background = '#d4edda';
  statusElement.style.color = '#155724';
} else {
  // Escuchar evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    statusElement.textContent = '📲 Puedes instalar esta app en tu dispositivo';
    installBtn.style.display = 'block';
  });

  // Botón de instalación
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Resultado:', outcome);
      deferredPrompt = null;
      installBtn.style.display = 'none';
    }
  });

  // Si no hay soporte
  if (!('serviceWorker' in navigator)) {
    statusElement.textContent = '⚠️ Tu navegador no soporta PWAs';
  } else {
    statusElement.textContent = '✅ Navegador compatible. ¡Service Worker activo!';
  }
}

// Notificaciones push (opcional - para futuro)
if ('Notification' in window) {
  console.log('Notificaciones soportadas');
}