import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''
  const pgUrl = process.env.POSTGRES_URL || ''
  
  // Extract host without exposing password
  const getHost = (url: string) => {
    try {
      if (!url) return 'NOT_SET'
      // url format: postgres://user:pass@host:port/db...
       const parts = url.split('@')
       if (parts.length > 1) {
         return parts[1].split('/')[0]
       }
       return 'INVALID_FORMAT'
    } catch (e) {
      return 'ERROR_PARSING'
    }
  }

  return NextResponse.json({
    DATABASE_URL_HOST: getHost(dbUrl),
    POSTGRES_URL_HOST: getHost(pgUrl),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    DATABASE_URL_DEFINED: !!dbUrl,
    POSTGRES_URL_DEFINED: !!pgUrl
  })
}
