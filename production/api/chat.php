<?php
require_once '../config.php';
require_once '../auth.php';

requireLogin();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Pro polling kontrolujeme ID poslední zprávy
        $since = $_GET['since'] ?? 0;
        
        $stmt = $pdo->prepare('
            SELECT m.*, u.username, u.display_name
            FROM chat_messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.id > ?
            ORDER BY m.created_at DESC
            LIMIT 50
        ');
        $stmt->execute([$since]);
        $messages = $stmt->fetchAll();
        
        jsonResponse($messages);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $message = $data['message'] ?? '';
        
        if (empty($message)) {
            http_response_code(400);
            jsonResponse(['error' => 'Message is required']);
        }
        
        $stmt = $pdo->prepare('
            INSERT INTO chat_messages (user_id, message, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            RETURNING id, message, created_at
        ');
        $stmt->execute([$_SESSION['user_id'], $message]);
        $chat = $stmt->fetch();
        
        // Přidat uživatelské informace k odpovědi
        $chat['username'] = $_SESSION['username'];
        $chat['display_name'] = $_SESSION['display_name'] ?? null;
        
        jsonResponse($chat);
        break;
        
    case 'DELETE':
        // Smazat zprávy je povoleno pouze pro madkoala
        if ($_SESSION['username'] !== 'madkoala') {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            jsonResponse(['error' => 'Message ID is required']);
        }
        
        $stmt = $pdo->prepare('DELETE FROM chat_messages WHERE id = ?');
        $stmt->execute([$id]);
        
        jsonResponse(['success' => true]);
        break;
}
?>
