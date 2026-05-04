const BASE_URL = import.meta.env.VITE_API_URL || ''

let _token = null
let _onUnauthorized = null

export function setToken(token) { _token = token }
export function clearToken() { _token = null }
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn }

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    if (_onUnauthorized) _onUnauthorized()
    throw new Error('Unauthorized')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Ошибка запроса')
  return data
}

export const api = {
  // Auth
  login: (body) => request('POST', '/auth/login', body),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),

  // Clients — бэкенд возвращает { data:[...], total, page, pages }
  // Нормализуем в { clients:[...], total } — как ожидает ClientsPage (d.clients || d)
  getClients: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const d = await request('GET', `/clients${q ? '?' + q : ''}`)
    // d.data — массив из бэкенда; оборачиваем в { clients, total }
    return { clients: d.data ?? d.clients ?? (Array.isArray(d) ? d : []), total: d.total ?? 0, pages: d.pages ?? 0 }
  },
  getClient: (id) => request('GET', `/clients/${id}`),
  createClient: (body) => request('POST', '/clients', body),
  updateClient: (id, body) => request('PUT', `/clients/${id}`, body),
  deleteClient: (id) => request('DELETE', `/clients/${id}`),

  // Accounts — страницы ожидают d.accounts || d (массив)
  getAccounts: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const d = await request('GET', `/accounts${q ? '?' + q : ''}`)
    // Нормализуем: если пришёл массив — оборачиваем, если объект с data/accounts — достаём
    const arr = Array.isArray(d) ? d : (d.data ?? d.accounts ?? [])
    return { accounts: arr }
  },
  createAccount: (body) => request('POST', '/accounts', body),
  closeAccount: (id) => request('PUT', `/accounts/${id}/close`),

  // Transactions — страницы ожидают d.transactions || d
  getTransactions: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const d = await request('GET', `/transactions${q ? '?' + q : ''}`)
    const arr = Array.isArray(d) ? d : (d.data ?? d.transactions ?? [])
    return { transactions: arr, total: d.total ?? 0, page: d.page ?? 1, limit: d.limit ?? 50 }
  },
  deposit: (body) => request('POST', '/transactions/deposit', body),
  withdraw: (body) => request('POST', '/transactions/withdraw', body),
  transfer: (body) => request('POST', '/transactions/transfer', body),

  // Loans — страницы ожидают d.loans || d
  getLoans: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const d = await request('GET', `/loans${q ? '?' + q : ''}`)
    const arr = Array.isArray(d) ? d : (d.data ?? d.loans ?? [])
    return { loans: arr }
  },
  createLoan: (body) => request('POST', '/loans', body),
  loanPayment: (id, body) => request('PUT', `/loans/${id}/payment`, body),
  updateLoanStatus: (id, body) => request('PUT', `/loans/${id}/status`, body),

  // Employees
  getEmployees: async () => {
    const d = await request('GET', '/employees')
    return Array.isArray(d) ? d : (d.data ?? d.employees ?? d)
  },
  createEmployee: (body) => request('POST', '/employees', body),
  deleteEmployee: (id) => request('DELETE', `/employees/${id}`),

  // Reports
  getDashboard: () => request('GET', '/reports/dashboard'),
  getClientsByMonth: () => request('GET', '/reports/clients-by-month'),

  // Audit log
  getAuditLog: (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    )
    const q = new URLSearchParams(clean).toString()
    return request('GET', `/audit${q ? '?' + q : ''}`)
  },
}
