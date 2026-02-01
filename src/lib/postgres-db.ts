export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gapminer',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
}
