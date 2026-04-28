// Registrar el Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado:', registration.scope);
      })
      .catch(error => {
        console.log('Error al registrar Service Worker:', error);
      });
  });
}

// Manejar instalación de la PWA
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const statusElement = document.getElementById('install-status');

// Detectar si ya está instalada
if (window.matchMedia('(display-mode: standalone)').matches) {
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