# 쇼핑몰 서버

Node.js, Express, MongoDB(Mongoose)로 구성한 API 서버입니다.

## 실행 방법

1. `.env.example`을 `.env`로 복사합니다.
2. MongoDB를 실행하거나 `MONGODB_URI`에 MongoDB Atlas 연결 주소를 입력합니다.
3. 개발 서버를 실행합니다.

```powershell
Copy-Item .env.example .env
npm.cmd run dev
```

기본 주소는 `http://localhost:5000`이며 상태 확인 API는 `GET /api/health`입니다.
