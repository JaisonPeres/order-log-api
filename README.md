# API de Upload de Arquivo de Pedidos

## Descrição

Uma API moderna construída com Fastify, Zod para validação e Swagger para documentação. Este projeto é executado como um servidor TypeScript tradicional e utiliza RabbitMQ para processamento assíncrono de pedidos em lote.

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
- **Mensageria**: RabbitMQ para processamento assíncrono e em lote
- **Runtime**: Node.js
- **Linguagem**: TypeScript (tipagem estática para maior segurança e manutenibilidade)
- **Gerenciador de Pacotes**: pnpm (mais eficiente em termos de espaço em disco e velocidade)
- **Opções de Implantação**: Servidor tradicional
- **Ambiente**: dotenv para configuração
- **Testes**: Vitest para testes unitários e de integração

### Justificativas das Escolhas

- **Fastify**: Escolhido por sua performance superior, baixo overhead e suporte nativo a plugins
- **Zod**: Oferece validação de esquema com inferência de tipos TypeScript, eliminando duplicação entre validação e tipos
- **TypeScript**: Proporciona segurança de tipos, melhor documentação de código e melhor experiência de desenvolvimento
- **Drizzle ORM**: ORM leve e tipo-seguro que oferece melhor performance comparado a ORMs mais pesados
- **RabbitMQ**: Fornece processamento assíncrono confiável com garantias de entrega e mecanismos de recuperação
- **Processamento em Lote**: Melhora a eficiência do banco de dados reduzindo o número de transações
- **Arquitetura em Camadas**: Facilita a manutenção, testabilidade e evolução do sistema

## Estrutura do Projeto

```
src/
├── application/        # Lógica de negócio e casos de uso da aplicação
│   ├── ports/          # Interfaces para adaptadores externos
│   └── use-cases/      # Implementação dos casos de uso da aplicação
├── domain/            # Entidades e regras de negócio
├── infrastructure/     # Código específico de frameworks e adaptadores
│   ├── config/         # Configuração do servidor e da aplicação
│   ├── db/             # Conexão com banco de dados e repositórios
│   ├── http/           # Rotas HTTP e controladores
│   ├── rabbitmq/       # Adaptadores e workers para RabbitMQ
│   └── types/          # Definições de tipos TypeScript
```

## Pré-requisitos

- Node.js (v18 ou posterior)
- pnpm
- Banco de dados PostgreSQL
- RabbitMQ (v3.8 ou posterior)

## Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env  # Depois edite o arquivo .env com sua configuração
```

## Variáveis de Ambiente

```
PORT=3000                    # Porta do servidor
LOG=true                     # Habilitar/desabilitar logs
STAGE=development            # Estágio do ambiente (development, production)
DATABASE_URL=                # String de conexão PostgreSQL
RABBITMQ_URL=                # URL de conexão RabbitMQ (ex: amqp://localhost:5672)
RABBITMQ_QUEUE=user-orders   # Nome da fila principal
RABBITMQ_DLQ=user-orders.dlq # Nome da fila de mensagens mortas
```

## Executando a Aplicação

### Modo de Desenvolvimento com TSX

```bash
pnpm dev
```

Isso iniciará o servidor com hot-reload usando tsx. Acesse a aplicação em http://localhost:3000 e a documentação Swagger em http://localhost:3000/docs (disponível no modo de desenvolvimento).

### Build para Produção

```bash
pnpm build
```

Isso limpará o diretório dist e compilará o código TypeScript usando esbuild.

## Documentação da API

Quando executado no modo de desenvolvimento, a documentação Swagger está disponível em `/docs`. Isso fornece uma interface interativa para explorar e testar os endpoints da API.

## Sistema de Filas e Processamento Assíncrono

### Arquitetura do Worker

O sistema de processamento assíncrono é baseado em uma arquitetura de workers que consomem mensagens de filas RabbitMQ. A implementação segue os princípios de Clean Architecture com clara separação entre domínio, adaptação e infraestrutura.

#### Componentes Principais

- **OrderProcessingWorker**: Responsável pelo processamento de pedidos em lote
- **RabbitMQAdapter**: Abstrai a comunicação com o RabbitMQ
- **DrizzleOrderRepository**: Persiste os dados no PostgreSQL

### Estrutura de Filas

O sistema utiliza RabbitMQ para processamento assíncrono de pedidos com a seguinte estrutura de filas:

1. **user-orders**: Fila principal que recebe mensagens de pedidos de usuários para processamento
2. **user-orders.dlq**: Fila de mensagens mortas (Dead Letter Queue) para mensagens que não puderam ser processadas
3. **user-orders.retry**: Fila de retry para reprocessamento de mensagens após um atraso de 30 segundos

### Processamento em Lote

O worker de processamento implementa as seguintes funcionalidades:

- **Processamento em Lote**: Agrupa até 50 mensagens antes de persistir no banco de dados em uma única transação
- **Flush Periódico**: A cada 5 segundos, processa qualquer lote parcial para evitar atrasos em períodos de baixo volume
- **Shutdown Gracioso**: Processa mensagens pendentes antes de desconectar durante o desligamento
- **Tratamento de Erros**: Mensagens com erro são enviadas para a DLQ para análise posterior
- **Reconexão Automática**: Implementa backoff exponencial para reconexão em caso de falhas na conexão com RabbitMQ

### Mecanismo de Retry

O sistema implementa um mecanismo sofisticado de retry para mensagens com falha:

1. Mensagens que falham no processamento são enviadas para a DLQ
2. Um consumidor dedicado monitora a DLQ e tenta reprocessar as mensagens
3. Mensagens são rastreadas com contador de tentativas (`x-retry-count`)
4. Após uma tentativa de reprocessamento, mensagens que continuam falhando são descartadas

### Formato das Mensagens

```typescript
interface UserOrderMessage {
  id: number;
  name: string;
  orders: {
    id: number;
    date: string;
    products: {
      id: number;
      name: string;
      value: number;
    }[];
  }[];
}
```

### Inicialização do Worker

O processo de inicialização do worker segue os seguintes passos:

1. Conecta ao RabbitMQ usando o adaptador
2. Configura as filas (principal, DLQ e retry)
3. Inicia o consumidor principal com prefetch configurado
4. Inicia o consumidor da DLQ para reprocessamento
5. Configura handlers para shutdown gracioso (SIGINT/SIGTERM)

### Executando o Worker

#### Modo de Desenvolvimento

```bash
pnpm dev:worker
```

Inicia o worker com hot-reload usando tsx, ideal para desenvolvimento.

#### Modo de Produção

```bash
pnpm start:worker
```

Inicia o worker a partir do código compilado em `dist/`, otimizado para produção.

### Monitoramento e Logs

O worker utiliza um sistema de logging estruturado que fornece informações detalhadas sobre:

- Conexões e reconexões com RabbitMQ
- Processamento de mensagens e tamanho do buffer
- Erros e exceções durante o processamento
- Tentativas de reprocessamento de mensagens da DLQ

## Licença

ISC
