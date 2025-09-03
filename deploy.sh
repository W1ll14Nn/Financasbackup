#!/bin/bash

# 🚀 Script de Deploy - Aplicativo de Controle Financeiro
# Este script automatiza o processo de deploy em servidor próprio

echo "💰 Iniciando deploy do Aplicativo de Controle Financeiro..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para mostrar status
show_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

show_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

show_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    show_error "Docker não está instalado. Instale o Docker primeiro."
    echo "Visite: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    show_error "Docker Compose não está instalado."
    echo "Visite: https://docs.docker.com/compose/install/"
    exit 1
fi

show_success "Docker e Docker Compose encontrados!"

# Criar arquivos .env se não existirem
if [ ! -f backend/.env ]; then
    show_status "Criando arquivo backend/.env..."
    cp backend/.env.example backend/.env
    show_warning "Configure o arquivo backend/.env com suas credenciais MongoDB"
fi

if [ ! -f frontend/.env ]; then
    show_status "Criando arquivo frontend/.env..."
    cp frontend/.env.example frontend/.env
    show_warning "Configure o arquivo frontend/.env com a URL do seu backend"
fi

# Menu de opções
echo
echo "Escolha uma opção de deploy:"
echo "1) 🐳 Deploy com Docker (Recomendado)"
echo "2) 💻 Setup local para desenvolvimento"
echo "3) 🏭 Build para produção"
echo "4) 🧹 Limpar containers e volumes"

read -p "Digite sua escolha (1-4): " choice

case $choice in
    1)
        show_status "Iniciando deploy com Docker..."
        
        # Parar containers existentes
        docker-compose down
        
        # Build e start dos containers
        show_status "Building containers..."
        docker-compose up --build -d
        
        # Aguardar containers iniciarem
        show_status "Aguardando containers iniciarem..."
        sleep 30
        
        # Verificar status
        if docker-compose ps | grep -q "Up"; then
            show_success "Aplicativo deployado com sucesso!"
            echo
            echo "🌐 URLs disponíveis:"
            echo "   Frontend: http://localhost:3000"
            echo "   Backend API: http://localhost:8000"
            echo "   MongoDB: mongodb://localhost:27017"
            echo
            echo "📊 Para ver logs:"
            echo "   docker-compose logs -f"
            echo
            echo "🛑 Para parar:"
            echo "   docker-compose down"
        else
            show_error "Erro no deploy. Verifique os logs:"
            docker-compose logs
        fi
        ;;
        
    2)
        show_status "Configurando ambiente de desenvolvimento..."
        
        # Backend setup
        show_status "Configurando backend..."
        cd backend
        
        if command -v python3 &> /dev/null; then
            python3 -m venv venv
            source venv/bin/activate
            pip install -r requirements.txt
            show_success "Backend configurado!"
        else
            show_error "Python3 não encontrado"
            exit 1
        fi
        
        cd ..
        
        # Frontend setup
        show_status "Configurando frontend..."
        cd frontend
        
        if command -v npm &> /dev/null; then
            npm install
            show_success "Frontend configurado!"
        else
            show_error "npm não encontrado"
            exit 1
        fi
        
        cd ..
        
        echo
        show_success "Ambiente de desenvolvimento configurado!"
        echo
        echo "Para executar:"
        echo "Backend:  cd backend && source venv/bin/activate && uvicorn server:app --reload"
        echo "Frontend: cd frontend && npm start"
        ;;
        
    3)
        show_status "Building para produção..."
        
        # Build backend
        show_status "Building backend..."
        docker build -t financas-backend ./backend
        
        # Build frontend
        show_status "Building frontend..."
        cd frontend
        npm install
        npm run build
        cd ..
        
        show_success "Build de produção concluído!"
        echo
        echo "Arquivos prontos para deploy:"
        echo "- Backend: imagem Docker 'financas-backend'"
        echo "- Frontend: arquivos em /frontend/build"
        ;;
        
    4)
        show_warning "Limpando containers e volumes..."
        docker-compose down -v
        docker system prune -f
        show_success "Limpeza concluída!"
        ;;
        
    *)
        show_error "Opção inválida"
        exit 1
        ;;
esac

echo
show_success "Deploy script concluído!"
echo "Para mais informações, consulte o README.md"