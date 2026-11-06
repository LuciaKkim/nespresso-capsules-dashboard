# Nespresso 캡슐 보관 대시보드

네스프레소 코리아 공식 사이트에서 캡슐 이미지·용량(슬리브 개수, 컵 사이즈) 정보를 가져와, 보관함별 재고를 드래그 앤 드롭으로 관리하는 로컬 웹 앱입니다.

## 시작하기

```bash
cd nespresso-capsules-dashboard
npm install
npm run sync:catalog   # nespresso.com 에서 카탈로그 JSON 생성
npm start
```

브라우저가 자동으로 열리지 않으면 **`http://localhost:5173`** (또는 `http://127.0.0.1:5173`) 을 여세요.  
(`index.html` 파일을 더블클릭하면 동작하지 않습니다 — 반드시 위 명령으로 Vite 서버를 켜야 합니다.)

## 사용법

- **왼쪽 카탈로그**: 검색·라인(버츄오/오리지널) 필터 후, 캡슐을 보관함으로 드래그할 때마다 **1개**씩 추가됩니다.
- **보관함 카드**: 용량 바, 위치, 메모 확인. `설정`에서 최대 캡슐 수·이름 변경.
- **보관 중인 스택**: 다른 보관함으로 드래그해 이동. `+` / `−` 로 1개 단위 조정.
- 데이터는 브라우저 `localStorage`에 저장됩니다.
- **Guide** (`/guide`): 온보딩 요약, **Clear**(로컬 데이터 비우기), **Restore demo data**(배포 시 포함된 스냅샷).

## Vercel 배포

```bash
npm run build
npx vercel deploy --prod
```

`vercel.json`은 SPA 라우팅(`/`, `/edit`, `/guide`)을 처리합니다.  
첫 방문 시 `src/seed/dashboard.json` 스냅샷이 자동 적용됩니다.

로컬 데이터를 배포 스냅샷으로 바꾸려면 브라우저 콘솔에서:

```js
copy(localStorage.getItem("nespresso-dashboard-v2-en"))
```

내용을 `data/dashboard-export.json`으로 저장한 뒤:

```bash
node scripts/update-seed-from-export.mjs
npm run build && npx vercel deploy --prod
```

## 카탈로그 동기화

`scripts/sync-catalog.mjs`는 다음을 수행합니다.

1. [버츄오](https://www.nespresso.com/kr/ko/order/capsules/vertuo) / [오리지널](https://www.nespresso.com/kr/ko/order/capsules/original) PLP HTML에서 제품 ID 수집
2. Nespresso `ecapi` (`/ecapi/products/v2/kr/b2c/{base64(productId)}`) 로 상세 조회
3. `public/catalog.json` 저장 (이미지 URL, 강도, 컵 용량, 슬리브 개수 등)

> 개인·비상업적 재고 관리용입니다. 네스프레소 이용약관 및 robots 정책을 준수하고, 과도한 요청 빈도는 피해 주세요.
