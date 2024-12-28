<?php
require_once '../config.php';
require_once '../auth.php';

requireLogin();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Pro polling kontrolujeme timestamp poslední notifikace
        $since = $_GET['since'] ?? 0;
        
        $stmt = $pdo->prepare('
            SELECT n.*, u.username as sender_username, u.display_name as sender_display_name
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.user_id = ? AND n.created_at > to_timestamp(?)
            ORDER BY n.created_at DESC
            LIMIT 50
        ');
        $stmt->execute([$_SESSION['user_id'], $since]);
        $notifications = $stmt->fetchAll();
        
        // Automaticky označit jako přečtené
        if (!empty($notifications)) {
            $stmt = $pdo->prepare('
                UPDATE notifications 
                SET read = true 
                WHERE user_id = ? AND read = false
            ');
            $stmt->execute([$_SESSION['user_id']]);
        }
        
        jsonResponse($notifications);
        break;
        
    case 'POST':
        // Toto API je jen pro systémové notifikace
        if ($_SESSION['username'] !== 'madkoala') {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['user_id'] ?? null;
        $type = $data['type'] ?? '';
        $message = $data['message'] ?? '';
        
        if (!$userId || !$type || !$message) {
            http_response_code(400);
            jsonResponse(['error' => 'User ID, type and message are required']);
        }
        
        $stmt = $pdo->prepare('
            INSERT INTO notifications (user_id, sender_id, type, message, read, created_at)
            VALUES (?, ?, ?, ?, false, CURRENT_TIMESTAMP)
            RETURNING *
        ');
        $stmt->execute([$userId, $_SESSION['user_id'], $type, $message]);
        $notification = $stmt->fetch();
        
        jsonResponse($notification);
        break;
        
    case 'DELETE':
        // Smazat všechny přečtené notifikace
        $stmt = $pdo->prepare('DELETE FROM notifications WHERE user_id = ? AND read = true');
        $stmt->execute([$_SESSION['user_id']]);
        
        jsonResponse(['success' => true]);
        break;
}
?>
