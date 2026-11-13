import { createServer } from 'node:http'
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { MongoClient } from 'mongodb'

const scrypt = promisify(scryptCallback)
const mongoClient = new MongoClient(process.env.MONGODB_URI || '')
let usersCollection
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
const sessions = new Map()
const sessionLifetimeMs = 12 * 60 * 60 * 1000
const maxBodyBytes = 1024 * 1024
let pendingWrite = Promise.resolve()
const depositNetworks = {
  BTC: ['Bitcoin'],
  ETH: ['Ethereum (ERC-20)'],
  USDT: ['TRON (TRC-20)', 'Ethereum (ERC-20)', 'BNB Smart Chain (BEP-20)'],
  SOL: ['Solana'],
}

async function loadDatabase() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be set to connect to MongoDB.')
  await mongoClient.connect()
  const databaseName = new URL(process.env.MONGODB_URI).pathname.slice(1) || 'bluevault'
  usersCollection = mongoClient.db(databaseName).collection('users')
  await usersCollection.createIndex({ email: 1 }, { unique: true })
  const users = await usersCollection.find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray()
  return { version: 1, users }
}

let database

async function seedConfiguredAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || 'Bluevault Admin'
  if (!email && !password) return
  if (!validEmail(email) || typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error('Set a valid ADMIN_EMAIL and an ADMIN_PASSWORD between 12 and 128 characters.')
  }
  const existing = database.users.find(user => user.email === email)
  if (existing && existing.role !== 'admin') throw new Error('ADMIN_EMAIL is already registered as a non-admin account.')
  const passwordSalt = randomBytes(16).toString('hex')
  const passwordHash = (await scrypt(password, passwordSalt, 64)).toString('hex')
  if (existing) {
    existing.name = name
    existing.passwordSalt = passwordSalt
    existing.passwordHash = passwordHash
  } else {
    database.users.push({ id: randomUUID(), name, email, role: 'admin', status: 'approved', balances: {}, transactions: [], createdAt: new Date().toISOString(), passwordSalt, passwordHash })
  }
  await persistDatabase(database)
  console.log(`Configured administrator account: ${email}`)
}

let databaseReady = loadDatabase().then(async data => {
  database = data
  await seedConfiguredAdmin()
})

function persistDatabase(data) {
  pendingWrite = pendingWrite.then(async () => {
    const ids = data.users.map(user => user.id)
    await usersCollection.deleteMany(ids.length ? { id: { $nin: ids } } : {})
    if (data.users.length) await usersCollection.bulkWrite(data.users.map(user => ({
      replaceOne: { filter: { id: user.id }, replacement: user, upsert: true }
    })))
  })
  return pendingWrite
}

function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBodyBytes) throw Object.assign(new Error('Request body too large.'), { status: 413 })
    chunks.push(chunk)
  }
  if (size === 0) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }) }
}

function publicUser(user) {
  const { passwordHash, passwordSalt, ...safe } = user
  return safe
}

function authenticate(request) {
  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return null
  const session = sessions.get(token)
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token)
    return null
  }
  return session.userId
}

function validEmail(email) { return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }

async function route(request, response) {
  await databaseReady
  const url = new URL(request.url, 'http://localhost')
  const method = request.method
  if (method === 'GET' && url.pathname === '/health') return send(response, 200, { status: 'ok' })

  if (method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await readJson(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (name.length < 1 || name.length > 100) return send(response, 400, { error: 'Name must be between 1 and 100 characters.' })
    if (!validEmail(email) || email.length > 254) return send(response, 400, { error: 'Enter a valid email address.' })
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) return send(response, 400, { error: 'Password must be between 8 and 128 characters.' })
    if (database.users.some(user => user.email === email)) return send(response, 409, { error: 'An account with this email already exists.' })
    const passwordSalt = randomBytes(16).toString('hex')
    const passwordHash = (await scrypt(body.password, passwordSalt, 64)).toString('hex')
    const user = { id: randomUUID(), name, email, role: 'user', status: 'approved', balances: { BTC: 0, ETH: 0, USDT: 0, SOL: 0 }, transactions: [], createdAt: new Date().toISOString(), passwordSalt, passwordHash }
    database.users.push(user)
    await persistDatabase(database)
    return send(response, 201, { user: publicUser(user) })
  }

  if (method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJson(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const user = database.users.find(account => account.email === email)
    if (!user || typeof body.password !== 'string') return send(response, 401, { error: 'Invalid email or password.' })
    const candidate = await scrypt(body.password, user.passwordSalt, 64)
    if (!timingSafeEqual(candidate, Buffer.from(user.passwordHash, 'hex'))) return send(response, 401, { error: 'Invalid email or password.' })
    if (user.status === 'banned') return send(response, 403, { error: 'Your account has been banned. Please contact support for assistance.' })
    if (user.status === 'suspended') return send(response, 403, { error: 'Your account is suspended. Please contact support for assistance.' })
    if (user.status === 'rejected') return send(response, 403, { error: 'Your account application was rejected. Please contact support for assistance.' })
    const token = randomBytes(32).toString('base64url')
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionLifetimeMs })
    return send(response, 200, { token, expiresIn: sessionLifetimeMs / 1000, user: publicUser(user) })
  }

  const userId = authenticate(request)
  if (!userId) return send(response, 401, { error: 'Authentication required.' })
  const user = database.users.find(account => account.id === userId)
  if (!user) return send(response, 401, { error: 'Account no longer exists.' })
  if (user.role !== 'admin' && user.status === 'banned') return send(response, 403, { error: 'Your account has been banned. Please contact support for assistance.' })
  if (user.role !== 'admin' && user.status === 'rejected') return send(response, 403, { error: 'Your account application was rejected. Please contact support for assistance.' })
  if (user.role !== 'admin' && user.status === 'suspended') return send(response, 403, { error: 'Your account is suspended. Please contact support for assistance.' })

  if (method === 'GET' && url.pathname === '/api/auth/me') return send(response, 200, { user: publicUser(user) })
  if (method === 'GET' && url.pathname === '/api/alerts') {
    const storedUser = await usersCollection.findOne({ id: user.id }, { projection: { alerts: 1, _id: 0 } })
    return send(response, 200, { alerts: storedUser?.alerts || [] })
  }
  if (method === 'PATCH' && url.pathname === '/api/auth/me') {
    const body = await readJson(request)
    if (Object.hasOwn(body, 'currency') && !['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR'].includes(body.currency)) return send(response, 400, { error: 'Choose a supported display currency.' })
    const allowedFields = ['pinHash', 'connectedWalletAddress', 'connectedWalletNetwork', 'currency']
    for (const field of allowedFields) if (Object.hasOwn(body, field)) user[field] = body[field]
    await persistDatabase(database)
    return send(response, 200, { user: publicUser(user) })
  }
  if (method === 'POST' && url.pathname === '/api/auth/logout') {
    const token = request.headers.authorization.match(/^Bearer\s+(.+)$/i)[1]
    sessions.delete(token)
    return send(response, 200, { status: 'signed_out' })
  }
  if (url.pathname.startsWith('/api/admin/')) {
    if (user.role !== 'admin') return send(response, 403, { error: 'Administrator access required.' })
    if (method === 'GET' && url.pathname === '/api/admin/activity') {
      const activities = database.users.filter(account => account.role !== 'admin').flatMap(account =>
        (account.transactions || []).map(activity => ({ ...activity, userName: account.name, userEmail: account.email }))
      ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      return send(response, 200, { activities })
    }
    if (method === 'GET' && url.pathname === '/api/admin/users') {
      return send(response, 200, { users: database.users.filter(account => account.role !== 'admin').map(publicUser) })
    }
    if (method === 'GET' && url.pathname === '/api/admin/alerts') {
      const alerts = database.users.filter(account => account.role !== 'admin').flatMap(account =>
        (account.alerts || []).map(alert => ({ ...alert, userId: account.id, userName: account.name, userEmail: account.email }))
      ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      return send(response, 200, { alerts })
    }
    const alertMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/alerts$/)
    if (method === 'POST' && alertMatch) {
      const target = database.users.find(account => account.id === alertMatch[1] && account.role !== 'admin')
      if (!target) return send(response, 404, { error: 'User not found.' })
      const body = await readJson(request)
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      const message = typeof body.message === 'string' ? body.message.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() : ''
      if (!title || title.length > 120 || !message || message.length > 1000) return send(response, 400, { error: 'Provide a title (up to 120 characters) and message (up to 1000 characters).' })
      const alert = { id: randomUUID(), title, message, createdAt: new Date().toISOString(), read: false }
      const saved = await usersCollection.updateOne({ id: target.id }, { $push: { alerts: { $each: [alert], $position: 0 } } })
      if (!saved.matchedCount) return send(response, 404, { error: 'User was not found in MongoDB.' })
      target.alerts ||= []
      target.alerts.unshift(alert)
      return send(response, 201, { alert })
    }
    const alertItemMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/alerts\/([^/]+)$/)
    if (alertItemMatch && (method === 'PATCH' || method === 'DELETE')) {
      const target = database.users.find(account => account.id === alertItemMatch[1] && account.role !== 'admin')
      if (!target) return send(response, 404, { error: 'User not found.' })
      target.alerts ||= []
      const alertIndex = target.alerts.findIndex(alert => alert.id === alertItemMatch[2])
      if (alertIndex < 0) return send(response, 404, { error: 'Alert not found.' })
      if (method === 'DELETE') {
        const deleted = await usersCollection.updateOne(
          { id: target.id, 'alerts.id': target.alerts[alertIndex].id },
          { $pull: { alerts: { id: target.alerts[alertIndex].id } } }
        )
        if (!deleted.matchedCount) return send(response, 404, { error: 'Alert was not found in MongoDB.' })
        target.alerts.splice(alertIndex, 1)
      } else {
        const body = await readJson(request)
        const title = typeof body.title === 'string' ? body.title.trim() : ''
        const message = typeof body.message === 'string' ? body.message.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() : ''
        if (!title || title.length > 120 || !message || message.length > 1000) return send(response, 400, { error: 'Provide a title (up to 120 characters) and message (up to 1000 characters).' })
        target.alerts[alertIndex] = { ...target.alerts[alertIndex], title, message, updatedAt: new Date().toISOString() }
        const updated = await usersCollection.updateOne({ id: target.id }, { $set: { alerts: target.alerts } })
        if (!updated.matchedCount) return send(response, 404, { error: 'User was not found in MongoDB.' })
      }
      return send(response, 200, { alerts: target.alerts })
    }
    const match = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/)
    if (method === 'DELETE' && match) {
      const targetIndex = database.users.findIndex(account => account.id === match[1] && account.role !== 'admin')
      if (targetIndex < 0) return send(response, 404, { error: 'User not found.' })
      const target = database.users[targetIndex]
      const deleted = await usersCollection.deleteOne({ id: target.id })
      if (!deleted.deletedCount) return send(response, 404, { error: 'User was not found in MongoDB.' })
      database.users.splice(targetIndex, 1)
      for (const [token, session] of sessions) if (session.userId === target.id) sessions.delete(token)
      return send(response, 200, { deleted: true, userId: target.id })
    }
    if (method === 'PATCH' && match) {
      const target = database.users.find(account => account.id === match[1] && account.role !== 'admin')
      if (!target) return send(response, 404, { error: 'User not found.' })
      const body = await readJson(request)
      const allowedFields = ['status', 'depositAddress', 'depositAsset', 'network', 'depositAddresses', 'fee', 'feeTitle', 'feeDescription', 'feeStatus']
      if (Object.keys(body).some(field => !allowedFields.includes(field))) return send(response, 400, { error: 'Unsupported account setting.' })
      if (Object.hasOwn(body, 'status') && !['approved', 'pending', 'rejected', 'banned', 'suspended'].includes(body.status)) return send(response, 400, { error: 'Status must be approved, pending, rejected, or banned.' })
      if (Object.hasOwn(body, 'depositAddresses')) {
        const addresses = body.depositAddresses
        if (!addresses || typeof addresses !== 'object' || Array.isArray(addresses)) return send(response, 400, { error: 'Deposit addresses must be an asset-keyed object.' })
        for (const [ticker, wallet] of Object.entries(addresses)) {
          if (!Object.hasOwn(depositNetworks, ticker) || !wallet || typeof wallet !== 'object' || Array.isArray(wallet)) return send(response, 400, { error: 'Deposit addresses contain an unsupported asset.' })
          if (Object.keys(wallet).some(field => !['address', 'network'].includes(field)) || typeof wallet.address !== 'string' || wallet.address.length > 500 || !depositNetworks[ticker].includes(wallet.network)) return send(response, 400, { error: `Provide a valid ${ticker} address and network.` })
        }
      }
      Object.assign(target, body)
      await persistDatabase(database)
      return send(response, 200, { user: publicUser(target) })
    }
    const creditMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/credit$/)
    if (method === 'POST' && creditMatch) {
      const target = database.users.find(account => account.id === creditMatch[1] && account.role !== 'admin')
      if (!target) return send(response, 404, { error: 'User not found.' })
      const body = await readJson(request)
      const ticker = typeof body.ticker === 'string' ? body.ticker.toUpperCase() : ''
      const amount = Number(body.amount)
      if (!/^[A-Z0-9]{2,12}$/.test(ticker) || !Number.isFinite(amount) || amount <= 0) return send(response, 400, { error: 'Provide a valid ticker and positive amount.' })
      const activity = { id: randomUUID(), title: `Received ${ticker}`, ticker, amount, type: 'received', status: 'Completed', createdAt: new Date().toISOString() }
      target.balances ||= {}
      target.transactions ||= []
      target.balances[ticker] = (target.balances[ticker] || 0) + amount
      target.transactions.push(activity)
      await persistDatabase(database)
      return send(response, 201, { user: publicUser(target), activity })
    }
  }
  if (method === 'GET' && url.pathname === '/api/activity') return send(response, 200, { activities: [...user.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
  if (method === 'POST' && url.pathname === '/api/activity') {
    const body = await readJson(request)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const ticker = typeof body.ticker === 'string' ? body.ticker.trim().toUpperCase() : ''
    const amount = Number(body.amount)
    const type = body.type
    if (!title || title.length > 120 || !/^[A-Z0-9]{2,12}$/.test(ticker) || !Number.isFinite(amount) || amount <= 0 || !['sent', 'received', 'bought', 'sold'].includes(type)) return send(response, 400, { error: 'Provide a title, valid ticker, positive amount, and supported activity type.' })
    if (type === 'sent' || type === 'sold') {
      if ((user.balances[ticker] || 0) < amount) return send(response, 409, { error: 'Insufficient balance.' })
    }
    const activity = { id: randomUUID(), title, ticker, amount, type, status: 'Completed', createdAt: new Date().toISOString() }
    user.transactions.push(activity)
    if (type === 'received' || type === 'bought') user.balances[ticker] = (user.balances[ticker] || 0) + amount
    if (type === 'sent' || type === 'sold') user.balances[ticker] -= amount
    await persistDatabase(database)
    return send(response, 201, { activity })
  }
  return send(response, 404, { error: 'Route not found.' })
}

const server = createServer((request, response) => {
  const origin = request.headers.origin
  if (origin === allowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  }
  if (request.method === 'OPTIONS') { response.writeHead(204); return response.end() }
  route(request, response).catch(error => {
    if (response.headersSent) return response.destroy(error)
    send(response, error.status || 500, { error: error.status ? error.message : 'Internal server error.' })
    if (!error.status) console.error(error)
  })
})

const port = Number(process.env.PORT) || 4000
server.listen(port, () => console.log(`Bluevault API listening on http://localhost:${port}`))
