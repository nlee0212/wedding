# Apps Script 작업 인계

데스크톱에서 `google-apps-script.gs`(저장소에는 없음, `.gitignore`)를 고칠 때 참고할 내용입니다.
웹 쪽 코드는 이 저장소(`js/main.js`, `js/config.js`)에 있고, GitHub Pages(`main` 브랜치)로 배포됩니다.

## 1. 지금 웹이 보내는 요청 (바꾸면 안 되는 계약)

모든 요청은 `config.js`의 `appsScriptUrl`로 `POST`, 본문은 JSON 문자열(`Content-Type` 없음 = text/plain → CORS preflight 없음).
응답은 JSON이고 **반드시 `ok: true`** 가 있어야 성공으로 봅니다. 실패면 `{ ok: false, error: "..." }`.

| type | 보내는 값 | 웹이 기대하는 응답 |
|---|---|---|
| `rsvp` | `side, attend, name, count, meal, phone, message` | `{ ok }` |
| `photo` | `uploader, filename, data`(긴 변 2400px JPEG base64, 헤더 없음) | `{ ok }` |
| `gb_list` | – | `{ ok, items: [{ id, name, message }] }` (최신순) |
| `gb_add` | `name, password, message` | `{ ok, item: { id, name, message } }` |
| `gb_delete` | `id, password` | `{ ok }` / 비번 틀리면 `error`에 `wrong` 포함 |
| `feed_get` | – | `{ ok, likes: { 사진ID: 숫자 }, comments: { 사진ID: [{ name, text }] } }` |
| `feed_like` | `id, delta(+1/-1), device` | `{ ok }` (응답 무시) |
| `feed_comment` | `id, name, text` | `{ ok, item: { name, text } }` |

사진ID 예: `01`, `11a`, `15a`, `16a`, `16b`, `b01`, `tw16`. 앞자리 0과 글자가 있는 **문자열**입니다.

## 2. 해야 할 일

### A. 사진ID를 텍스트로 저장 (버그 원인 정리)
- 지금 `사진하트`·`사진댓글` 탭에 `"01"`이 숫자 `1`로 저장됩니다. 새로고침하면 하트·댓글이 사라지던 원인입니다.
- 웹에서 `"1"` → `"01"`로 되돌리는 보정을 이미 넣어 두어서 지금은 동작합니다. 그래도 근본적으로 고치는 게 좋습니다.
- 할 일:
  - 사진ID 열의 서식을 일반 텍스트(`@`)로 바꿉니다.
  - 저장할 때 `"'" + id`처럼 넣거나 `setNumberFormat('@')`를 씁니다.
  - `feed_get`에서 ID를 `String()`으로 바꿔 돌려줍니다.

### B. 사진 댓글 삭제 (쓴 기기에서만)
- `feed_comment`는 `device`를 함께 받아서 `사진댓글` 탭에 기기 열로 저장합니다. 각 댓글에는 고유 `id`를 줍니다.
- `feed_get`은 `device`를 받습니다(없을 수도 있음). 각 댓글에 `id`를 넣고, 같은 기기가 쓴 댓글에는 `mine: true`를 붙여 돌려줍니다. **기기값 자체는 응답에 넣지 않습니다.**
- 새 type `feed_comment_delete`는 `{ id, device }`를 받습니다. 기기가 맞을 때만 '삭제' 칸에 `Y`를 적고 `{ ok }`를 돌려줍니다. 기기가 다르면 `{ ok: false, error: "not_owner" }`를 돌려줍니다.
- 줄은 지우지 않고 '삭제'=`Y`만 적습니다. 지금처럼 `Y`인 댓글은 목록에서 빠집니다.
- 기기 정보가 없는 예전 댓글은 지울 수 없습니다. 시트에서 직접 `Y`를 적으면 됩니다.

### C. 하객 사진 전시 벽 (Snaps)
- **원본은 지금처럼 비공개 폴더에 둡니다.** 공개용으로는 작은 썸네일(긴 변 약 600px)을 별도 폴더에 저장합니다. 썸네일 파일만 `DriveApp.Access.ANYONE_WITH_LINK / VIEW`로 공유합니다.
  - 썸네일은 서버에서 만들어도 되고, 웹이 `thumb` base64를 함께 보내도 됩니다. 웹을 바꾸는 쪽이 쉬우면 `photo`에 `thumb` 필드를 추가하겠습니다.
- `사진업로드` 탭에 `썸네일ID`와 `숨김` 열을 추가합니다. `숨김`=`Y`인 사진은 목록에서 빠집니다(부적절한 사진 관리용).
- 새 type `photo_list`는 `{ ok, items: [{ id, thumb, name, ts }] }`를 **최신순**으로 돌려줍니다.
  - `id`는 썸네일 파일 ID입니다.
  - `thumb`는 `https://drive.google.com/thumbnail?id=<썸네일ID>&sz=w600` 같은 이미지 주소입니다. 실제로 `<img>`에 넣었을 때 로그인 없이 보이는지 꼭 확인해 주세요.
  - `name`은 올린 분 이름이고, 비어 있을 수 있습니다.
  - `ts`는 업로드 시각(ms)입니다.
  - 숨김 사진은 제외합니다.
- 웹에서는 **최근 30장을 먼저 보여 주고, 나머지는 '펼쳐보기'로** 보여 줄 예정입니다. 전체를 한 번에 돌려줘도 되고, `offset`/`limit`로 나눠 줘도 됩니다.

## 3. 배포
- 스크립트를 고친 뒤 **배포 관리 → 기존 배포 편집(연필) → 버전: 새 버전 → 배포**를 누릅니다. 그래야 URL이 바뀌지 않습니다. '새 배포'를 하면 URL이 바뀌니, 그때는 `config.js`의 `appsScriptUrl`도 바꿔야 합니다.
- 액세스 권한은 지금처럼 **모든 사용자**, 실행 계정은 **나**로 둡니다.

## 4. 끝나면 웹 쪽에 알려 줄 것
아래 내용을 알려 주시면 웹 쪽(이 저장소)을 맞춰 고칩니다.
- 새 type 이름과 실제 응답 예시(JSON 한 개씩): `feed_get`(바뀐 형태), `feed_comment_delete`, `photo_list`
- `photo`에 `thumb`를 웹이 보내야 하는지 여부
- 배포 URL이 바뀌었는지 여부

웹 쪽 할 일(참고):
- 내 댓글 옆에 삭제 버튼 넣기
- `feed_get` / `feed_comment`에 `device` 보내기
- Snaps 섹션에 폴라로이드 벽 만들기(최근 30장 + 펼쳐보기)
