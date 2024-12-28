</main>
    
    <?php if (isLoggedIn()): ?>
    <nav class="bottom-nav">
        <a href="?page=dashboard" class="nav-item <?php echo $page === 'dashboard' ? 'active' : ''; ?>">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Nástěnka</span>
        </a>
        
        <a href="?page=todo" class="nav-item <?php echo $page === 'todo' ? 'active' : ''; ?>">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span>ToDo</span>
        </a>
        
        <a href="?page=projects" class="nav-item <?php echo $page === 'projects' ? 'active' : ''; ?>">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 7v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                <path d="M2 7h20"/>
                <path d="M7 12h10"/>
                <path d="M7 16h10"/>
            </svg>
            <span>Projekty</span>
        </a>
        
        <a href="?page=chat" class="nav-item <?php echo $page === 'chat' ? 'active' : ''; ?>">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Chat</span>
        </a>
        
        <a href="?page=notifications" class="nav-item <?php echo $page === 'notifications' ? 'active' : ''; ?>">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span>Oznámení</span>
        </a>
    </nav>
    <?php endif; ?>
    
    <script>
    // Kontrola nových oznámení
    function checkNotifications() {
        fetch('api/notifications.php')
            .then(response => response.json())
            .then(data => {
                const unreadCount = data.filter(n => !n.read).length;
                const notifBadge = document.querySelector('.notifications-badge');
                if (unreadCount > 0) {
                    notifBadge.textContent = unreadCount;
                    notifBadge.style.display = 'block';
                } else {
                    notifBadge.style.display = 'none';
                }
            });
    }
    
    // Kontroluj každých 30 sekund
    if (document.querySelector('.bottom-nav')) {
        checkNotifications();
        setInterval(checkNotifications, 30000);
    }
    </script>
</body>
</html>
