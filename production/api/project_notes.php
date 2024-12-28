<?php
require_once '../config.php';
require_once '../auth.php';

requireLogin();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $projectId = $_GET['project_id'] ?? null;
        if (!$projectId) {
            http_response_code(400);
            jsonResponse(['error' => 'Project ID is required']);
        }
        
        // Ověření přístupu k projektu
        $stmt = $pdo->prepare('SELECT user_id FROM projects WHERE id = ?');
        $stmt->execute([$projectId]);
        $project = $stmt->fetch();
        
        if (!$project || $project['user_id'] !== $_SESSION['user_id']) {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        // Načtení poznámek včetně informací o uživateli
        $stmt = $pdo->prepare('
            SELECT n.*, u.username, u.display_name 
            FROM project_notes n 
            JOIN users u ON n.user_id = u.id 
            WHERE n.project_id = ? 
            ORDER BY n.created_at DESC
        ');
        $stmt->execute([$projectId]);
        $notes = $stmt->fetchAll();
        jsonResponse($notes);
        break;
        
    case 'POST':
        $projectId = $_GET['project_id'] ?? null;
        if (!$projectId) {
            http_response_code(400);
            jsonResponse(['error' => 'Project ID is required']);
        }
        
        // Ověření přístupu k projektu
        $stmt = $pdo->prepare('SELECT user_id FROM projects WHERE id = ?');
        $stmt->execute([$projectId]);
        $project = $stmt->fetch();
        
        if (!$project || $project['user_id'] !== $_SESSION['user_id']) {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $content = $data['content'] ?? '';
        
        if (empty($content)) {
            http_response_code(400);
            jsonResponse(['error' => 'Content is required']);
        }
        
        $stmt = $pdo->prepare('
            INSERT INTO project_notes (content, project_id, user_id, created_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP) 
            RETURNING id, content, created_at
        ');
        $stmt->execute([$content, $projectId, $_SESSION['user_id']]);
        $note = $stmt->fetch();
        
        // Přidat uživatelské informace k odpovědi
        $note['username'] = $_SESSION['username'];
        $note['display_name'] = $_SESSION['display_name'] ?? null;
        
        jsonResponse($note);
        break;
        
    case 'PATCH':
        if ($_SESSION['username'] !== 'madkoala') {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        $projectId = $_GET['project_id'] ?? null;
        $noteId = $_GET['id'] ?? null;
        if (!$projectId || !$noteId) {
            http_response_code(400);
            jsonResponse(['error' => 'Project ID and Note ID are required']);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $content = $data['content'] ?? '';
        
        if (empty($content)) {
            http_response_code(400);
            jsonResponse(['error' => 'Content is required']);
        }
        
        $stmt = $pdo->prepare('
            UPDATE project_notes 
            SET content = ? 
            WHERE id = ? AND project_id = ? 
            RETURNING id, content, created_at
        ');
        $stmt->execute([$content, $noteId, $projectId]);
        $note = $stmt->fetch();
        
        if (!$note) {
            http_response_code(404);
            jsonResponse(['error' => 'Note not found']);
        }
        
        // Přidat uživatelské informace k odpovědi
        $note['username'] = $_SESSION['username'];
        $note['display_name'] = $_SESSION['display_name'] ?? null;
        
        jsonResponse($note);
        break;
        
    case 'DELETE':
        if ($_SESSION['username'] !== 'madkoala') {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        $projectId = $_GET['project_id'] ?? null;
        $noteId = $_GET['id'] ?? null;
        if (!$projectId || !$noteId) {
            http_response_code(400);
            jsonResponse(['error' => 'Project ID and Note ID are required']);
        }
        
        $stmt = $pdo->prepare('DELETE FROM project_notes WHERE id = ? AND project_id = ?');
        $stmt->execute([$noteId, $projectId]);
        
        jsonResponse(['success' => true]);
        break;
}
?>
