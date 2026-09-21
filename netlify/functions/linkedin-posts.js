const fallbackPosts = [
  {
    id: 'linkedin-ugc-7411729201613053952',
    slug: 'linkedin-ugc-7411729201613053952',
    title: 'LinkedIn post 01',
    date: '2025-01-01',
    excerpt: 'Embedded LinkedIn post from the user profile.',
    content: 'Embedded LinkedIn post from the user profile.',
    tags: ['LinkedIn', 'Post'],
    href: '/post/detail.html?slug=linkedin-ugc-7411729201613053952',
    externalHref: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7411729201613053952',
    embed: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7411729201613053952',
    height: 900,
    width: 504
  },
  {
    id: 'linkedin-share-7401088569663983616',
    slug: 'linkedin-share-7401088569663983616',
    title: 'LinkedIn post 02',
    date: '2025-01-01',
    excerpt: 'Embedded LinkedIn post from the user profile.',
    content: 'Embedded LinkedIn post from the user profile.',
    tags: ['LinkedIn', 'Post'],
    href: '/post/detail.html?slug=linkedin-share-7401088569663983616',
    externalHref: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7401088569663983616',
    embed: 'https://www.linkedin.com/embed/feed/update/urn:li:share:7401088569663983616',
    height: 888,
    width: 504
  },
  {
    id: 'linkedin-ugc-7330953389620486145',
    slug: 'linkedin-ugc-7330953389620486145',
    title: 'LinkedIn post 03',
    date: '2025-01-01',
    excerpt: 'Embedded LinkedIn post from the user profile.',
    content: 'Embedded LinkedIn post from the user profile.',
    tags: ['LinkedIn', 'Post'],
    href: '/post/detail.html?slug=linkedin-ugc-7330953389620486145',
    externalHref: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7330953389620486145',
    embed: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7330953389620486145',
    height: 1464,
    width: 504
  },
  {
    id: 'linkedin-ugc-7191577280324780032',
    slug: 'linkedin-ugc-7191577280324780032',
    title: 'LinkedIn post 04',
    date: '2025-01-01',
    excerpt: 'Embedded LinkedIn post from the user profile.',
    content: 'Embedded LinkedIn post from the user profile.',
    tags: ['LinkedIn', 'Post'],
    href: '/post/detail.html?slug=linkedin-ugc-7191577280324780032',
    externalHref: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7191577280324780032',
    embed: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7191577280324780032',
    height: 651,
    width: 504
  }
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

function normalizeProfileId(value) {
  if (!value) return null;

  if (value.startsWith('urn:li:')) return value;
  if (value.includes('/in/')) {
    const match = value.match(/\/in\/([^/?#]+)/i);
    if (match && match[1]) return `urn:li:person:${match[1]}`;
  }

  return `urn:li:person:${String(value).replace(/[^a-zA-Z0-9-]/g, '')}`;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const profileId = normalizeProfileId(process.env.LINKEDIN_PROFILE_ID || process.env.LINKEDIN_PROFILE_URL);

  if (!token || !profileId) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        posts: fallbackPosts,
        source: 'fallback',
        message: 'Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_PROFILE_ID or LINKEDIN_PROFILE_URL in Netlify environment variables for live data.'
      })
    };
  }

  try {
    const url = new URL('https://api.linkedin.com/v2/ugcPosts');
    url.searchParams.set('q', 'authors');
    url.searchParams.set('authors', `List(${profileId})`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Restli-Protocol-Version': '2.0.0',
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API responded with ${response.status}`);
    }

    const data = await response.json();
    const posts = Array.isArray(data && data.elements) ? data.elements.map((item, index) => {
      const share = item && item.specificContent && item.specificContent['com.linkedin.ugc.ShareContent'];
      const text = share && share.shareCommentary && share.shareCommentary.text ? share.shareCommentary.text : '';
      const title = text ? text.split(/\n+/)[0].trim().slice(0, 90) : `LinkedIn post ${index + 1}`;
      const excerpt = text ? text.slice(0, 220) : 'A recent LinkedIn post from the profile.';
      const slug = slugify(title || item.id || `linkedin-post-${index + 1}`);

      return {
        id: item && item.id ? String(item.id) : slug,
        slug,
        title,
        date: item && item.publishedAt ? new Date(item.publishedAt).toISOString() : new Date().toISOString(),
        excerpt,
        content: text || excerpt,
        tags: ['LinkedIn', 'Writing'],
        href: `/post/detail.html?slug=${encodeURIComponent(slug)}`,
        externalHref: process.env.LINKEDIN_PROFILE_URL || 'https://www.linkedin.com/'
      };
    }) : fallbackPosts;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ posts, source: 'linkedin' })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        posts: fallbackPosts,
        source: 'fallback',
        message: 'LinkedIn is unavailable right now. Showing the local archive instead.',
        error: error.message
      })
    };
  }
};
