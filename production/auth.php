<?php
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function login($username, $password) {
    global $pdo;
    
    $stmt = $pdo->prepare('SELECT id, username, password FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        return true;
    }
    
    return false;
}

function logout() {
    session_destroy();
    header('Location: login.php');
    exit;
}

function requireLogin() {
    if (!isLoggedIn()) {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}
?>
