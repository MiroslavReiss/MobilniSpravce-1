<?php
require_once 'config.php';
require_once 'auth.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $error = 'Všechna pole jsou povinná';
        logMessage("Přihlášení selhalo: Prázdná pole - username: " . (!empty($username) ? 'vyplněno' : 'prázdné'));
    } else {
        try {
            if (login($username, $password)) {
                logMessage("Úspěšné přihlášení uživatele: $username");
                header('Location: index.php');
                exit;
            } else {
                $error = 'Nesprávné přihlašovací údaje';
                logMessage("Neúspěšné přihlášení - neplatné údaje: $username");
            }
        } catch (Exception $e) {
            $error = 'Chyba při přihlašování';
            logMessage("Chyba při přihlašování: " . $e->getMessage(), 'ERROR');
        }
    }
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
                <input type="text" id="username" name="username" 
                       value="<?php echo isset($_POST['username']) ? sanitize($_POST['username']) : ''; ?>"
                       required>
            </div>

            <div class="form-group">
                <label for="password">Heslo</label>
                <input type="password" id="password" name="password" required>
            </div>

            <button type="submit">Přihlásit se</button>

            <p class="text-center mt-4">
                Nemáte účet? <a href="register.php">Zaregistrujte se</a>
            </p>
        </form>
    </div>
</body>
</html>