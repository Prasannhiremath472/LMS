// PM2 process config for Hostinger (no Docker). Run with: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'lms-api',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
