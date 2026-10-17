const express = require('express');

// Render's health check uses this lightweight endpoint to confirm the process is up.
function startKeepAlive() {
  const app = express();
  app.disable('x-powered-by');
  app.get('/', (_request, response) => {
    response.status(200).type('text/plain').send('Zyre MC Bot Online');
  });

  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, '0.0.0.0', () => {
    console.info(`Health server listening on port ${port}`);
  });

  return server;
}

module.exports = { startKeepAlive };
