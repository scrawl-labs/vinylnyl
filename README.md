# Vinylnyl — YouTube Music 레코드판 위젯

브라우저에서 재생 중인 YouTube Music 곡을 데스크톱 어디에나 떠 있는 레코드판 모양
위젯으로 보여주는 앱입니다. **macOS / Windows / Linux** 에서 동작해요.

동작 방식: 브라우저 확장 프로그램이 music.youtube.com 탭의 재생 정보를 읽어서
내 컴퓨터의 `127.0.0.1:17420`(로컬 WebSocket)으로 보내면, Electron 위젯이 그걸 받아 보여줘요.
위젯의 이전/재생·일시정지/다음 버튼은 같은 길로 반대 방향 명령을 보냅니다.
외부로 아무것도 전송되지 않고, 전부 내 컴퓨터 안에서만 동작합니다.

폴더 구성:

- `electron-widget/` — 위젯 앱 (Electron)
  - `main.js` — 위젯 창, 트레이, 확장/AppleScript 연동
  - `bridge.js` — 확장과 통신하는 로컬 WebSocket 서버 (확장 origin만 허용)
  - `renderer/` — 레코드판 위젯 UI
  - `mac/*.applescript` — macOS 전용 대체 경로 (확장 없이 Safari/Chrome 읽기)
- `extension/` — 브라우저 확장 (Manifest V3, Chrome/Edge/Brave/Opera/Vivaldi/Firefox)
- `landing-page/` — 소개 페이지

## 1. 위젯 앱 설치

[Releases](https://github.com/scrawl-labs/vinylnyl/releases)에서 받으세요.

| OS | 파일 |
|---|---|
| macOS 12+ (Apple Silicon / Intel) | `Vinylnyl.dmg` |
| Windows 10+ | `Vinylnyl-Setup.exe` |
| Linux | `Vinylnyl.AppImage` (`chmod +x` 후 실행) |

아직 코드 서명이 안 된 앱이라 처음 실행할 때 OS가 경고를 띄워요.

- **macOS:** 앱을 한 번 실행해 막힌 뒤 시스템 설정 → 개인정보 보호 및 보안 →
  **"그래도 열기"**. 또는 터미널에서 `xattr -cr /Applications/Vinylnyl.app`
- **Windows:** SmartScreen 창에서 **추가 정보 → 실행**

## 2. 브라우저 확장 설치 (한 번만)

릴리즈의 `vinylnyl-extension.zip`을 받아 압축을 풀거나, 이 저장소의 `extension/` 폴더를 쓰세요.

- **Chrome / Edge / Brave / Opera / Vivaldi:** `chrome://extensions`(또는 `edge://extensions` 등)
  → **개발자 모드** 켜기 → **압축해제된 확장 프로그램을 로드합니다** → `extension` 폴더 선택
- **Firefox:** 릴리즈의 `vinylnyl-extension-firefox.zip`을 풀고(저장소에서 직접 쓸 땐 `extension/manifest.firefox.json`을
  `manifest.json`으로 바꿔 복사) `about:debugging#/runtime/this-firefox` → **임시 부가 기능 로드** → `manifest.json` 선택
  (Firefox는 서명되지 않은 부가 기능을 임시로만 설치할 수 있어서, 브라우저를 껐다 켜면 다시 로드해야 해요)

설치 후 music.youtube.com에서 곡을 재생하면 위젯이 반응해요. 확장은 위젯 앱이 켜져 있을 때만
연결하고, 꺼져 있으면 3초마다 조용히 다시 시도합니다.

## 3. (macOS 전용) 확장 없이 쓰기

macOS에서는 확장 없이도 AppleScript로 Safari/Chrome 계열 브라우저를 읽을 수 있어요.
**Safari는 확장 대신 이 방법만 지원합니다.**

**Chrome 계열:** 메뉴 막대 → 보기 → 개발자 → **"Apple 이벤트로부터 JavaScript 허용"**

**Safari:** 설정 → 고급 → "메뉴 막대에서 개발자용 메뉴 보기" 체크 →
개발자용 메뉴 → **"Apple 이벤트로부터 JavaScript 허용"**

설정을 켠 뒤 곡을 재생하면 macOS가 "Vinylnyl이(가) Safari를 제어하려고 합니다" 같은
자동화 권한 팝업을 띄워요. **허용**을 눌러주세요. 놓쳤다면 시스템 설정 → 개인정보 보호 및
보안 → 자동화에서 직접 켤 수 있어요. 확장도 같이 켜져 있으면 Safari만 AppleScript로 읽고
나머지 브라우저는 확장 쪽 데이터를 씁니다.

## 문제 해결

- 위젯이 "연결 대기 중"에서 안 넘어가면: 위젯 앱이 켜져 있는지, 확장이 켜져 있는지
  (`chrome://extensions`), music.youtube.com 탭이 열려 있는지 확인하세요. 확장을 방금 설치했다면
  YouTube Music 탭을 새로고침해야 해요.
- `chrome://extensions`의 오류에 `ERR_CONNECTION_REFUSED`가 뜨는 건 위젯 앱이 꺼져 있다는 뜻이에요.
  앱을 켜면 몇 초 안에 자동으로 연결돼요.
- 포트 17420을 다른 프로그램이 쓰고 있으면 연결되지 않아요. 앱 콘솔에 경고가 찍힙니다.
- 곡 제목/썸네일이 안 뜨면: YouTube Music이 UI를 바꿨을 수 있어요.
  `extension/content.js`와 `electron-widget/mac/read-*.applescript`의
  `.title.style-scope.ytmusic-player-bar` 같은 선택자를 실제 페이지에 맞게 고쳐주세요.
- macOS에서 AppleScript 경로를 직접 확인하려면:
  `osascript electron-widget/mac/read-chrome.applescript` (`null`이면 재생 중인 탭을 못 찾은 것)

## 개발 / 빌드

```bash
cd electron-widget
npm install
npm start                 # 개발 실행
npm run dist:mac          # dist/Vinylnyl.dmg      (맥에서)
npm run dist:win          # dist/Vinylnyl-Setup.exe (Windows에서, 개발자 모드 필요)
npm run dist:linux        # dist/Vinylnyl.AppImage  (Linux에서)
```

> Windows에서 `dist:win`이 심볼릭 링크 오류로 실패하면 설정 → 개발자용 → **개발자 모드**를 켜세요.

### 릴리즈

`v*` 태그를 푸시하면 GitHub Actions(`.github/workflows/release.yml`)가 세 OS에서 앱을 빌드하고
확장 zip과 함께 릴리즈에 올려요. 릴리즈 노트는 `RELEASE_NOTES.md`를 씁니다.

```bash
git tag v1.0.0 && git push origin main v1.0.0
```

**로그인할 때 자동으로 켜지게 하려면:** macOS는 시스템 설정 → 일반 → 로그인 항목,
Windows는 `shell:startup` 폴더에 바로가기를 추가하세요.
