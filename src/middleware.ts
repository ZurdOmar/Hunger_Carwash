import { createMiddlewareClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = await createMiddlewareClient(request, response)

  const { data: { session } } = await supabase.auth.getSession()

  const isPublicPath = PUBLIC_PATHS.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/pos', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|eot)$).*)',
  ],
}
