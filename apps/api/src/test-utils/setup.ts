// Variáveis de ambiente para os testes
process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars-long'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars'
process.env.NODE_ENV = 'test'
process.env.CORS_ORIGIN = 'http://localhost:3000'
