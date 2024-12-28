<?php
session_start();
require_once 'config.php';
require_once 'auth.php';

// Směrování na správnou stránku
$page = isset($_GET['page']) ? $_GET['page'] : 'dashboard';
$allowedPages = ['dashboard', 'todo', 'projects', 'chat', 'notifications', 'profile'];

if (!isLoggedIn() && $page !== 'login') {
    header('Location: login.php');
    exit;
}

// Header
include 'includes/header.php';

// Načtení obsahu stránky
if (in_array($page, $allowedPages)) {
    include "pages/{$page}.php";
} else {
    include 'pages/404.php';
}

// Footer
include 'includes/footer.php';
?>
