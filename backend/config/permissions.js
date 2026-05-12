const PERMISSIONS = {
  admin: ['*'],

  operator: [
    'clients:read', 'clients:write', 'clients:delete',
    'accounts:read', 'accounts:open', 'accounts:close',
    'transactions:read', 'transactions:write',
    'loans:read', 'loans:write', 'loans:payment'
  ],

  consultant: [
    'clients:read', 'clients:write',
    'accounts:read', 'accounts:open',
    'loans:read'
  ],

  analyst: [
    'clients:read',
    'transactions:read',
    'loans:read',
    'employees:read',
    'reports:read',
    'audit:read'
  ],

  auditor: [
    'clients:read',
    'accounts:read',
    'transactions:read',
    'loans:read',
    'employees:read',
    'reports:read',
    'audit:read'
  ]
};

/**
Проверить наличие права у роли
@param {string} role 
@param {string} action 
@returns {boolean}
 */
const can = (role, action) => {
  const perms = PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(action);
};

const ROLE_DESCRIPTIONS = {
  admin:      'Полный доступ ко всем функциям системы',
  operator:   'Управление счетами, транзакциями, кредитами и клиентами',
  consultant: 'Работа с клиентами, открытие счетов, просмотр кредитных предложений',
  analyst:    'Просмотр транзакций, отчётов и журнала аудита (без управления данными)',
  auditor:    'Только чтение всех данных включая журнал аудита'
};

module.exports = { can, PERMISSIONS, ROLE_DESCRIPTIONS };
