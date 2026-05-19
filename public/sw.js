// public/sw.js

// Listener para o evento 'install' do Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker instalado');
    // Força o novo Service Worker a se tornar ativo imediatamente
    self.skipWaiting();
});

// Listener para o evento 'activate'
self.addEventListener('activate', (event) => {
    console.log('Service Worker ativado');
    // Garante que o Service Worker controle a página imediatamente
    return self.clients.claim();
});

// Listener principal para mensagens vindas da página
self.addEventListener('message', (event) => {
    // Verifica se a mensagem é para mostrar uma notificação
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, options } = event.data.payload;
        
        // Garante que temos permissão antes de tentar mostrar a notificação
        if (self.Notification.permission === 'granted') {
             self.registration.showNotification(title, options);
        }
    }
});

// Opcional: Listener para cliques na notificação
self.addEventListener('notificationclick', (event) => {
    // Fecha a notificação
    event.notification.close();

    // Foca na janela do app se ela estiver aberta, ou abre uma nova
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                // Se o cliente (aba) estiver visível, foca nele
                if ('focus' in client && client.url === '/' && client.visibilityState === 'visible') {
                    return client.focus();
                }
            }
            // Se nenhuma aba estiver aberta ou visível, abre uma nova
            if (self.clients.openWindow) {
                return self.clients.openWindow('/admin/orders');
            }
        })
    );
});
