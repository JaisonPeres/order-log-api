# API de Upload de Arquivo de Pedidos

## Descrição

Uma API moderna construída com Fastify, Zod para validação e Swagger para documentação. Este projeto é executado como um servidor TypeScript tradicional.

## Escolhas Tecnológicas e Padrões Arquiteturais

Este projeto foi desenvolvido seguindo princípios de arquitetura limpa (Clean Architecture) e design orientado a domínio (DDD), com uma clara separação de responsabilidades entre as camadas da aplicação.

### Arquitetura

- **Clean Architecture**: Separação clara entre domínio, aplicação e infraestrutura
- **Domain-Driven Design (DDD)**: Organização do código em torno do domínio de negócio
- **Dependency Injection**: Inversão de controle para facilitar testes e manutenção
- **Repository Pattern**: Abstração da camada de persistência de dados
- **Use Case Pattern**: Implementação de casos de uso isolados e testáveis

### Stack Tecnológica

- **Framework Backend**: Fastify (escolhido pela performance superior e baixo overhead em comparação com Express)
- **Validação**: Zod com fastify-type-provider-zod (integração tipo-segura entre validação e TypeScript)
- **Documentação**: Swagger via @fastify/swagger e @fastify/swagger-ui (geração automática de documentação)
- **Banco de Dados**: PostgreSQL com Drizzle ORM (ORM leve e tipo-seguro)
- **Runtime**: Node.js
- **Linguagem**: TypeScript (tipagem estática para maior segurança e manutenibilidade)
- **Gerenciador de Pacotes**: pnpm (mais eficiente em termos de espaço em disco e velocidade)
- **Opções de Implantação**: Servidor tradicional
- **Ambiente**: dotenv para configuração

### Justificativas das Escolhas

- **Fastify**: Escolhido por sua performance superior, baixo overhead e suporte nativo a plugins
- **Zod**: Oferece validação de esquema com inferência de tipos TypeScript, eliminando duplicação entre validação e tipos
- **TypeScript**: Proporciona segurança de tipos, melhor documentação de código e melhor experiência de desenvolvimento
- **Drizzle ORM**: ORM leve e tipo-seguro que oferece melhor performance comparado a ORMs mais pesados
- **Arquitetura em Camadas**: Facilita a manutenção, testabilidade e evolução do sistema

## Estrutura do Projeto

```
src/
├── application/        # Lógica de negócio e casos de uso da aplicação
├── infrastructure/     # Código específico de frameworks e adaptadores
│   ├── config/         # Configuração do servidor e da aplicação
│   ├── db/             # Conexão com banco de dados e repositórios
│   ├── http/           # Rotas HTTP e controladores
│   ├── rabbitmq/       # Adaptadores e workers para RabbitMQ
│   ├── workers/        # Workers para processamento assíncrono
│   └── types/          # Definições de tipos TypeScript
```

## Pré-requisitos

- Node.js (v18 ou posterior)
- pnpm
- Banco de dados PostgreSQL

## Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env  # Depois edite o arquivo .env com sua configuração
```

## Variáveis de Ambiente

```
PORT=3000             # Porta do servidor
LOG=true              # Habilitar/desabilitar logs
STAGE=development     # Estágio do ambiente (development, production)
DATABASE_URL=         # String de conexão PostgreSQL
RABBITMQ_URL=         # URL de conexão RabbitMQ (ex: amqp://localhost:5672)
RABBITMQ_QUEUE=       # Nome da fila RabbitMQ (ex: user-orders)
```

## Executando a Aplicação

### Modo de Desenvolvimento com TSX

```bash
# Iniciar o servidor API
pnpm dev

# Iniciar o worker de processamento de pedidos
pnpm dev:worker
```

Isso iniciará o servidor com hot-reload usando tsx. Acesse a aplicação em http://localhost:3000 e a documentação Swagger em http://localhost:3000/docs (disponível no modo de desenvolvimento).

### Build para Produção

```bash
pnpm build
```

Isso limpará o diretório dist e compilará o código TypeScript usando esbuild.

### Executando em Produção

```bash
# Iniciar o servidor API
pnpm start

# Iniciar o worker de processamento de pedidos
pnpm start:worker
```

## Documentação da API

Quando executado no modo de desenvolvimento, a documentação Swagger está disponível em `/docs`. Isso fornece uma interface interativa para explorar e testar os endpoints da API.

## Workers de Processamento

### Worker de Processamento de Pedidos

O projeto inclui um worker para processamento assíncrono de pedidos que consome mensagens de uma fila RabbitMQ.

#### Funcionalidades

- Processamento assíncrono de pedidos recebidos via fila RabbitMQ
- Gerenciamento automático de conexões e reconexões com RabbitMQ
- Tratamento de erros e logging detalhado
- Graceful shutdown ao receber sinais SIGINT ou SIGTERM

#### Configuração

O worker requer as seguintes variáveis de ambiente:

```
RABBITMQ_URL=amqp://localhost:5672    # URL de conexão com o RabbitMQ
RABBITMQ_QUEUE=user-orders            # Nome da fila a ser consumida
```

#### Execução

Para iniciar o worker em modo de desenvolvimento com hot-reload:

```bash
pnpm dev:worker
```

Para iniciar o worker em produção:

```bash
pnpm start:worker
```

## Licença

ISC
