<?php
// Nastavení databáze
$dbHost = getenv('PGHOST');
$dbPort = getenv('PGPORT');
$dbName = getenv('PGDATABASE');
$dbUser = getenv('PGUSER');
$dbPass = getenv('PGPASSWORD');

try {
    $pdo = new PDO(
        "pgsql:host=$dbHost;port=$dbPort;dbname=$dbName",
        $dbUser,
        $dbPass
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Připojení k databázi selhalo: " . $e->getMessage());
}

// Nastavení aplikace
define('UPLOAD_DIR', 'uploads/');
if (!file_exists(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0777, true);
}

// Pomocné funkce
function sanitize($string) {
    return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
}

function jsonResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
?>
