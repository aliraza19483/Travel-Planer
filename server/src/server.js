const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const env = require('./config/env');
const seedDatabase = require('./utils/seed');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Swagger / OpenAPI Documentation
let swaggerUi, swaggerDocument;
try {
  swaggerUi = require('swagger-ui-express');
  const YAML = require('yamljs');
  swaggerDocument = YAML.load(path.resolve(__dirname, './swagger.yaml'));
} catch (_) {
  console.warn('⚠️  swagger-ui-express or yamljs not available. Run: npm install swagger-ui-express yamljs');
}

// Route imports
const authRoutes = require('./routes/authRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const tripRoutes = require('./routes/tripRoutes');
const shareRoutes = require('./routes/shareRoutes');

const app = express();

// Initialize sample data on server startup
seedDatabase();

// Standard middleware (Supports Vercel & Render cross-origin deployments)
app.use(cors({
  origin: env.CLIENT_URL === '*' ? true : env.CLIENT_URL,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from /client
const clientDir = path.resolve(__dirname, '../../client');
app.use(express.static(clientDir));

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    course: '7th Semester Server Side Project',
    project: 'Travel Planner & Itinerary Management'
  });
});

// Swagger OpenAPI Interactive Docs (visit /api/docs during viva)
if (swaggerUi && swaggerDocument) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'WanderPlan API Docs',
    customCss: `
      .swagger-ui .topbar { background: linear-gradient(135deg, #0b0f19, #1e293b); }
      .swagger-ui .topbar-wrapper .link { visibility: hidden; }
      .swagger-ui .info .title { color: #0ea5e9; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true
    }
  }));
}

// Mount API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/shared', shareRoutes);

// Shared public trip page fallback
app.get('/shared/trip/:shareToken', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Fallback to client index.html for SPA navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDir, 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Travel Planner Server is running on port ${env.PORT}`);
  console.log(`📍 Web Interface: http://localhost:${env.PORT}`);
  console.log(`📍 Health Check:  http://localhost:${env.PORT}/api/health`);
  if (swaggerUi) {
    console.log(`📚 Swagger API Docs: http://localhost:${env.PORT}/api/docs`);
  }
  console.log(`=======================================================`);
});

module.exports = { app, server };
