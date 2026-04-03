export function GET() {
  return new Response('google-site-verification: google62f56280efa85760.html', {
    headers: { 'Content-Type': 'text/html' },
  });
}
