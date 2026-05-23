import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyToken } from '@clerk/backend';

export type Env = {
  Bindings: {
    image_host_db: D1Database;
    BUCKET: R2Bucket;
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
    CLOUDINARY_CLOUD_NAME: string;
    R2_PUBLIC_URL: string;
    RESEND_API_KEY: string;
    ADMIN_EMAIL: string;
  };
  Variables: {
    userId: string | null;
  };
};

const app = new Hono<Env>();

// --- MIDDLEWARE: CORS ---
app.use('*', cors({
  origin: '*', // Allow all origins for dev. For prod, restrict to frontend domain!
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PUT'],
  maxAge: 600,
}));

// --- MIDDLEWARE: Clerk Authentication ---
// This middleware extracts the Bearer token from the Authorization header,
// verifies it against Clerk, and attaches the userId to the Hono context variables.
app.use('/api/protected/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const origin = c.req.header('Origin');
    const secret = c.env.CLERK_SECRET_KEY?.replace(/['"]/g, '').trim();
    
    const verified = await verifyToken(token, {
      secretKey: secret,
      authorizedParties: origin ? [origin, 'http://localhost:3000'] : undefined,
    });
    
    // Attach the authenticated user's Clerk ID to the context
    c.set('userId', verified.sub);
    await next();
  } catch (error: any) {
    console.error("Clerk VerifyToken Error:", error);
    return c.json({ error: 'Unauthorized: Invalid token', details: error.message }, 401);
  }
});

// --- HELPER: Generate and Hash API Keys ---
// We generate a random API key for the user, but we only store the HASH in the database for security.
async function generateApiKeyAndHash() {
  const rawKey = 'ih_' + crypto.randomUUID().replace(/-/g, '');
  
  // Hash the key using SHA-256 for storage
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedKey = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return { rawKey, hashedKey };
}

// --- ENDPOINTS: API Key Management ---

// 1. Get current API key status (Check if a key exists for the user)
app.get('/api/protected/keys', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  // Check if the user exists and has an api_key_hash
  const query = await c.env.image_host_db
    .prepare('SELECT api_key_hash FROM users WHERE clerk_user_id = ?')
    .bind(userId)
    .first<{ api_key_hash: string | null }>();

  return c.json({
    hasKey: !!(query && query.api_key_hash),
  });
});

// 2. Generate a new API Key (Overwrites old key if exists)
app.post('/api/protected/keys/generate', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const { rawKey, hashedKey } = await generateApiKeyAndHash();

  // Upsert the user with the new hashed key
  // D1 / SQLite doesn't have UPSERT directly without INSERT ... ON CONFLICT
  await c.env.image_host_db.prepare(`
    INSERT INTO users (clerk_user_id, api_key_hash) 
    VALUES (?, ?)
    ON CONFLICT(clerk_user_id) DO UPDATE SET api_key_hash = excluded.api_key_hash
  `).bind(userId, hashedKey).run();

  // We ONLY return the raw key ONCE. If they lose it, they must generate a new one.
  return c.json({
    message: 'API Key generated successfully',
    apiKey: rawKey,
    warning: 'Please copy this key now. It will not be shown again.'
  });
});

// 3. Revoke API Key
app.delete('/api/protected/keys/revoke', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  await c.env.image_host_db.prepare(`
    UPDATE users SET api_key_hash = NULL WHERE clerk_user_id = ?
  `).bind(userId).run();

  return c.json({ message: 'API Key revoked successfully' });
});

// --- HELPER: Generate Short ID ---
function generateShortId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --- ENDPOINT: Get User Images ---
app.get('/api/protected/images', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const { results } = await c.env.image_host_db.prepare(`
    SELECT id, original_name, r2_key, size_bytes, mime_type, created_at, expires_at 
    FROM images 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).bind(userId).all();

  return c.json(results.map(img => ({
    ...img,
    url: `${c.req.header('Origin') || 'https://image-host-axg.pages.dev'}/i/${img.id}.${img.original_name.split('.').pop() || 'png'}`,
    cloudinary_url: `https://res.cloudinary.com/${c.env.CLOUDINARY_CLOUD_NAME}/image/fetch/f_auto,q_auto/${c.env.R2_PUBLIC_URL}/${img.r2_key}`
  })));
});

// --- ENDPOINT: Upload Image ---
app.post('/api/protected/upload', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  // Parse multipart form data
  const body = await c.req.parseBody();
  const file = body['file'];
  
  if (!file || typeof file === 'string') {
    return c.json({ error: 'No image file provided' }, 400);
  }

  // 1. Enforce 2MB size limit
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File size exceeds 2MB limit' }, 400);
  }

  // 2. Enforce Image MIME types
  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'Only image files are allowed' }, 400);
  }

  // Optional: Read "expires_in_hours" if user wants burn-after-reading
  const expiresInHours = body['expires_in_hours'];
  let expiresAt: string | null = null;
  if (expiresInHours && !isNaN(Number(expiresInHours))) {
    const date = new Date();
    date.setHours(date.getHours() + Number(expiresInHours));
    expiresAt = date.toISOString(); // e.g. "2024-05-24T12:00:00.000Z"
  }

  const shortId = generateShortId();
  const fileExtension = file.name.split('.').pop() || 'png';
  const r2Key = `${userId}/${shortId}.${fileExtension}`;

  // Upsert the user so foreign key constraint doesn't fail if they never generated an API key
  await c.env.image_host_db.prepare(`
    INSERT INTO users (clerk_user_id) VALUES (?)
    ON CONFLICT(clerk_user_id) DO NOTHING
  `).bind(userId).run();

  // 3. Save to Cloudflare R2
  const arrayBuffer = await file.arrayBuffer();
  await c.env.BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type }
  });

  // 4. Save metadata to Cloudflare D1
  await c.env.image_host_db.prepare(`
    INSERT INTO images (id, user_id, r2_key, original_name, size_bytes, mime_type, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    shortId, 
    userId, 
    r2Key, 
    file.name, 
    file.size, 
    file.type, 
    expiresAt
  ).run();

  // 5. Generate Cloudinary URL for auto-optimization (WebP/AVIF)
  const cloudinaryUrl = `https://res.cloudinary.com/${c.env.CLOUDINARY_CLOUD_NAME}/image/fetch/f_auto,q_auto/${c.env.R2_PUBLIC_URL}/${r2Key}`;

  return c.json({
    message: 'Image uploaded successfully',
    image: {
      id: shortId,
      original_name: file.name,
      url: cloudinaryUrl,
      direct_r2_url: `${c.env.R2_PUBLIC_URL}/${r2Key}`,
      expires_at: expiresAt
    }
  });
});

// --- ENDPOINT: Developer API Upload (Public) ---
app.post('/api/v1/upload', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ih_')) {
    return c.json({ error: 'Missing or invalid Developer API Key. Expected Bearer ih_...' }, 401);
  }

  const rawKey = authHeader.split(' ')[1];

  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedKey = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const user = await c.env.image_host_db.prepare(`SELECT clerk_user_id FROM users WHERE api_key_hash = ?`).bind(hashedKey).first<{ clerk_user_id: string }>();
  if (!user) return c.json({ error: 'Invalid API Key' }, 401);
  
  const userId = user.clerk_user_id;

  const body = await c.req.parseBody();
  const file = body['file'];
  
  if (!file || typeof file === 'string') return c.json({ error: 'No image file provided' }, 400);

  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) return c.json({ error: 'File size exceeds 2MB limit' }, 400);
  if (!file.type.startsWith('image/')) return c.json({ error: 'Only image files are allowed' }, 400);

  const shortId = generateShortId();
  const fileExtension = file.name.split('.').pop() || 'png';
  const r2Key = `${userId}/${shortId}.${fileExtension}`;

  const arrayBuffer = await file.arrayBuffer();
  await c.env.BUCKET.put(r2Key, arrayBuffer, {
    httpMetadata: { contentType: file.type }
  });

  await c.env.image_host_db.prepare(`
    INSERT INTO images (id, user_id, r2_key, original_name, size_bytes, mime_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(shortId, userId, r2Key, file.name, file.size, file.type).run();

  const customUrl = `${c.req.header('Origin') || 'https://image-host-axg.pages.dev'}/i/${shortId}.${fileExtension}`;
  
  return c.json({
    message: 'Image uploaded successfully via API',
    image: {
      id: shortId,
      url: customUrl,
      direct_r2_url: `${c.env.R2_PUBLIC_URL}/${r2Key}`
    }
  });
});

// --- ENDPOINT: Serve Image (Public) ---
app.get('/i/:id', async (c) => {
  const rawId = c.req.param('id');
  const id = rawId.split('.')[0]; // Strip extension e.g. "abc.jpg" -> "abc"
  
  // Lookup in DB
  const img = await c.env.image_host_db.prepare(`SELECT r2_key, mime_type FROM images WHERE id = ?`).bind(id).first<{ r2_key: string, mime_type: string }>();
  
  if (!img) return c.text('Image not found', 404);

  // Fetch from R2
  const object = await c.env.BUCKET.get(img.r2_key);
  if (!object) return c.text('Image not found in storage', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  
  if (img.mime_type) {
    headers.set('Content-Type', img.mime_type);
  }

  return new Response(object.body, { headers });
});

// --- ENDPOINT: Report Image (Public) ---
app.post('/api/public/report', async (c) => {
  const body = await c.req.json();
  const { imageId, reason } = body;

  if (!imageId) return c.json({ error: 'Image ID is required' }, 400);

  // 1. Flag in D1
  await c.env.image_host_db.prepare(`
    UPDATE images SET is_reported = 1 WHERE id = ?
  `).bind(imageId).run();

  // 2. Send Email via Resend
  if (c.env.RESEND_API_KEY && c.env.ADMIN_EMAIL) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'alerts@resend.dev',
        to: c.env.ADMIN_EMAIL,
        subject: `[Image Host] Image Reported: ${imageId}`,
        html: `<p>An image (ID: <strong>${imageId}</strong>) was just reported.</p><p>Reason: ${reason || 'None provided'}</p>`
      })
    });
  }

  return c.json({ message: 'Image reported successfully. Admins have been notified.' });
});

// --- MIDDLEWARE: Admin Only ---
app.use('/api/admin/*', async (c, next) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const user = await c.env.image_host_db
    .prepare('SELECT role FROM users WHERE clerk_user_id = ?')
    .bind(userId)
    .first<{ role: string }>();
    
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden: Admins only' }, 403);
  }
  await next();
});

// --- ADMIN ENDPOINTS ---
app.get('/api/admin/stats', async (c) => {
  const stats = await c.env.image_host_db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM images) as total_images,
      (SELECT SUM(size_bytes) FROM images) as total_bytes,
      (SELECT COUNT(*) FROM images WHERE is_reported = 1) as reported_images
  `).first();
  return c.json(stats);
});

app.get('/api/admin/users', async (c) => {
  const { results } = await c.env.image_host_db.prepare(`
    SELECT u.clerk_user_id, u.role, u.is_banned, u.created_at,
           COUNT(i.id) as image_count, SUM(i.size_bytes) as total_bytes
    FROM users u
    LEFT JOIN images i ON u.clerk_user_id = i.user_id
    GROUP BY u.clerk_user_id
    ORDER BY u.created_at DESC
  `).all();
  return c.json(results);
});

app.post('/api/admin/ban', async (c) => {
  const { targetUserId } = await c.req.json();
  if (!targetUserId) return c.json({ error: 'User ID required' }, 400);

  // 1. Ban the user
  await c.env.image_host_db.prepare(`UPDATE users SET is_banned = 1 WHERE clerk_user_id = ?`).bind(targetUserId).run();

  // 2. Fetch all their images to delete from R2
  const { results: userImages } = await c.env.image_host_db.prepare(`
    SELECT id, r2_key FROM images WHERE user_id = ?
  `).bind(targetUserId).all<{ id: string, r2_key: string }>();

  // 3. Delete from R2 & DB
  if (userImages && userImages.length > 0) {
    for (const img of userImages) {
      await c.env.BUCKET.delete(img.r2_key);
    }
    await c.env.image_host_db.prepare(`DELETE FROM images WHERE user_id = ?`).bind(targetUserId).run();
  }

  return c.json({ message: `User banned and ${userImages?.length || 0} files deleted.` });
});

app.get('/api/admin/images', async (c) => {
  const { results } = await c.env.image_host_db.prepare(`
    SELECT id, user_id, original_name, r2_key, size_bytes, mime_type, created_at, is_reported 
    FROM images 
    ORDER BY created_at DESC
  `).all();

  return c.json(results.map(img => ({
    ...img,
    url: `${c.req.header('Origin') || 'https://image-host-axg.pages.dev'}/i/${img.id}.${img.original_name.split('.').pop() || 'png'}`,
    cloudinary_url: `https://res.cloudinary.com/${c.env.CLOUDINARY_CLOUD_NAME}/image/fetch/f_auto,q_auto/${c.env.R2_PUBLIC_URL}/${img.r2_key}`
  })));
});

app.delete('/api/admin/images/:id', async (c) => {
  const id = c.req.param('id');
  const img = await c.env.image_host_db.prepare('SELECT r2_key FROM images WHERE id = ?').bind(id).first<{ r2_key: string }>();
  if (img) {
    await c.env.BUCKET.delete(img.r2_key);
    await c.env.image_host_db.prepare('DELETE FROM images WHERE id = ?').bind(id).run();
  }
  return c.json({ message: 'Image deleted' });
});

// Basic health check route
app.get('/', (c) => c.text('Image Host API is running!'));

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Env['Bindings'], ctx: any) {
    // Sweep expired images
    // 1. Get all expired images
    const now = new Date().toISOString();
    const expiredImages = await env.image_host_db.prepare(`
      SELECT id, r2_key FROM images WHERE expires_at IS NOT NULL AND expires_at <= ?
    `).bind(now).all<{ id: string, r2_key: string }>();

    if (expiredImages.results && expiredImages.results.length > 0) {
      for (const img of expiredImages.results) {
        // 2. Delete from R2
        await env.BUCKET.delete(img.r2_key);
        
        // 3. Delete from D1
        await env.image_host_db.prepare(`
          DELETE FROM images WHERE id = ?
        `).bind(img.id).run();
      }
      console.log(`Deleted ${expiredImages.results.length} expired images.`);
    } else {
      console.log('No expired images found during sweep.');
    }
  }
};
