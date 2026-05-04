# 🏦 Система управления БД коммерческого банка

**Курсовая работа** по направлению «Информационная безопасность»  
Тема: _Разработка ПО для создания и обработки сведений базы данных коммерческого банка_

---

## 🛠 Технологический стек

| Слой | Технология |
|---|---|
| **Backend** | Node.js 20 + Express.js 4 |
| **База данных** | PostgreSQL 15 |
| **Frontend** | React 18 + Vite (следующий этап) |
| **Контейнеризация** | Docker + Docker Compose |
| **Аутентификация** | JWT (jsonwebtoken) |
| **Безопасность** | bcryptjs, Helmet, Rate Limiting, RBAC |
| **Валидация** | express-validator |

---

## 🚀 Запуск проекта

### Через Docker (рекомендуется)

```bash
# Клонировать / распаковать проект
cd bank-db-project

# Запустить все сервисы
docker compose up -d --build

# Проверить статус
docker compose ps

# Просмотр логов
docker compose logs -f server
```

После запуска:
- **API**: http://localhost:5000
- **БД**: localhost:5432

### Запуск без Docker (для разработки)

```bash
# 1. Запустить PostgreSQL локально и создать БД:
psql -U postgres -c "CREATE DATABASE bank_db;"
psql -U postgres -c "CREATE USER bank_user WITH PASSWORD 'bank_secure_password_2024';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE bank_db TO bank_user;"

# 2. Применить схему и начальные данные:
psql -U bank_user -d bank_db -f database/schema.sql
psql -U bank_user -d bank_db -f database/initdata.sql

# 3. Установить зависимости и запустить backend:
cd backend
cp .env.example .env  # отредактировать при необходимости
npm install
npm run dev
```

---

## 🔑 Тестовые учётные данные

| Логин | Пароль | Роль |
|---|---|---|
| `admin` | `Admin1234!` | Администратор |
| `operator1` | `Admin1234!` | Оператор |
| `analyst1` | `Admin1234!` | Аналитик |

---

## 📡 REST API — Документация

### Аутентификация

```
POST /api/auth/register   — Регистрация нового пользователя
POST /api/auth/login      — Вход в систему (возвращает JWT)
GET  /api/auth/me         — Данные текущего пользователя
```

**Пример входа:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1234!"}'
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "username": "admin", "role": "admin" }
}
```

> Для всех защищённых маршрутов добавляйте заголовок:  
> `Authorization: Bearer <ваш_токен>`

---

### Клиенты (`/api/clients`)

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/clients` | Список с пагинацией (`?page=1&limit=20&search=...`) |
| GET | `/api/clients/:id` | Карточка клиента со счетами и кредитами |
| POST | `/api/clients` | Добавить клиента |
| PUT | `/api/clients/:id` | Обновить контакты |
| DELETE | `/api/clients/:id` | Деактивировать клиента |

**POST /api/clients — тело запроса:**
```json
{
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": "Иванович",
  "birth_date": "1990-05-15",
  "passport_series": "4512",
  "passport_number": "345678",
  "phone": "+79161234567",
  "email": "ivanov@mail.ru",
  "address": "г. Москва, ул. Ленина, д. 1",
  "inn": "771234567890"
}
```

---

### Счета (`/api/accounts`)

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/accounts` | Список счетов (`?client_id=1&type=checking`) |
| POST | `/api/accounts` | Открыть счёт |
| PUT | `/api/accounts/:id/close` | Закрыть счёт |

**Типы счетов:** `checking` (расчётный), `savings` (сберегательный), `deposit` (депозит), `credit`

---

### Транзакции (`/api/transactions`)

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/transactions` | История (`?account_id=1&type=deposit&date_from=...`) |
| POST | `/api/transactions/deposit` | Пополнение |
| POST | `/api/transactions/withdraw` | Снятие |
| POST | `/api/transactions/transfer` | Перевод между счетами |

---

### Кредиты (`/api/loans`)

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/loans` | Список кредитов (`?status=active&client_id=1`) |
| POST | `/api/loans` | Оформить кредит |
| PUT | `/api/loans/:id/payment` | Внести платёж |
| PUT | `/api/loans/:id/status` | Изменить статус |

**Типы кредитов:** `consumer`, `mortgage`, `auto`, `business`  
**Статусы:** `pending` → `approved` → `active` → `paid` / `rejected` / `overdue`

---

### Сотрудники (`/api/employees`)

| Метод | URL | Права |
|---|---|---|
| GET | `/api/employees` | Все роли |
| POST | `/api/employees` | Только `admin` |
| DELETE | `/api/employees/:id` | Только `admin` |

---

### Отчёты (`/api/reports`)

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/reports/dashboard` | Сводная статистика банка |
| GET | `/api/reports/clients-by-month` | Прирост клиентов по месяцам |

---

## 🗄 Схема базы данных

```
users          — персонал системы (admin / operator / analyst)
departments    — отделы банка
employees      — сотрудники
clients        — клиенты банка
accounts       — банковские счета
transactions   — все финансовые операции
loans          — кредиты
loan_payments  — платежи по кредитам
audit_log      — журнал аудита действий
```

**Представления (Views):**
- `client_summary` — сводка по клиенту
- `account_details` — детали счёта с данными клиента
- `loan_status_report` — отчёт по кредитам с процентом погашения

---

## 🔒 Меры информационной безопасности

1. **Хэширование паролей** — bcrypt с cost factor 12
2. **JWT-аутентификация** — токены с TTL 24ч, хранятся только на клиенте
3. **RBAC** — три роли: admin, operator, analyst
4. **Rate Limiting** — 200 req/15min общий, 20 req/15min для auth
5. **Helmet** — HTTP-заголовки безопасности (CSP, HSTS, X-Frame-Options и др.)
6. **CORS** — разрешён только фронтенд-домен
7. **Валидация входных данных** — express-validator на каждом маршруте
8. **SQL Injection** — параметризованные запросы (pg), никакой интерполяции
9. **Транзакционность** — финансовые операции в BEGIN/COMMIT/ROLLBACK
10. **Soft delete** — данные не удаляются физически, только деактивируются
11. **Audit Log** — таблица для записи действий пользователей
12. **Input size limit** — тело запроса ограничено 10KB

---

## 📁 Структура проекта

```
bank-db-project/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── server.js            # Точка входа Express
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   ├── database/
│   │   └── db.js            # Пул подключений PostgreSQL
│   ├── middleware/
│   │   └── authMiddleware.js # JWT + RBAC
│   └── routes/
│       ├── auth.js          # Регистрация / вход
│       ├── clients.js       # CRUD клиентов
│       ├── accounts.js      # Управление счетами
│       ├── transactions.js  # Финансовые операции
│       ├── loans.js         # Кредиты
│       ├── employees.js     # Сотрудники
│       └── reports.js       # Аналитика и отчёты
└── database/
    ├── schema.sql           # DDL: таблицы, индексы, триггеры, views
    └── initdata.sql         # Начальные данные
```
