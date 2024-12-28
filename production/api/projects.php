<?php
require_once '../config.php';
require_once '../auth.php';

requireLogin();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['id'])) {
            // Get single project
            $stmt = $pdo->prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?');
            $stmt->execute([$_GET['id'], $_SESSION['user_id']]);
            $project = $stmt->fetch();
            
            if (!$project) {
                http_response_code(404);
                jsonResponse(['error' => 'Project not found']);
            }
            
            jsonResponse($project);
        } else {
            // Get all projects
            $stmt = $pdo->prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC');
            $stmt->execute([$_SESSION['user_id']]);
            $projects = $stmt->fetchAll();
            jsonResponse($projects);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        
        if (empty($title)) {
            http_response_code(400);
            jsonResponse(['error' => 'Title is required']);
        }
        
        $stmt = $pdo->prepare('
            INSERT INTO projects (title, description, progress, user_id) 
            VALUES (?, ?, 0, ?) 
            RETURNING id, title, description, progress
        ');
        $stmt->execute([$title, $description, $_SESSION['user_id']]);
        $project = $stmt->fetch();
        jsonResponse($project);
        break;
        
    case 'PATCH':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            jsonResponse(['error' => 'ID is required']);
        }
        
        // Ověření vlastnictví
        $stmt = $pdo->prepare('SELECT user_id FROM projects WHERE id = ?');
        $stmt->execute([$id]);
        $project = $stmt->fetch();
        
        if (!$project || $project['user_id'] !== $_SESSION['user_id']) {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $updates = [];
        $params = [];
        
        // Povoleno pouze pro madkoala uživatele
        if ($_SESSION['username'] === 'madkoala') {
            if (isset($data['title'])) {
                $updates[] = 'title = ?';
                $params[] = $data['title'];
            }
            if (isset($data['description'])) {
                $updates[] = 'description = ?';
                $params[] = $data['description'];
            }
        }
        
        // Progress může upravit každý
        if (isset($data['progress'])) {
            $progress = max(0, min(100, (int)$data['progress']));
            $updates[] = 'progress = ?';
            $params[] = $progress;
        }
        
        if (empty($updates)) {
            http_response_code(400);
            jsonResponse(['error' => 'No valid fields to update']);
        }
        
        $params[] = $id;
        $stmt = $pdo->prepare('
            UPDATE projects 
            SET ' . implode(', ', $updates) . ' 
            WHERE id = ? 
            RETURNING *
        ');
        $stmt->execute($params);
        $updatedProject = $stmt->fetch();
        jsonResponse($updatedProject);
        break;
        
    case 'DELETE':
        if ($_SESSION['username'] !== 'madkoala') {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }
        
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            jsonResponse(['error' => 'ID is required']);
        }
        
        // Smazat nejdřív všechny poznámky projektu
        $stmt = $pdo->prepare('DELETE FROM project_notes WHERE project_id = ?');
        $stmt->execute([$id]);
        
        // Pak smazat projekt
        $stmt = $pdo->prepare('DELETE FROM projects WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $_SESSION['user_id']]);
        
        jsonResponse(['success' => true]);
        break;
}
?>
