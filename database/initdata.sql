-- Отделы
INSERT INTO departments (name, description) VALUES
('Операционный отдел', 'Обслуживание клиентов, открытие счетов, проведение операций'),
('Кредитный отдел', 'Выдача и обслуживание кредитов'),
('IT-отдел', 'Поддержка информационных систем банка'),
('Отдел безопасности', 'Информационная и физическая безопасность'),
('Аналитический отдел', 'Финансовый анализ и отчётность')
ON CONFLICT DO NOTHING;

-- Администратор (пароль: Admin1234!)
-- Хэш bcrypt для Admin1234!
INSERT INTO users (username, password_hash, full_name, role, email) VALUES
('admin', '$2a$12$qpnkZMotaidBjvIomaO.a.QGeIyfw/aOC6GSuBEbbA9azMaw57nxq', 'Администратор Системы', 'admin', 'admin@bank.ru'),
('operator1', '$2a$12$qpnkZMotaidBjvIomaO.a.QGeIyfw/aOC6GSuBEbbA9azMaw57nxq', 'Иванова Мария Сергеевна', 'operator', 'ivanova@bank.ru'),
('analyst1', '$2a$12$qpnkZMotaidBjvIomaO.a.QGeIyfw/aOC6GSuBEbbA9azMaw57nxq', 'Петров Андрей Николаевич', 'analyst', 'petrov@bank.ru'),
('consultant1', '$2a$12$qpnkZMotaidBjvIomaO.a.QGeIyfw/aOC6GSuBEbbA9azMaw57nxq', 'Смирнов Роман Владимирович', 'consultant', 'smirnov@bank.ru'),
('auditor1', '$2a$12$qpnkZMotaidBjvIomaO.a.QGeIyfw/aOC6GSuBEbbA9azMaw57nxq', 'Кузнецова Вера Павловна', 'auditor', 'kuznecova@bank.ru')
ON CONFLICT (username) DO NOTHING;

-- Сотрудники
INSERT INTO employees (last_name, first_name, middle_name, position, department_id, phone, email, hire_date, salary) VALUES
('Иванова', 'Мария', 'Сергеевна', 'Операционист', 1, '+79161234567', 'ivanova@bank.ru', '2020-03-15', 65000),
('Петров', 'Андрей', 'Николаевич', 'Финансовый аналитик', 5, '+79261234568', 'petrov@bank.ru', '2019-07-01', 85000),
('Сидоров', 'Дмитрий', 'Алексеевич', 'Кредитный менеджер', 2, '+79361234569', 'sidorov@bank.ru', '2021-01-10', 75000),
('Козлова', 'Елена', 'Владимировна', 'Специалист ИБ', 4, '+79461234570', 'kozlova@bank.ru', '2022-05-20', 90000),
('Новиков', 'Сергей', 'Павлович', 'IT-специалист', 3, '+79561234571', 'novikov@bank.ru', '2023-02-14', 95000)
ON CONFLICT DO NOTHING;

-- Клиенты
INSERT INTO clients (last_name, first_name, middle_name, birth_date, passport_series, passport_number, phone, email, address, inn, created_by) VALUES
('Александров', 'Борис', 'Игоревич', '1985-04-12', '4512', '345678', '+79151234567', 'aleksandrov@mail.ru', 'г. Москва, ул. Ленина, д. 5, кв. 12', '771234567890', 1),
('Морозова', 'Анна', 'Дмитриевна', '1990-08-23', '4513', '456789', '+79251234568', 'morozova@mail.ru', 'г. Москва, ул. Пушкина, д. 10, кв. 34', '772345678901', 1),
('Волков', 'Николай', 'Степанович', '1978-11-05', '4514', '567890', '+79351234569', 'volkov@mail.ru', 'г. Санкт-Петербург, пр. Невский, д. 25, кв. 8', '781234567891', 1),
('Лебедева', 'Ольга', 'Андреевна', '1995-02-17', '4515', '678901', '+79451234570', 'lebedeva@mail.ru', 'г. Новосибирск, ул. Советская, д. 15, кв. 7', '540234567892', 1),
('Зайцев', 'Михаил', 'Олегович', '1983-07-30', '4516', '789012', '+79551234571', 'zaycev@mail.ru', 'г. Екатеринбург, ул. Мира, д. 8, кв. 22', '660234567893', 1),
('Соколова', 'Татьяна', 'Ивановна', '1992-12-01', '4517', '890123', '+79651234572', 'sokolova@mail.ru', 'г. Казань, ул. Кремлёвская, д. 2, кв. 3', '160234567894', 1),
('Павлов', 'Артём', 'Максимович', '1988-05-14', '4518', '901234', '+79751234573', 'pavlov@mail.ru', 'г. Самара, ул. Молодогвардейская, д. 7, кв. 18', '630234567895', 1),
('Семёнова', 'Ирина', 'Юрьевна', '1997-09-28', '4519', '012345', '+79851234574', 'semenova@mail.ru', 'г. Ростов-на-Дону, пр. Садовый, д. 33, кв. 5', '610234567896', 1)
ON CONFLICT DO NOTHING;



-- Счета
INSERT INTO accounts (client_id, account_number, account_type, currency, balance, opened_by)
SELECT c.id, '40817810' || LPAD(c.id::text, 12, '0'), 'checking', 'RUB',
       (RANDOM() * 500000 + 10000)::NUMERIC(15,2), 1
FROM clients c WHERE c.is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO accounts (client_id, account_number, account_type, currency, balance, interest_rate, opened_by)
SELECT c.id, '42301810' || LPAD(c.id::text, 12, '0'), 'savings', 'RUB',
       (RANDOM() * 1000000 + 50000)::NUMERIC(15,2), 5.5, 1
FROM clients c WHERE c.is_active = true
ON CONFLICT DO NOTHING;

-- Транзакции (демо)
INSERT INTO transactions (account_id, transaction_type, amount, description, created_by)
SELECT a.id, 'deposit', (RANDOM() * 50000 + 1000)::NUMERIC(15,2), 'Пополнение счёта', 1
FROM accounts a WHERE a.is_active = true LIMIT 10
ON CONFLICT DO NOTHING;

INSERT INTO transactions (account_id, transaction_type, amount, description, created_by)
SELECT a.id, 'withdrawal', (RANDOM() * 10000 + 500)::NUMERIC(15,2), 'Снятие наличных', 1
FROM accounts a WHERE a.is_active = true LIMIT 8
ON CONFLICT DO NOTHING;

-- Кредиты
INSERT INTO loans (client_id, amount, remaining_amount, interest_rate, term_months, monthly_payment, loan_type, purpose, status, end_date, manager_id)
VALUES
(1, 500000, 420000, 12.5, 60, 11347.20, 'consumer', 'Ремонт квартиры', 'active', NOW() + INTERVAL '36 months', 1),
(2, 3000000, 2850000, 9.5, 240, 27942.30, 'mortgage', 'Покупка квартиры', 'active', NOW() + INTERVAL '200 months', 1),
(3, 800000, 0, 14.0, 36, 27330.55, 'auto', 'Покупка автомобиля', 'paid', NOW() - INTERVAL '1 month', 1),
(4, 150000, 150000, 18.0, 24, 7490.00, 'consumer', 'Бытовая техника', 'approved', NOW() + INTERVAL '24 months', 1),
(5, 2000000, 1750000, 11.0, 120, 27550.10, 'business', 'Развитие бизнеса', 'active', NOW() + INTERVAL '80 months', 1)
ON CONFLICT DO NOTHING;

-- Подтверждение
DO $$ BEGIN
    RAISE NOTICE 'Начальные данные успешно загружены';
    RAISE NOTICE 'Логин: admin / Пароль: Admin1234!';
END $$;
