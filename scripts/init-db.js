#!/usr/bin/env node

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10)
const DB_USER = process.env.DB_USER || 'postgres'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'repohub'

async function main() {
  // Connect to default 'postgres' database to create DB if missing
  const admin = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: 'postgres',
    user: DB_USER,
    password: DB_PASSWORD,
  })

  try {
    console.log(`🔍 Ensuring database "${DB_NAME}" exists on ${DB_HOST}:${DB_PORT} ...`)
    await admin.query(`CREATE DATABASE ${DB_NAME};`)
    console.log(`✅ Created database "${DB_NAME}"`)
  } catch (err) {
    // 42P04 = duplicate_database
    if (err && err.code === '42P04') {
      console.log(`ℹ️ Database "${DB_NAME}" already exists`)
    } else {
      console.error('❌ Failed to create database:', err)
      process.exitCode = 1
    }
  } finally {
    await admin.end().catch(() => {})
  }

  // Connect to the target DB and apply schema
  const db = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  })

  try {
    const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'database', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    console.log('🔧 Applying schema...')
    await db.query(schema)
    console.log('✅ Schema applied')
  } catch (err) {
    // 42P07 duplicate_table, 42710 duplicate_object, 23505 unique_violation (for seed inserts)
    const ignorable = new Set(['42P07', '42710', '23505'])
    if (err && ignorable.has(err.code)) {
      console.log('ℹ️ Schema objects already exist; skipping')
    } else {
      console.error('❌ Schema apply error:', err)
      process.exitCode = 1
    }
  } finally {
    await db.end().catch(() => {})
  }
}

main().catch((e) => {
  console.error('❌ init:db failed:', e)
  process.exit(1)
})

