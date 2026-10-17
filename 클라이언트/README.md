# 쇼핑몰 클라이언트

React와 Vite로 구성한 쇼핑몰 프론트엔드 프로젝트입니다.

## 개발 서버 실행

```powershell
npm.cmd run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

## 명령어

- `npm.cmd run dev`: 개발 서버 실행
- `npm.cmd run build`: 배포용 파일 생성
- `npm.cmd run preview`: 빌드 결과 미리보기
- `npm.cmd run lint`: 코드 검사

## 백엔드 연결

개발 서버에서 `/api`로 시작하는 요청은 `http://localhost:5000`으로 전달됩니다.

```js
const response = await fetch('/api/health')
const data = await response.json()
```
