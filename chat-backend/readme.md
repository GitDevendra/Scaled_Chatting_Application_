# 🚀 Scalable Real-Time Chat Backend

An enterprise-grade, highly scalable real-time chat infrastructure built with **Node.js**, **Express**, **WebSockets**, **Redis**, and **Kafka** — designed to handle high-throughput, low-latency messaging with guaranteed delivery, ephemeral state management, and robust security, mimicking the architecture of modern large-scale applications like Discord or Slack.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Event-Driven Micro-Architecture** | Apache Kafka fans out WebSocket events (messages, presence, typing) across distributed server instances |
| **High-Speed Ephemeral State** | Redis sub-millisecond reads/writes for typing TTL, user presence, and batched ops via pipelining |
| **Stateful JWT Auth** | Hybrid model — stateless JWT validation tracked in Redis for instant global session revocation |
| **Fail-Open Rate Limiting** | Redis-backed sliding-window rate limiters on auth, messaging, and API routes — fail open to preserve uptime |
| **Graceful Degradation** | Catches `SIGINT`/`SIGTERM` to cleanly drain DB pools and broker connections, preventing zombie connections |
| **Strict Data Validation** | Runtime type-checking and payload stripping via `zod` middleware |

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Real-Time:** `ws` (Native WebSockets)
- **Database:** MongoDB + Mongoose
- **Cache / KV Store:** Redis (`ioredis`)
- **Message Broker:** Apache Kafka (`kafkajs`)
- **Security:** Helmet, CORS, `bcryptjs`, `jsonwebtoken`
- **Validation:** Zod
- **Containerization:** Docker & Docker Compose

---

## 📂 Project Structure

```
chat-backend/
├── server.js                 # Entry point & graceful shutdown
├── docker-compose.yml        # Infrastructure (Mongo, Redis, Kafka)
└── src/
    ├── app.js                # Express setup, middleware, global error handler
    ├── config/               # DB, Kafka broker, and Redis client configs
    ├── models/               # Mongoose schemas (User, Conversation, Message)
    ├── routes/               # Express REST API route definitions
    ├── controllers/          # Business logic for REST endpoints
    ├── middleware/           # Auth, Zod validation, rate limiters
    ├── services/             # Shared logic (persistence, publishing)
    └── websocket/
        ├── wsServer.js       # WebSocket server init & heartbeat
        ├── wsHandler.js      # Main event dispatcher & Kafka consumer
        └── handlers/         # Modular WS event handlers (Presence, Typing, Messages)
```

---

## 🚀 Getting Started

### Prerequisites

- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- Node.js v18+
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/gitDevendra/chat-backend.git
cd chat-backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Server
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/chat-app

# Security
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_CLIENT_ID=chat-app
KAFKA_GROUP_ID=chat-group
KAFKA_BROKERS=localhost:9092
```

### 3. Spin Up Infrastructure

```bash
docker-compose up -d
```

>  Wait ~15 seconds for Kafka and Zookeeper to fully initialize before starting the server.

### 4. Start the Server

```bash
# Development (auto-restart on save)
npm run dev

# Production
npm start
```

---

##  REST API Reference

### Auth — `/api/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/register` | Create a new account | ❌ |
| `POST` | `/login` | Authenticate and receive cookie | ❌ |
| `POST` | `/logout` | Revoke token in Redis & clear cookie | ✅ |
| `GET` | `/me` | Get currently logged-in user profile | ✅ |

### Users — `/api/users`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/search?q=term` | Search users by username/email | ✅ |
| `GET` | `/:id` | Get user profile by ID | ✅ |
| `PATCH` | `/me` | Update personal profile details | ✅ |

### Conversations — `/api/conversations`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/` | Get all active conversations for user | ✅ |
| `POST` | `/direct` | Get or create a 1-on-1 chat | ✅ |
| `POST` | `/group` | Create a multi-user group chat | ✅ |

### Messages — `/api/messages`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/:conversationId` | Get paginated message history | ✅ |
| `POST` | `/:conversationId` | Send a text/media message | ✅ |

---

##  WebSocket Events

Connect to the WebSocket server at:

```
ws://localhost:5001/?token=<YOUR_JWT>
```

All messages are stringified JSON with a `type` and `payload` field.

### Client → Server

```json
// Send a message
{ "type": "SEND_MESSAGE", "payload": { "conversationId": "123", "content": "Hello!" } }

// Typing indicator
{ "type": "TYPING_START", "payload": { "conversationId": "123" } }

// Read receipt
{ "type": "MESSAGE_READ", "payload": { "messageId": "msg_456", "conversationId": "123" } }
```

### Server → Client (via Kafka broadcast)

| Event | Description |
|---|---|
| `NEW_MESSAGE` | Fired when a new message is saved to DB |
| `TYPING_START` / `TYPING_STOP` | Real-time typing indicators |
| `USER_ONLINE` / `USER_OFFLINE` | Global presence updates |

---

## Postman Integration Testing Guide

### Step 1: Environment Setup

Create a Postman Environment named **"Chat App Local"** with these variables:

| Variable | Initial Value |
|---|---|
| `base_url` | `http://localhost:5001/api` |
| `userId` | _(auto-filled)_ |
| `targetUserId` | _(manual)_ |
| `conversationId` | _(auto-filled)_ |
| `token` | _(auto-filled)_ |

### Step 2: Register Users

`POST {{base_url}}/auth/register` with body:

```json
{ "username": "usera", "email": "usera@test.com", "password": "password123" }
```

Add to the **Tests** tab to auto-save variables:

```javascript
const res = pm.response.json();
if (res.user) pm.environment.set("userId", res.user.id);
```

Repeat for a second user and copy their ID to `targetUserId`.

> **Note:** Postman handles the `HttpOnly` cookie automatically for subsequent REST requests.

### Step 3: Create a Conversation

`POST {{base_url}}/conversations/direct` with body:

```json
{ "targetUserId": "{{targetUserId}}" }
```

**Tests tab:**

```javascript
const res = pm.response.json();
if (res.conversation) pm.environment.set("conversationId", res.conversation._id);
```

### Step 4: Test Real-Time WebSockets & Kafka

1. Log in as **User A** to retrieve their raw JWT.
2. Open a **New WebSocket Request** in Postman.
3. Connect to: `ws://localhost:5001/?token=<PASTE_USER_A_TOKEN>`
4. Send a typing indicator:

```json
{ "type": "TYPING_START", "payload": { "conversationId": "{{conversationId}}" } }
```

5. Send a live message:

```json
{
  "type": "SEND_MESSAGE",
  "payload": {
    "conversationId": "{{conversationId}}",
    "content": "Testing real-time Kafka broadcasts!"
  }
}
```

> 💡 **Pro Tip:** Open a second Postman WebSocket tab with **User B's** token to watch messages traverse the Kafka broker and arrive in real-time.

---

## 👨‍💻 Author

**Devendra**