import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://histeeria-memory.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login', '/auth/register', '/auth/otp'],
        disallow: ['/api/', '/memories', '/reminders', '/ask', '/profile'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
