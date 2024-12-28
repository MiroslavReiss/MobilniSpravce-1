<?php
$userId = $_SESSION['user_id'];

// Načtení statistik
$todoStats = $pdo->prepare('
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN completed THEN 1 END) as completed
    FROM todos 
    WHERE user_id = ?
');
$todoStats->execute([$userId]);
$todoStats = $todoStats->fetch();

$projectStats = $pdo->prepare('
    SELECT COUNT(*) as count, AVG(progress) as avg_progress 
    FROM projects 
    WHERE user_id = ?
');
$projectStats->execute([$userId]);
$projectStats = $projectStats->fetch();
?>

<div class="dashboard">
    <h1>Vítejte, <?php echo sanitize($_SESSION['username']); ?></h1>
    
    <div class="stats-grid">
        <div class="stat-card">
            <h2>Úkoly</h2>
            <div class="progress-bar">
                <div class="progress" style="width: <?php echo ($todoStats['total'] > 0 ? ($todoStats['completed'] / $todoStats['total'] * 100) : 0); ?>%"></div>
            </div>
            <p><?php echo $todoStats['completed']; ?> z <?php echo $todoStats['total']; ?> dokončeno</p>
        </div>
        
        <div class="stat-card">
            <h2>Projekty</h2>
            <div class="progress-bar">
                <div class="progress" style="width: <?php echo $projectStats['avg_progress'] ?? 0; ?>%"></div>
            </div>
            <p><?php echo $projectStats['count']; ?> aktivních projektů</p>
        </div>
        
        <div class="stat-card">
            <h2>Chat</h2>
            <p>Komunikujte s týmem v reálném čase</p>
        </div>
    </div>
</div>
