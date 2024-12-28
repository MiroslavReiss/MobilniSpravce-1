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
    $confirmPassword = $_POST['confirm_password'] ?? '';

    // Validace
    if (empty($username) || empty($password) || empty($confirmPassword)) {
        $error = 'Všechna pole jsou povinná';
        logMessage("Registrace selhala: Prázdná pole - username: " . (!empty($username) ? 'vyplněno' : 'prázdné'));
    } elseif (strlen($username) < 3 || strlen($username) > 50) {
        $error = 'Uživatelské jméno musí mít 3-50 znaků';
        logMessage("Registrace selhala: Neplatná délka uživatelského jména - " . strlen($username) . " znaků");
    } elseif (strlen($password) < 6) {
        $error = 'Heslo musí mít alespoň 6 znaků';
        logMessage("Registrace selhala: Příliš krátké heslo");
    } elseif ($password !== $confirmPassword) {
        $error = 'Hesla se neshodují';
        logMessage("Registrace selhala: Neshodující se hesla");
    } else {
        try {
            // Kontrola, zda uživatel již neexistuje
            $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
            $stmt->execute([$username]);
            if ($stmt->fetch()) {
                $error = 'Uživatelské jméno již existuje';
                logMessage("Registrace selhala: Duplicitní uživatelské jméno - $username");
            } else {
                // Vytvoření nového uživatele
                $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare('INSERT INTO users (username, password) VALUES (?, ?)');

                try {
                    $stmt->execute([$username, $hashedPassword]);
                    logMessage("Úspěšná registrace uživatele: $username");

                    // Automatické přihlášení po registraci
                    if (login($username, $password)) {
                        header('Location: index.php');
                        exit;
                    } else {
                        $error = 'Automatické přihlášení selhalo';
                        logMessage("Automatické přihlášení selhalo po registraci: $username");
                    }
                } catch(PDOException $e) {
                    $error = 'Chyba při vytváření účtu';
                    logMessage("Chyba při vytváření účtu: " . $e->getMessage(), 'ERROR');
                }
            }
        } catch(PDOException $e) {
            $error = 'Chyba při kontrole uživatelského jména';
            logMessage("Chyba při kontrole uživatelského jména: " . $e->getMessage(), 'ERROR');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registrace</title>
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
    <div class="login-container">
        <form method="POST" class="login-form">
            <h1>Registrace</h1>

            <?php if (isset($error)): ?>
                <div class="error"><?php echo sanitize($error); ?></div>
            <?php endif; ?>

            <div class="form-group">
                <label for="username">Uživatelské jméno</label>
                <input type="text" id="username" name="username" 
                       value="<?php echo isset($_POST['username']) ? sanitize($_POST['username']) : ''; ?>" 
                       minlength="3" maxlength="50" required>
            </div>

            <div class="form-group">
                <label for="password">Heslo (min. 6 znaků)</label>
                <input type="password" id="password" name="password" 
                       minlength="6" required>
            </div>

            <div class="form-group">
                <label for="confirm_password">Potvrzení hesla</label>
                <input type="password" id="confirm_password" name="confirm_password" 
                       minlength="6" required>
            </div>

            <button type="submit">Registrovat se</button>

            <p class="text-center mt-4">
                Již máte účet? <a href="login.php">Přihlaste se</a>
            </p>
        </form>
    </div>
</body>
</html>