import { createMiddlewareClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/update-password']
const ADMIN_ONLY_PATHS = ['/settings', '/reports']
const SUPERVISOR_PATHS = ['/dashboard', '/operations', '/reports']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = await createMiddlewareClient(request, response)

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))

  // Sin sesión en ruta protegida → redirect a login
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión en login → redirect a /pos
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/pos', request.url))
  }

  // Si está loggeado, validar roles y estado
  if (session) {
    try {
      const { data: profile, error } = await supabase
        .from('perfiles')
        .select('role, activo')
        .eq('id', session.user.id)
        .single()

      if (error || !profile) {
        console.error('[MIDDLEWARE] Profile not found:', error);
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Validar que el usuario esté activo
      if (!profile.activo) {
        console.error('[MIDDLEWARE] Inactive user attempting access:', session.user.id);
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const role = profile.role as string

      // Rutas solo para admin
      if (ADMIN_ONLY_PATHS.some(path => pathname.startsWith(path))) {
        if (role !== 'admin') {
          return NextResponse.redirect(new URL('/pos', request.url))
        }
      }

      // Rutas para supervisor+ (admin y supervisor)
      if (SUPERVISOR_PATHS.some(path => pathname.startsWith(path))) {
        if (!['admin', 'supervisor'].includes(role)) {
          return NextResponse.redirect(new URL('/pos', request.url))
        }
      }
    } catch (error) {
      console.error('[MIDDLEWARE] Role validation error:', error);
      // En caso de error, no bloquear pero loguear
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|eot)$).*)',
  ],
}
