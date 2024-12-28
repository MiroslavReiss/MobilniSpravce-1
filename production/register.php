<?php
require_once 'config.php';
require_once 'auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    
    // Validace
    if (empty($username) || empty($password) || empty($confirmPassword)) {
        $error = 'Všechna pole jsou povinná';
    } elseif ($password !== $confirmPassword) {
        $error = 'Hesla se neshodují';
    } else {
        // Kontrola, zda uživatel již neexistuje
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            $error = 'Uživatelské jméno již existuje';
        } else {
            // Vytvoření nového uživatele
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO users (username, password) VALUES (?, ?)');
            
            try {
                $stmt->execute([$username, $hashedPassword]);
                // Automatické přihlášení po registraci
                if (login($username, $password)) {
                    header('Location: index.php');
                    exit;
                }
            } catch(PDOException $e) {
                $error = 'Chyba při vytváření účtu';
            }
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
                <input type="text" id="username" name="username" value="<?php echo isset($_POST['username']) ? sanitize($_POST['username']) : ''; ?>" required>
            </div>
            
            <div class="form-group">
                <label for="password">Heslo</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <div class="form-group">
                <label for="confirm_password">Potvrzení hesla</label>
                <input type="password" id="confirm_password" name="confirm_password" required>
            </div>
            
            <button type="submit">Registrovat se</button>
            
            <p class="text-center mt-4">
                Již máte účet? <a href="login.php">Přihlaste se</a>
            </p>
        </form>
    </div>
</body>
</html>
