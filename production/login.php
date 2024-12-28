<?php
require_once 'config.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (login($username, $password)) {
        header('Location: index.php');
        exit;
    }
    
    $error = 'Nesprávné přihlašovací údaje';
}
?>
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Přihlášení</title>
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
    <div class="login-container">
        <form method="POST" class="login-form">
            <h1>Přihlášení</h1>
            
            <?php if (isset($error)): ?>
                <div class="error"><?php echo sanitize($error); ?></div>
            <?php endif; ?>
            
            <div class="form-group">
                <label for="username">Uživatelské jméno</label>
                <input type="text" id="username" name="username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Heslo</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit">Přihlásit se</button>
        </form>
    </div>
</body>
</html>
