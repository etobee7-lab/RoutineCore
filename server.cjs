const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const initDB = require('./server/services/initDB.cjs');
const setupCronJobs = require('./server/services/cron.cjs');

const authRoutes = require('./server/routes/auth.cjs');
const todosModule = require('./server/routes/todos.cjs');
const todoRoutes = todosModule;
const completionsRouter = todosModule.completionsRouter;
const statsRoutes = require('./server/routes/stats.cjs');
const affirmationRoutes = require('./server/routes/affirmations.cjs');
const itemRoutes = require('./server/routes/items.cjs');
const adminRoutes = require('./server/routes/admin.cjs');
const notificationRoutes = require('./server/routes/notifications.cjs');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());

// 로깅 미들웨어
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 라우터 마운트
app.use('/api', authRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/affirmations', affirmationRoutes);
app.use('/api/user-items', itemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', notificationRoutes);
app.use('/api/daily-completions', completionsRouter);

// 기본 에러 핸들러
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

async function startServer() {
    try {
        await initDB();
        setupCronJobs();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`[RoutineCore V2] Server running at http://0.0.0.0:${PORT}`);
        });
    } catch (err) {
        console.error("Server start failed:", err);
    }
}

startServer();
