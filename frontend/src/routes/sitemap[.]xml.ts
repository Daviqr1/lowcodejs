import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const { Env } = await import('@/env');
        const appUrl = Env.SERVER_URL || 'http://localhost:5173';

        const publicRoutes = ['/', '/sign-up'];

        const urls = publicRoutes
          .map((route) => {
            let path = route;
            if (route === '/') path = '';
            return `
  <url>
    <loc>${appUrl}${path}</loc>
    <changefreq>monthly</changefreq>
  </url>`;
          })
          .join('');

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
          },
        });
      },
    },
  },
});
