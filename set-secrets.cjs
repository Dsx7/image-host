const { execSync } = require('child_process');

try {
  console.log("Setting CLERK_SECRET_KEY...");
  execSync('npx wrangler secret put CLERK_SECRET_KEY', { 
    input: 'sk_test_G5OmSXwk4O79Zd2nA8l9w2jtDYrvDJyoCXbqNgmmJK',
    stdio: ['pipe', 'inherit', 'inherit']
  });

  console.log("Setting CLERK_PUBLISHABLE_KEY...");
  execSync('npx wrangler secret put CLERK_PUBLISHABLE_KEY', { 
    input: 'pk_test_ZW5hYmxlZC12aXBlci03Mi5jbGVyay5hY2NvdW50cy5kZXYk',
    stdio: ['pipe', 'inherit', 'inherit']
  });
  
  console.log("Success!");
} catch (e) {
  console.error(e);
}
