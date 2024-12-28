<?php
require_once '../config.php';
require_once '../auth.php';

requireLogin();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $stmt = $pdo->prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$_SESSION['user_id']]);
        $todos = $stmt->fetchAll();
        jsonResponse($todos);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $title = $data['title'] ?? '';

        if (empty($title)) {
            http_response_code(400);
            jsonResponse(['error' => 'Title is required']);
        }

        $stmt = $pdo->prepare('INSERT INTO todos (title, user_id) VALUES (?, ?)');
        $stmt->execute([$title, $_SESSION['user_id']]);
        $todoId = $pdo->lastInsertId();

        // Fetch the created todo
        $stmt = $pdo->prepare('SELECT * FROM todos WHERE id = ?');
        $stmt->execute([$todoId]);
        $todo = $stmt->fetch();
        jsonResponse($todo);
        break;

    case 'PATCH':
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            jsonResponse(['error' => 'ID is required']);
        }

        // Ověření vlastnictví
        $stmt = $pdo->prepare('SELECT user_id FROM todos WHERE id = ?');
        $stmt->execute([$id]);
        $todo = $stmt->fetch();

        if (!$todo || $todo['user_id'] !== $_SESSION['user_id']) {
            http_response_code(403);
            jsonResponse(['error' => 'Unauthorized']);
        }

        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['completed'])) {
            $stmt = $pdo->prepare('UPDATE todos SET completed = ? WHERE id = ?');
            $stmt->execute([$data['completed'], $id]);

            // Fetch updated todo
            $stmt = $pdo->prepare('SELECT * FROM todos WHERE id = ?');
            $stmt->execute([$id]);
            $updatedTodo = $stmt->fetch();
            jsonResponse($updatedTodo);
        }

        if (isset($data['title']) && $_SESSION['username'] === 'madkoala') {
            $stmt = $pdo->prepare('UPDATE todos SET title = ? WHERE id = ?');
            $stmt->execute([$data['title'], $id]);

            // Fetch updated todo
            $stmt = $pdo->prepare('SELECT * FROM todos WHERE id = ?');
            $stmt->execute([$id]);
            $updatedTodo = $stmt->fetch();
            jsonResponse($updatedTodo);
        }
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

        $stmt = $pdo->prepare('DELETE FROM todos WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $_SESSION['user_id']]);
        jsonResponse(['success' => true]);
        break;
}
?>