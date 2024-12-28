# Project Management App - Production Deployment Guide

Tato verze aplikace je připravena pro nasazení na běžný hosting. Zde je návod jak aplikaci nasadit:

## Požadavky
- Node.js v16 nebo vyšší
- PostgreSQL databáze (doporučeno Neon.tech pro serverless databázi)
- Hosting s podporou Node.js (např. Vercel, Railway, Heroku, nebo běžný VPS)

## Struktura projektu
```
production/
  ├── backend/        # Express server
  │   └── server.js   
  ├── frontend/       # React aplikace
  │   ├── src/        
  │   └── public/     
  └── package.json    
```

## Postup nasazení

1. Naklonujte repozitář:
```bash
git clone <repository-url>
cd production
```

2. Nainstalujte závislosti:
```bash
npm run install-all
```

3. Nastavte environment proměnné:
```
DATABASE_URL=<your-postgresql-database-url>
SESSION_SECRET=<your-session-secret>
PORT=3000 (volitelné)
NODE_ENV=production
```

4. Sestavte frontend:
```bash
npm run build
```

5. Spusťte server:
```bash
npm start
```

## Nasazení na různé platformy

### Vercel
1. Importujte projekt do Vercelu
2. Nastavte build command na `npm run build`
3. Nastavte output directory na `frontend/build`
4. Nastavte environment proměnné v Vercel dashboardu

### Běžný VPS/Hosting
1. Nahrajte soubory na server
2. Nainstalujte závislosti: `npm run install-all`
3. Sestavte frontend: `npm run build`
4. Spusťte server pomocí PM2:
```bash
npm install -g pm2
pm2 start backend/server.js
```

## Důležité poznámky
- Ujistěte se, že máte správně nastavenou PostgreSQL databázi
- V produkčním prostředí vždy nastavte silné SESSION_SECRET
- Pro upload souborů vytvořte složku `backend/uploads` s odpovídajícími právy
- Pro WebSocket zajistěte, že váš hosting podporuje WebSocket připojení
