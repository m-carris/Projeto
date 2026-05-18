# 📚 GUIÃO DE APRENDIZAGEM — Sistema de Notificações Carris (Arquitectura Enterprise)

> **Objectivo:** Este guião vai guiar-te a construir, do zero, um sistema empresarial de notificações em tempo real.
> No final, vais ter um portal web único (Vue.js) que comunica com um backend robusto (NestJS), persiste dados em SQL Server, autentica utilizadores via Keycloak SSO e envia notificações push nativas para os dispositivos dos operadores — tudo sem instalar extensões no browser.

---

## 1. Introdução

### O que faz este sistema?

Este é um **Sistema de Notificações em Tempo Real para a Carris**. Permite que um **Coordenador** envie mensagens e avisos para os **Operadores de tráfego** de forma instantânea. Quando há um acidente, trânsito intenso, avaria ou desvio, o coordenador escreve uma mensagem no portal e todos os operadores recebem uma notificação push no dispositivo — mesmo que não tenham o portal aberto.

### Intervenientes

| Papel        | Descrição                                                                 |
|--------------|---------------------------------------------------------------------------|
| Coordenador  | Escreve e envia mensagens/avisos a partir do portal web                   |
| Operador     | Recebe notificações push no dispositivo; pode consultar o histórico       |

### Nova Stack Tecnológica

| Componente        | Tecnologia                                         |
|-------------------|----------------------------------------------------|
| Frontend          | Vue.js 3 (portal único para Coordenador e Operador)|
| Backend           | NestJS (Node.js + TypeScript)                      |
| Base de dados     | SQL Server com TypeORM                             |
| Autenticação      | Keycloak SSO (redirecionamento externo)            |
| Notificações      | Web Push Notifications nativas + Service Worker    |

### Porquê estas escolhas?

- **Vue.js** — Framework progressivo, fácil de aprender, com excelente documentação em português. Um único portal serve ambos os perfis (Coordenador e Operador).
- **NestJS** — Framework de backend para Node.js com arquitectura modular inspirada no Angular. Usa TypeScript, o que reduz erros e facilita a manutenção.
- **SQL Server + TypeORM** — Base de dados relacional robusta e amplamente usada em contexto empresarial. O TypeORM permite-nos definir as tabelas como classes TypeScript.
- **Keycloak** — Servidor de identidade open-source que centraliza a autenticação. O nosso código nunca toca em passwords — apenas redireciona para o Keycloak e confia no token que este emite.
- **Web Push Notifications** — Tecnologia nativa dos browsers que substitui a extensão de Chrome. O operador recebe notificações mesmo com o browser minimizado.

---

## 2. Pré-requisitos e Instalações

### 2.1 Node.js (versão 18 ou superior)

O Node.js é o ambiente de execução que permite correr JavaScript fora do browser. Tanto o NestJS como o Vue.js precisam dele.

Descarrega em: https://nodejs.org/

Para verificar a instalação, abre o terminal:

```bash
node --version
```

Deves ver algo como `v18.17.0` ou superior.

Verifica também o gestor de pacotes npm:

```bash
npm --version
```

### 2.2 NestJS CLI

O NestJS CLI é uma ferramenta de linha de comandos que gera a estrutura do projecto backend automaticamente.

```bash
npm install -g @nestjs/cli
```

Verifica:

```bash
nest --version
```

### 2.3 Vue CLI / create-vue

Para criar projectos Vue.js 3, usamos o `create-vue` (a ferramenta oficial mais recente):

```bash
npm create vue@latest --help
```

Se o comando acima mostrar opções, está instalado correctamente. Não precisas de instalar nada globalmente — o `npm create` descarrega a ferramenta automaticamente.

### 2.4 SQL Server

O SQL Server é a base de dados relacional que vai guardar utilizadores, mensagens e subscrições push.

- **Windows**: Descarrega o SQL Server Express em https://www.microsoft.com/sql-server/sql-server-downloads
- **macOS/Linux**: Usa o Docker:

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Password123!" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```

Para verificar que está a correr:

```bash
docker ps
```

Deves ver o contentor do SQL Server na lista.

### 2.5 Keycloak (Docker)

O Keycloak é o nosso servidor de autenticação. Para desenvolvimento local:

```bash
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -d quay.io/keycloak/keycloak:latest start-dev
```

Acede a http://localhost:8080 e faz login com `admin` / `admin` para configurar o realm e os clientes.

### 2.6 Extensão recomendada do VS Code

Instala a extensão **Volar** (Vue Language Features) para ter autocompletar e validação de ficheiros `.vue`:

- Abre o VS Code
- Vai a Extensions (Ctrl+Shift+X)
- Procura "Vue - Official" e instala

### 2.7 Ferramentas auxiliares

```bash
# Verificação final — executa todos estes comandos:
node --version          # v18+
npm --version           # 9+
nest --version          # 10+
docker --version        # 20+
```

---

## 3. Visão Geral do Fluxo

Antes de escrever código, é importante perceber como todas as peças comunicam entre si. Segue o diagrama:

```
┌─────────────┐         ┌───────────┐         ┌─────────────┐
│ Utilizador  │────────▶│ Keycloak  │────────▶│   Vue.js    │
│ (Browser)   │◀────────│   SSO     │◀────────│  Frontend   │
└─────────────┘  token  └───────────┘  redir. └──────┬──────┘
                                                      │
                                                      │ HTTP (Bearer Token)
                                                      ▼
                                               ┌─────────────┐
                                               │   NestJS    │
                                               │   Backend   │
                                               └──────┬──────┘
                                                      │
                                        ┌─────────────┼─────────────┐
                                        │             │             │
                                        ▼             ▼             ▼
                                 ┌───────────┐ ┌───────────┐ ┌───────────┐
                                 │ SQL Server│ │ Web Push  │ │ Histórico │
                                 │ (TypeORM) │ │ (web-push)│ │  Leitura  │
                                 └───────────┘ └─────┬─────┘ └───────────┘
                                                     │
                                                     ▼
                                              ┌─────────────┐
                                              │  Service    │
                                              │  Worker     │
                                              │ (Operador)  │
                                              └─────────────┘
                                                     │
                                                     ▼
                                              ┌─────────────┐
                                              │ Notificação │
                                              │  no ecrã    │
                                              └─────────────┘
```

**Explicação passo a passo:**

1. O utilizador abre o portal Vue.js no browser.
2. O Vue.js redireciona para o Keycloak para fazer login (SSO).
3. Após autenticação, o Keycloak devolve um token JWT ao browser.
4. O Vue.js envia pedidos HTTP ao NestJS incluindo o token no cabeçalho `Authorization`.
5. O NestJS (protegido externamente pelo Keycloak/reverse proxy) processa o pedido:
   - Grava a mensagem no SQL Server via TypeORM.
   - Dispara notificações Web Push para todos os operadores subscritos.
6. O Service Worker do operador recebe o push e mostra uma notificação nativa no ecrã.

---

## 4. Base de Dados — SQL Server com TypeORM

### 4.1 O que é o TypeORM?

O TypeORM é um ORM (Object-Relational Mapper) para TypeScript/JavaScript. Em vez de escreveres SQL manualmente, defines classes TypeScript decoradas e o TypeORM cria as tabelas por ti. Isto torna o código mais legível e seguro contra erros de SQL.

### 4.2 Configuração da ligação

Primeiro, vamos instalar as dependências necessárias no projecto backend (faremos o `nest new` na secção seguinte, mas documenta-se aqui a configuração):

```bash
cd backend
npm install @nestjs/typeorm typeorm mssql
```

Agora cria o ficheiro de configuração da base de dados:

#### `backend/src/database/database.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { PushSubscription } from '../entities/push-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mssql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 1433,
      username: process.env.DB_USERNAME || 'sa',
      password: process.env.DB_PASSWORD || 'Password123!',
      database: process.env.DB_NAME || 'carris_notifications',
      entities: [User, Message, PushSubscription],
      synchronize: true, // Em produção, usa migrations em vez de synchronize
      options: {
        encrypt: false, // Para desenvolvimento local
        trustServerCertificate: true,
      },
    }),
  ],
})
export class DatabaseModule {}
```

**O que faz cada campo:**

- `type: 'mssql'` — indica que vamos ligar ao SQL Server.
- `host` / `port` — endereço do servidor de base de dados.
- `entities` — lista de classes TypeScript que representam tabelas.
- `synchronize: true` — o TypeORM cria/actualiza as tabelas automaticamente ao arrancar a aplicação. Útil em desenvolvimento, mas em produção deves usar migrations.

### 4.3 Entidade User

A entidade `User` representa a tabela de utilizadores. Cada utilizador tem um papel: Coordenador ou Operador.

#### `backend/src/entities/user.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole {
  COORDENADOR = 'coordenador',
  OPERADOR = 'operador',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  keycloakId: string;

  @Column({ type: 'varchar', length: 255 })
  nome: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OPERADOR })
  role: UserRole;

  @Column({ type: 'bit', default: true })
  activo: boolean;

  @CreateDateColumn()
  criadoEm: Date;
}
```

**Explicação dos decoradores:**

- `@Entity('users')` — diz ao TypeORM que esta classe corresponde à tabela `users`.
- `@PrimaryGeneratedColumn('uuid')` — o ID é gerado automaticamente como UUID.
- `@Column(...)` — define uma coluna com tipo e restrições.
- `@CreateDateColumn()` — preenchido automaticamente com a data/hora de criação.

### 4.4 Entidade Message

A entidade `Message` guarda cada mensagem enviada pelo coordenador.

#### `backend/src/entities/message.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum MessagePriority {
  BAIXA = 'baixa',
  NORMAL = 'normal',
  ALTA = 'alta',
  URGENTE = 'urgente',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  conteudo: string;

  @Column({ type: 'varchar', length: 50, default: MessagePriority.NORMAL })
  prioridade: MessagePriority;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categoria: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'remetenteId' })
  remetente: User;

  @Column({ type: 'uuid' })
  remetenteId: string;

  @Column({ type: 'bit', default: false })
  lida: boolean;

  @CreateDateColumn()
  enviadaEm: Date;
}
```

**O que é o `@ManyToOne`?** — Representa uma relação de "muitos para um". Muitas mensagens podem pertencer a um remetente (User). O `@JoinColumn` diz ao TypeORM qual coluna guarda a chave estrangeira.

### 4.5 Entidade PushSubscription

Esta entidade guarda as subscrições push dos operadores. Quando um operador aceita receber notificações, o browser gera um objecto de subscrição que precisamos guardar no servidor.

#### `backend/src/entities/push-subscription.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'varchar', length: 500 })
  p256dh: string;

  @Column({ type: 'varchar', length: 500 })
  auth: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'bit', default: true })
  activa: boolean;

  @CreateDateColumn()
  criadaEm: Date;
}
```

**O que são endpoint, p256dh e auth?** — São os três componentes de uma subscrição Web Push. O `endpoint` é o URL do serviço push do browser; `p256dh` e `auth` são chaves criptográficas que garantem que só o nosso servidor pode enviar notificações para aquele dispositivo.

---

## 5. Backend NestJS — Passo a Passo

### 5.1 Criar o projecto

O comando `nest new` gera toda a estrutura inicial do projecto com TypeScript configurado:

```bash
nest new backend --package-manager npm
cd backend
```

Isto cria a seguinte estrutura:

```
backend/
├── src/
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### 5.2 Instalar dependências

```bash
npm install @nestjs/typeorm typeorm mssql web-push class-validator class-transformer
npm install -D @types/web-push
```

- **@nestjs/typeorm + typeorm + mssql** — ligação à base de dados.
- **web-push** — biblioteca para enviar notificações push seguindo o protocolo Web Push.
- **class-validator + class-transformer** — validação automática dos dados recebidos nos endpoints.

### 5.3 Estrutura de pastas final

Após criar todos os módulos, a estrutura será:

```
backend/src/
├── app.module.ts
├── main.ts
├── database/
│   └── database.module.ts
├── entities/
│   ├── user.entity.ts
│   ├── message.entity.ts
│   └── push-subscription.entity.ts
├── messages/
│   ├── messages.module.ts
│   ├── messages.controller.ts
│   ├── messages.service.ts
│   └── dto/
│       └── create-message.dto.ts
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.controller.ts
│   └── notifications.service.ts
└── subscriptions/
    ├── subscriptions.module.ts
    ├── subscriptions.controller.ts
    ├── subscriptions.service.ts
    └── dto/
        └── create-subscription.dto.ts
```

### 5.4 Módulo principal da aplicação

#### `backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    DatabaseModule,
    MessagesModule,
    NotificationsModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
```

### 5.5 Ponto de entrada da aplicação

#### `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Activa a validação automática dos DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Permite pedidos do frontend (CORS)
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Prefixo global para todos os endpoints
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend a correr em http://localhost:${port}/api`);
}
bootstrap();
```

**O que é o `ValidationPipe`?** — Valida automaticamente os dados que chegam nos pedidos HTTP usando os decoradores do `class-validator` que vamos definir nos DTOs. Se os dados forem inválidos, devolve erro 400 sem sequer chegar ao nosso código.

### 5.6 DTO para criação de mensagem

Um DTO (Data Transfer Object) define a forma exacta dos dados que o endpoint espera receber. Se algum campo faltar ou for inválido, o NestJS rejeita o pedido automaticamente.

#### `backend/src/messages/dto/create-message.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { MessagePriority } from '../../entities/message.entity';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  @MaxLength(255)
  titulo: string;

  @IsString()
  @IsNotEmpty({ message: 'O conteúdo é obrigatório.' })
  conteudo: string;

  @IsEnum(MessagePriority, { message: 'Prioridade inválida.' })
  @IsOptional()
  prioridade?: MessagePriority;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoria?: string;

  @IsString()
  @IsNotEmpty()
  remetenteId: string;
}
```

### 5.7 Serviço de mensagens

O serviço contém a lógica de negócio — gravar a mensagem na base de dados e notificar os operadores.

#### `backend/src/messages/messages.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    // 1. Criar a entidade a partir do DTO
    const message = this.messageRepository.create(createMessageDto);

    // 2. Gravar na base de dados
    const savedMessage = await this.messageRepository.save(message);

    // 3. Enviar notificação push a todos os operadores subscritos
    await this.notificationsService.notifyAllSubscribers({
      title: savedMessage.titulo,
      body: savedMessage.conteudo,
      priority: savedMessage.prioridade,
    });

    return savedMessage;
  }

  async findAll(): Promise<Message[]> {
    return this.messageRepository.find({
      relations: ['remetente'],
      order: { enviadaEm: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Message> {
    return this.messageRepository.findOne({
      where: { id },
      relations: ['remetente'],
    });
  }
}
```

### 5.8 Controlador de mensagens

O controlador define os endpoints HTTP. Cada método corresponde a uma rota.

#### `backend/src/messages/messages.controller.ts`

```typescript
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get()
  async findAll() {
    return this.messagesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.messagesService.findOne(id);
  }
}
```

**Nota sobre autenticação:** Não tens Guards nem validação de tokens aqui. O Keycloak, configurado como reverse proxy ou gateway externo, já protege estes endpoints antes do pedido chegar ao NestJS. O backend assume que qualquer pedido que lhe chegue já foi autenticado.

### 5.9 Módulo de mensagens

#### `backend/src/messages/messages.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { Message } from '../entities/message.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    NotificationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
```

### 5.10 Serviço de notificações (Web Push)

Este serviço usa a biblioteca `web-push` para enviar notificações a todos os dispositivos subscritos.

#### `backend/src/notifications/notifications.service.ts`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '../entities/push-subscription.entity';

interface NotificationPayload {
  title: string;
  body: string;
  priority?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
  ) {}

  onModuleInit() {
    // Configura as chaves VAPID (Voluntary Application Server Identification)
    // Estas chaves identificam o nosso servidor perante os serviços push dos browsers
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@carris.pt',
      process.env.VAPID_PUBLIC_KEY || '',
      process.env.VAPID_PRIVATE_KEY || '',
    );
  }

  async notifyAllSubscribers(payload: NotificationPayload): Promise<void> {
    // Buscar todas as subscrições activas
    const subscriptions = await this.subscriptionRepository.find({
      where: { activa: true },
    });

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icons/carris-icon-192.png',
      badge: '/icons/carris-badge-72.png',
      data: {
        priority: payload.priority,
        timestamp: new Date().toISOString(),
      },
    });

    // Enviar para cada subscrição em paralelo
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload,
          );
        } catch (error) {
          // Se a subscrição expirou ou foi revogada, desactivá-la
          if (error.statusCode === 410 || error.statusCode === 404) {
            await this.subscriptionRepository.update(sub.id, { activa: false });
          }
          throw error;
        }
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`Notificações falhadas: ${failed}/${subscriptions.length}`);
    }
  }

  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || '';
  }
}
```

**O que são chaves VAPID?** — VAPID (Voluntary Application Server Identification) é um protocolo que identifica o servidor que envia notificações push. Precisas de gerar um par de chaves (pública e privada). A chave pública é partilhada com o frontend; a privada fica apenas no servidor.

Para gerar as chaves:

```bash
npx web-push generate-vapid-keys
```

Guarda o resultado num ficheiro `.env`:

```
VAPID_SUBJECT=mailto:admin@carris.pt
VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkGs-GDjN5Yy-pDRHaKd-1r_cx3BcS545VG6J6cPY0
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls
```

### 5.11 Controlador de notificações

#### `backend/src/notifications/notifications.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.notificationsService.getPublicKey() };
  }
}
```

### 5.12 Módulo de notificações

#### `backend/src/notifications/notifications.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscription } from '../entities/push-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

### 5.13 DTO para subscrição push

#### `backend/src/subscriptions/dto/create-subscription.dto.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
```

### 5.14 Serviço de subscrições

#### `backend/src/subscriptions/subscriptions.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from '../entities/push-subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<PushSubscription> {
    // Verificar se já existe uma subscrição com o mesmo endpoint para este utilizador
    const existing = await this.subscriptionRepository.findOne({
      where: { endpoint: dto.endpoint, userId: dto.userId },
    });

    if (existing) {
      // Reactivar se estava desactivada
      if (!existing.activa) {
        existing.activa = true;
        return this.subscriptionRepository.save(existing);
      }
      return existing;
    }

    const subscription = this.subscriptionRepository.create(dto);
    return this.subscriptionRepository.save(subscription);
  }

  async remove(userId: string, endpoint: string): Promise<void> {
    await this.subscriptionRepository.update(
      { userId, endpoint },
      { activa: false },
    );
  }
}
```

### 5.15 Controlador de subscrições

#### `backend/src/subscriptions/subscriptions.controller.ts`

```typescript
import { Controller, Post, Delete, Body } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  async subscribe(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Delete()
  async unsubscribe(@Body() body: { userId: string; endpoint: string }) {
    await this.subscriptionsService.remove(body.userId, body.endpoint);
    return { message: 'Subscrição removida com sucesso.' };
  }
}
```

### 5.16 Módulo de subscrições

#### `backend/src/subscriptions/subscriptions.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PushSubscription } from '../entities/push-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
```

---

## 6. Frontend Vue.js — Passo a Passo

### 6.1 Criar o projecto

```bash
npm create vue@latest
```

Quando o assistente perguntar:

- **Project name:** `frontend`
- **Add TypeScript?** Yes
- **Add Vue Router?** Yes
- **Add Pinia?** Yes (para gestão de estado)
- **Add ESLint?** Yes

```bash
cd frontend
npm install
```

### 6.2 Instalar dependência do Keycloak

```bash
npm install keycloak-js
```

O `keycloak-js` é o adaptador oficial do Keycloak para aplicações JavaScript. Trata do redirecionamento para login e da gestão do token.

### 6.3 Estrutura de pastas do frontend

```
frontend/src/
├── main.ts
├── App.vue
├── router/
│   └── index.ts
├── services/
│   ├── keycloak.ts
│   ├── api.ts
│   └── push-notifications.ts
├── views/
│   ├── CoordenadorView.vue
│   └── OperadorView.vue
└── components/
    ├── MessageForm.vue
    └── PushSubscribeButton.vue
```

### 6.4 Configuração do Keycloak (só redirecionamento)

O nosso frontend não gere passwords. Quando o utilizador acede ao portal, é imediatamente redirecionado para o Keycloak. Se já estiver autenticado (sessão SSO activa), volta ao portal sem precisar de escrever credenciais.

#### `frontend/src/services/keycloak.ts`

```typescript
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'carris',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'carris-portal',
});

export async function initKeycloak(): Promise<boolean> {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required', // Redireciona para login se não autenticado
      checkLoginIframe: false,
      pkceMethod: 'S256', // Segurança adicional (PKCE)
    });
    return authenticated;
  } catch (error) {
    console.error('Falha ao inicializar Keycloak:', error);
    return false;
  }
}

export function getToken(): string | undefined {
  return keycloak.token;
}

export function getUserInfo() {
  return {
    id: keycloak.tokenParsed?.sub || '',
    name: keycloak.tokenParsed?.name || '',
    email: keycloak.tokenParsed?.email || '',
    role: keycloak.tokenParsed?.realm_access?.roles?.includes('coordenador')
      ? 'coordenador'
      : 'operador',
  };
}

export function logout(): void {
  keycloak.logout({ redirectUri: window.location.origin });
}

export default keycloak;
```

**O que é PKCE?** — Proof Key for Code Exchange é uma camada extra de segurança no fluxo OAuth2. Garante que mesmo que alguém intercepte o código de autorização, não consegue trocá-lo por um token sem conhecer o "code verifier" original.

### 6.5 Serviço de API (comunicação com o backend)

#### `frontend/src/services/api.ts`

```typescript
import { getToken } from './keycloak';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Erro ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Mensagens
  sendMessage(data: { titulo: string; conteudo: string; prioridade?: string; categoria?: string; remetenteId: string }) {
    return request('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMessages() {
    return request('/messages');
  },

  // Subscrições Push
  subscribe(data: { endpoint: string; p256dh: string; auth: string; userId: string }) {
    return request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  unsubscribe(data: { userId: string; endpoint: string }) {
    return request('/subscriptions', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  },

  // Chave pública VAPID
  getVapidPublicKey() {
    return request('/notifications/vapid-public-key');
  },
};
```

### 6.6 Serviço de Push Notifications

Este serviço gere o registo do Service Worker e a subscrição push.

#### `frontend/src/services/push-notifications.ts`

```typescript
import { api } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers não são suportados neste browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });
    console.log('Service Worker registado com sucesso:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Falha ao registar Service Worker:', error);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Obter a chave pública VAPID do backend
    const { publicKey } = await api.getVapidPublicKey();

    // Criar a subscrição push no browser
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // Obrigatório: toda notificação push deve ser visível ao utilizador
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Extrair os dados da subscrição
    const subscriptionJson = subscription.toJSON();

    // Enviar para o backend guardar
    await api.subscribe({
      endpoint: subscriptionJson.endpoint!,
      p256dh: subscriptionJson.keys!.p256dh,
      auth: subscriptionJson.keys!.auth,
      userId: userId,
    });

    console.log('Subscrição push criada com sucesso.');
    return true;
  } catch (error) {
    console.error('Falha ao subscrever push:', error);
    return false;
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remover do backend
      await api.unsubscribe({
        userId: userId,
        endpoint: subscription.endpoint,
      });

      // Remover do browser
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Falha ao cancelar subscrição push:', error);
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
}
```

### 6.7 Ponto de entrada da aplicação Vue

#### `frontend/src/main.ts`

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { initKeycloak } from './services/keycloak';
import { registerServiceWorker } from './services/push-notifications';

async function bootstrap() {
  // 1. Inicializar Keycloak (redireciona para login se necessário)
  const authenticated = await initKeycloak();

  if (!authenticated) {
    document.body.innerHTML = '<p>Não foi possível autenticar. Tenta novamente.</p>';
    return;
  }

  // 2. Registar o Service Worker para notificações push
  await registerServiceWorker();

  // 3. Criar e montar a aplicação Vue
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}

bootstrap();
```

### 6.8 Router (navegação entre páginas)

#### `frontend/src/router/index.ts`

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import { getUserInfo } from '../services/keycloak';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        const user = getUserInfo();
        return user.role === 'coordenador' ? '/coordenador' : '/operador';
      },
    },
    {
      path: '/coordenador',
      name: 'coordenador',
      component: () => import('../views/CoordenadorView.vue'),
    },
    {
      path: '/operador',
      name: 'operador',
      component: () => import('../views/OperadorView.vue'),
    },
  ],
});

export default router;
```

### 6.9 Página do Coordenador — Formulário de envio

Esta é a página principal do coordenador. Contém um formulário para escrever e enviar mensagens aos operadores.

#### `frontend/src/views/CoordenadorView.vue`

```vue
<template>
  <div class="coordenador-view">
    <header>
      <h1>Painel do Coordenador</h1>
      <p>Olá, {{ user.name }}! <button @click="handleLogout">Sair</button></p>
    </header>

    <main>
      <section class="send-message">
        <h2>Enviar Mensagem</h2>
        <form @submit.prevent="sendMessage">
          <div class="form-group">
            <label for="titulo">Título</label>
            <input
              id="titulo"
              v-model="form.titulo"
              type="text"
              placeholder="Ex: Acidente na Av. da Liberdade"
              required
            />
          </div>

          <div class="form-group">
            <label for="conteudo">Conteúdo</label>
            <textarea
              id="conteudo"
              v-model="form.conteudo"
              placeholder="Descreve o aviso em detalhe..."
              rows="4"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label for="prioridade">Prioridade</label>
            <select id="prioridade" v-model="form.prioridade">
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div class="form-group">
            <label for="categoria">Categoria (opcional)</label>
            <input
              id="categoria"
              v-model="form.categoria"
              type="text"
              placeholder="Ex: Trânsito, Avaria, Desvio"
            />
          </div>

          <button type="submit" :disabled="sending">
            {{ sending ? 'A enviar...' : 'Enviar Mensagem' }}
          </button>

          <p v-if="successMessage" class="success">{{ successMessage }}</p>
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </form>
      </section>

      <section class="message-history">
        <h2>Histórico de Mensagens</h2>
        <button @click="loadMessages">Actualizar</button>
        <ul v-if="messages.length > 0">
          <li v-for="msg in messages" :key="msg.id" class="message-item">
            <strong>{{ msg.titulo }}</strong>
            <span class="priority" :class="msg.prioridade">{{ msg.prioridade }}</span>
            <p>{{ msg.conteudo }}</p>
            <small>{{ new Date(msg.enviadaEm).toLocaleString('pt-PT') }}</small>
          </li>
        </ul>
        <p v-else>Nenhuma mensagem enviada ainda.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { getUserInfo, logout } from '../services/keycloak';

const user = getUserInfo();

const form = ref({
  titulo: '',
  conteudo: '',
  prioridade: 'normal',
  categoria: '',
});

const sending = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const messages = ref<any[]>([]);

async function sendMessage() {
  sending.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    await api.sendMessage({
      titulo: form.value.titulo,
      conteudo: form.value.conteudo,
      prioridade: form.value.prioridade,
      categoria: form.value.categoria || undefined,
      remetenteId: user.id,
    });

    successMessage.value = 'Mensagem enviada com sucesso!';
    form.value = { titulo: '', conteudo: '', prioridade: 'normal', categoria: '' };
    await loadMessages();
  } catch (error: any) {
    errorMessage.value = error.message || 'Erro ao enviar mensagem.';
  } finally {
    sending.value = false;
  }
}

async function loadMessages() {
  try {
    messages.value = await api.getMessages();
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
  }
}

function handleLogout() {
  logout();
}

onMounted(() => {
  loadMessages();
});
</script>

<style scoped>
.coordenador-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

input,
textarea,
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

button[type='submit'] {
  background-color: #1a73e8;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

button[type='submit']:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.success {
  color: #2e7d32;
  margin-top: 1rem;
}

.error {
  color: #c62828;
  margin-top: 1rem;
}

.message-history {
  margin-top: 3rem;
}

.message-item {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.priority {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  margin-left: 0.5rem;
  text-transform: uppercase;
}

.priority.urgente {
  background-color: #ffcdd2;
  color: #c62828;
}

.priority.alta {
  background-color: #fff3e0;
  color: #e65100;
}

.priority.normal {
  background-color: #e3f2fd;
  color: #1565c0;
}

.priority.baixa {
  background-color: #e8f5e9;
  color: #2e7d32;
}
</style>
```

### 6.10 Página do Operador — Subscrição push e histórico

Esta é a página do operador. Permite subscrever/cancelar notificações push e consultar mensagens recebidas.

#### `frontend/src/views/OperadorView.vue`

```vue
<template>
  <div class="operador-view">
    <header>
      <h1>Painel do Operador</h1>
      <p>Olá, {{ user.name }}! <button @click="handleLogout">Sair</button></p>
    </header>

    <main>
      <section class="push-section">
        <h2>Notificações Push</h2>
        <p v-if="!pushSupported" class="warning">
          O teu browser não suporta notificações push. Usa o Chrome, Firefox ou Edge.
        </p>
        <div v-else>
          <p v-if="subscribed" class="success">
            ✅ Notificações activas — vais receber avisos mesmo com o browser minimizado.
          </p>
          <p v-else>
            Para receberes notificações em tempo real, activa as notificações push:
          </p>
          <button
            v-if="!subscribed"
            @click="handleSubscribe"
            :disabled="subscribing"
            class="btn-subscribe"
          >
            {{ subscribing ? 'A activar...' : '🔔 Activar Notificações' }}
          </button>
          <button
            v-else
            @click="handleUnsubscribe"
            class="btn-unsubscribe"
          >
            🔕 Desactivar Notificações
          </button>
        </div>
      </section>

      <section class="messages-section">
        <h2>Mensagens Recebidas</h2>
        <button @click="loadMessages">Actualizar</button>
        <ul v-if="messages.length > 0">
          <li v-for="msg in messages" :key="msg.id" class="message-item">
            <strong>{{ msg.titulo }}</strong>
            <span class="priority" :class="msg.prioridade">{{ msg.prioridade }}</span>
            <p>{{ msg.conteudo }}</p>
            <small>{{ new Date(msg.enviadaEm).toLocaleString('pt-PT') }}</small>
          </li>
        </ul>
        <p v-else>Nenhuma mensagem recebida ainda.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../services/api';
import { getUserInfo, logout } from '../services/keycloak';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from '../services/push-notifications';

const user = getUserInfo();

const pushSupported = ref('serviceWorker' in navigator && 'PushManager' in window);
const subscribed = ref(false);
const subscribing = ref(false);
const messages = ref<any[]>([]);

async function handleSubscribe() {
  subscribing.value = true;
  try {
    const success = await subscribeToPush(user.id);
    if (success) {
      subscribed.value = true;
    }
  } finally {
    subscribing.value = false;
  }
}

async function handleUnsubscribe() {
  const success = await unsubscribeFromPush(user.id);
  if (success) {
    subscribed.value = false;
  }
}

async function loadMessages() {
  try {
    messages.value = await api.getMessages();
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
  }
}

function handleLogout() {
  logout();
}

onMounted(async () => {
  if (pushSupported.value) {
    subscribed.value = await isPushSubscribed();
  }
  await loadMessages();
});
</script>

<style scoped>
.operador-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.push-section {
  background-color: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.btn-subscribe {
  background-color: #2e7d32;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-subscribe:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-unsubscribe {
  background-color: #757575;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.success {
  color: #2e7d32;
}

.warning {
  color: #e65100;
}

.message-item {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 1rem;
  list-style: none;
}

.priority {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  margin-left: 0.5rem;
  text-transform: uppercase;
}

.priority.urgente {
  background-color: #ffcdd2;
  color: #c62828;
}

.priority.alta {
  background-color: #fff3e0;
  color: #e65100;
}

.priority.normal {
  background-color: #e3f2fd;
  color: #1565c0;
}

.priority.baixa {
  background-color: #e8f5e9;
  color: #2e7d32;
}
</style>
```

### 6.11 Service Worker completo

O Service Worker é um script que corre em segundo plano, separado da página web. É ele que recebe os eventos push do servidor e mostra a notificação ao utilizador, mesmo quando o portal não está aberto.

Este ficheiro deve ser colocado na pasta `public/` do projecto Vue para ser servido na raiz do domínio.

#### `frontend/public/service-worker.js`

```javascript
// service-worker.js — Service Worker para Web Push Notifications
// Este ficheiro corre em segundo plano, independente da página web.

// Evento: instalação do Service Worker
self.addEventListener('install', function (event) {
  console.log('[Service Worker] Instalado com sucesso.');
  // skipWaiting() faz com que o novo SW entre em acção imediatamente,
  // sem esperar que o utilizador feche todos os separadores.
  self.skipWaiting();
});

// Evento: activação do Service Worker
self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activado.');
  // clients.claim() permite que o SW controle imediatamente todas as páginas abertas.
  event.waitUntil(self.clients.claim());
});

// Evento: recepção de notificação push do servidor
self.addEventListener('push', function (event) {
  console.log('[Service Worker] Notificação push recebida.');

  var data = {
    title: 'Carris - Nova Mensagem',
    body: 'Tens uma nova notificação.',
    icon: '/icons/carris-icon-192.png',
    badge: '/icons/carris-badge-72.png',
    data: {},
  };

  // Tentar extrair os dados da notificação
  if (event.data) {
    try {
      var payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || data.data,
      };
    } catch (error) {
      console.error('[Service Worker] Erro ao processar payload:', error);
      // Se não for JSON válido, usa o texto como corpo da notificação
      data.body = event.data.text() || data.body;
    }
  }

  // Opções da notificação
  var options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200], // Vibração: vibra 200ms, pausa 100ms, vibra 200ms
    tag: 'carris-notification-' + Date.now(), // Tag única para cada notificação
    requireInteraction: data.data.priority === 'urgente', // Notificações urgentes ficam visíveis até o utilizador interagir
    actions: [
      { action: 'open', title: 'Abrir Portal' },
      { action: 'close', title: 'Fechar' },
    ],
    data: data.data,
  };

  // waitUntil() garante que o SW não é terminado antes de a notificação ser mostrada
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Evento: utilizador clicou na notificação
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notificação clicada:', event.action);

  // Fechar a notificação
  event.notification.close();

  if (event.action === 'close') {
    return; // O utilizador escolheu fechar, não fazer nada
  }

  // Abrir ou focar o portal
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Se já há uma janela do portal aberta, focar nela
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abrir uma nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow('/operador');
      }
    })
  );
});

// Evento: notificação foi fechada sem interacção (swipe ou timeout)
self.addEventListener('notificationclose', function (event) {
  console.log('[Service Worker] Notificação fechada sem interacção.');
});
```

### 6.12 Componente App.vue

#### `frontend/src/App.vue`

```vue
<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #fafafa;
  color: #333;
}
</style>
```

### 6.13 Variáveis de ambiente do frontend

Cria um ficheiro `.env` na raiz do projecto frontend:

#### `frontend/.env`

```
VITE_API_URL=http://localhost:3000/api
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=carris
VITE_KEYCLOAK_CLIENT_ID=carris-portal
```

---

## 7. Como Correr o Projecto

### 7.1 Arrancar o SQL Server (Docker)

```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=Password123!" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```

Cria a base de dados (podes usar o Azure Data Studio ou o sqlcmd):

```bash
docker exec -it $(docker ps -q --filter ancestor=mcr.microsoft.com/mssql/server:2022-latest) /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Password123!" -C -Q "CREATE DATABASE carris_notifications"
```

### 7.2 Arrancar o Keycloak

```bash
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -d quay.io/keycloak/keycloak:latest start-dev
```

Configuração no Keycloak (http://localhost:8080):

1. Cria um realm chamado `carris`
2. Cria um cliente chamado `carris-portal` com:
   - Client type: OpenID Connect
   - Valid redirect URIs: `http://localhost:5173/*`
   - Web origins: `http://localhost:5173`
3. Cria os roles `coordenador` e `operador` no realm
4. Cria utilizadores de teste e atribui-lhes os roles

### 7.3 Arrancar o Backend

```bash
cd backend

# Cria o ficheiro .env com as variáveis necessárias
cat > .env << EOF
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=Password123!
DB_NAME=carris_notifications
VAPID_SUBJECT=mailto:admin@carris.pt
VAPID_PUBLIC_KEY=<a-tua-chave-publica>
VAPID_PRIVATE_KEY=<a-tua-chave-privada>
FRONTEND_URL=http://localhost:5173
PORT=3000
EOF

# Instalar dependências
npm install

# Arrancar em modo desenvolvimento (com hot-reload)
npm run start:dev
```

O backend fica disponível em: http://localhost:3000/api

### 7.4 Arrancar o Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Arrancar em modo desenvolvimento
npm run dev
```

O frontend fica disponível em: http://localhost:5173

### 7.5 Testar o Fluxo Completo

1. **Abre o browser** em http://localhost:5173
2. **Login** — Serás redirecionado para o Keycloak. Faz login com um utilizador de teste.
3. **Se és Coordenador** — Vais ver o painel com formulário de envio. Preenche o título, conteúdo e prioridade, e clica "Enviar Mensagem".
4. **Se és Operador** — Vais ver o painel com o botão "Activar Notificações". Clica nele e aceita a permissão do browser.
5. **Testa a notificação** — Num segundo browser/perfil, faz login como coordenador e envia uma mensagem. O operador deve receber uma notificação push nativa.

### 7.6 Gerar chaves VAPID (primeira vez)

```bash
npx web-push generate-vapid-keys
```

Copia as chaves geradas para o ficheiro `.env` do backend.

---

## Resumo Final

Parabéns! 🎉 Se seguiste todos os passos, tens agora:

- ✅ Um **portal Vue.js** que serve coordenadores e operadores numa única aplicação
- ✅ Um **backend NestJS** com TypeScript, modular e bem estruturado
- ✅ Uma **base de dados SQL Server** com TypeORM e três entidades (User, Message, PushSubscription)
- ✅ **Autenticação SSO** via Keycloak, sem gerir passwords no código
- ✅ **Notificações push nativas** que funcionam mesmo com o browser minimizado, sem extensões

Esta arquitectura é escalável, segura e pronta para ambiente empresarial. Cada componente pode ser substituído ou escalado independentemente dos outros.
