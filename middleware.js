/**
 * Vercel Edge Middleware — Protege rotas de conteudo
 * Bloqueia acesso direto a /pages/, /data/, /downloads/ sem sessao Supabase
 * O token Supabase é armazenado no cookie sb-*-auth-token pelo SDK
 */

export const config = {
  matcher: ['/pages/:path*', '/data/:path*', '/downloads/:path*']
};

export default function middleware(request) {
  // Permitir acesso publico a genius-zone (relatorios de mentoria)
  const url = new URL(request.url);
  if (url.pathname.startsWith('/downloads/genius-zone/')) {
    return undefined;
  }

  // Verificar se existe cookie de sessao Supabase
  const cookies = request.headers.get('cookie') || '';
  const hasSupabaseSession = cookies.includes('sb-') && cookies.includes('-auth-token');

  // Verificar header de Authorization (usado pelo router.js via fetch)
  const authHeader = request.headers.get('authorization') || '';
  const hasAuthHeader = authHeader.startsWith('Bearer ') && authHeader.length > 30;

  // Verificar Referer (requisicoes do SPA vem do proprio dominio)
  const referer = request.headers.get('referer') || '';
  const isSameOrigin = referer.includes(url.host);

  // Permitir se tem sessao, auth header, ou vem do proprio SPA
  if (hasSupabaseSession || hasAuthHeader || isSameOrigin) {
    return undefined; // passa adiante
  }

  // Bloquear acesso direto — redirecionar para login
  return Response.redirect(new URL('/', request.url), 302);
}
