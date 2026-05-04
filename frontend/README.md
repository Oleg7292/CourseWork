# БанкDB — Frontend

React 18 + Vite + Tailwind CSS фронтенд для системы управления базой данных коммерческого банка.

## Стек

- **React 18** + **React Router DOM v6**
- **Vite 5** (сборщик)
- **Tailwind CSS 3** (стили)
- **Recharts** (графики на дашборде)
- **Lucide React** (иконки)

## Запуск в режиме разработки

```bash
npm install
npm run dev
# → http://localhost:3000
```

> Backend должен работать на `http://localhost:5001`

## Сборка для продакшена (Docker)

```bash
# Из корня проекта bank-db-project:
docker compose up -d --build
# → http://localhost:80
```

## Тестовые данные

| Логин     | Пароль      | Роль          |
|-----------|-------------|---------------|
| admin     | Admin1234!  | Администратор |
| operator1 | Admin1234!  | Оператор      |
| analyst1  | Admin1234!  | Аналитик      |

## Структура

```
src/
├── api/index.js          — fetch-обёртка с JWT
├── context/AuthContext   — глобальный auth state
├── components/
│   ├── Layout            — sidebar + main
│   ├── ProtectedRoute    — редирект на /login
│   ├── DataTable         — таблица с пагинацией
│   ├── Modal             — универсальная модалка
│   ├── KPICard           — карточка метрики
│   ├── Badge             — цветной бейдж статуса
│   └── Toast             — уведомления
└── pages/
    ├── LoginPage
    ├── DashboardPage     — KPI + Recharts
    ├── ClientsPage
    ├── ClientPage        — карточка клиента
    ├── AccountsPage
    ├── TransactionsPage
    ├── LoansPage
    └── EmployeesPage     — только admin
```
