const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 ĐOÀN TRƯỜNG - HỆ THỐNG CONFIRM BUMP MẠNG XÃ HỘI`);
  console.log(`👉 Backend & Frontend đang chạy tại: http://localhost:${PORT}`);
  console.log(`👉 Vite Dev Server (nếu chạy song song): http://localhost:5173`);
  console.log('================================================================');
});
