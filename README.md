# 💰 Aplicativo de Controle Financeiro

Um aplicativo completo de controle financeiro desenvolvido com React, FastAPI e MongoDB.

## 🚀 Funcionalidades

- ✅ **Gestão de Transações**: Adicione receitas e despesas com facilidade
- ✅ **Despesas Fixas**: Controle gastos mensais fixos com status de pagamento
- ✅ **Sistema de Alertas**: Configure limites mensais e receba alertas
- ✅ **Gráficos Interativos**: Visualize dados com gráficos de barras e linha
- ✅ **Exportação**: Baixe relatórios em Excel (.xlsx) e CSV
- ✅ **Interface Responsiva**: Funciona perfeitamente em desktop e mobile
- ✅ **Design Moderno**: Interface elegante com componentes Shadcn/UI

## 🛠️ Tecnologias

**Backend:**
- FastAPI (Python)
- MongoDB com Motor (async)
- OpenPyXL para exportação Excel
- Uvicorn como servidor ASGI

**Frontend:**
- React 19
- Tailwind CSS
- Shadcn/UI Components
- Recharts para gráficos
- Axios para requisições HTTP

## 📦 Instalação e Deploy

### Pré-requisitos
- Python 3.8+
- Node.js 16+
- MongoDB (local ou Atlas)

### 1. Clone o repositório
```bash
git clone [seu-repositorio]
cd controle-financeiro
```

### 2. Configuração do Backend

```bash
cd backend
pip install -r requirements.txt
```

Crie arquivo `.env` no diretório backend:
```env
MONGO_URL=mongodb://localhost:27017
# Para MongoDB Atlas use:
# MONGO_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/database

DB_NAME=financas_app
CORS_ORIGINS=http://localhost:3000,https://seudominio.com
```

Execute o backend:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### 3. Configuração do Frontend

```bash
cd frontend
npm install
```

Crie arquivo `.env` no diretório frontend:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
# Para produção use:
# REACT_APP_BACKEND_URL=https://api.seudominio.com
```

Execute o frontend:
```bash
npm start
```

### 4. Build para Produção

**Backend:**
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8000
```

**Frontend:**
```bash
npm run build
# Arquivos gerados em /build podem ser servidos por Nginx, Apache, etc.
```

## 🌐 Deploy em Servidor Próprio

### Opção 1: Docker (Recomendado)

Crie `docker-compose.yml`:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=financas_app
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8000

volumes:
  mongodb_data:
```

Execute:
```bash
docker-compose up -d
```

### Opção 2: Serviços Cloud

**Backend (Heroku, Railway, DigitalOcean):**
1. Configure MongoDB Atlas
2. Configure variáveis de ambiente
3. Deploy via Git

**Frontend (Vercel, Netlify):**
1. Configure REACT_APP_BACKEND_URL
2. Deploy via Git
3. Build automático

## 📊 APIs Disponíveis

### Transações
- `POST /api/transactions` - Criar transação
- `GET /api/transactions` - Listar transações
- `DELETE /api/transactions/{id}` - Deletar transação

### Despesas Fixas
- `POST /api/fixed-expenses` - Criar despesa fixa
- `GET /api/fixed-expenses` - Listar despesas fixas
- `PUT /api/fixed-expenses/{id}` - Atualizar status
- `DELETE /api/fixed-expenses/{id}` - Deletar despesa fixa

### Relatórios
- `GET /api/reports/{mes}/{ano}` - Relatório mensal
- `GET /api/dashboard/{ano}` - Dashboard anual

### Exportação
- `GET /api/export/excel/{mes}/{ano}` - Exportar Excel
- `GET /api/export/csv/{mes}/{ano}` - Exportar CSV

### Alertas
- `POST /api/alerts` - Configurar limite
- `GET /api/alerts` - Listar alertas

## 🎨 Personalização

### Cores e Tema
Edite `/frontend/src/App.css` para personalizar:
- Cores primárias
- Gradientes
- Fontes
- Espaçamentos

### Componentes
Todos os componentes UI estão em `/frontend/src/components/ui/`

## 📱 PWA (Progressive Web App)

O aplicativo é compatível com PWA e pode ser instalado em dispositivos móveis:
1. Acesse via navegador móvel
2. Toque em "Adicionar à tela inicial"
3. Use como aplicativo nativo

## 🔧 Manutenção

### Backup do Banco
```bash
mongodump --db financas_app --out backup/
```

### Logs
```bash
# Backend logs
tail -f logs/app.log

# Frontend logs (desenvolvimento)
npm start
```

### Atualizações
```bash
# Backend
pip install -r requirements.txt --upgrade

# Frontend  
npm update
```

## 📄 Licença

Este projeto é de uso pessoal. Desenvolvido para controle financeiro individual.

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique logs do backend e frontend
2. Confirme configuração do MongoDB
3. Valide variáveis de ambiente
4. Teste APIs via Postman/cURL

---

**Desenvolvido com ❤️ para controle financeiro pessoal**