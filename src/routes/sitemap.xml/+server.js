export const prerender = true;

const BASE_URL = 'https://smarts101.dev';

const routes = [
	{ path: '/smarts', changefreq: 'monthly' },
	{ path: '/how-to-smarts', changefreq: 'monthly' },
	{ path: '/quiz', changefreq: 'monthly' },
	{ path: '/about', changefreq: 'monthly' },
];

export function GET() {
	const urls = routes
		.map(
			({ path, changefreq }) => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>1.0</priority>
  </url>`,
		)
		.join('');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
		},
	});
}
