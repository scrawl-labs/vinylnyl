# Vinylnyl — YouTube Music 레코드판 위젯

크롬이나 사파리에서 재생 중인 YouTube Music 곡을 데스크톱 어디에나 떠 있는
레코드판 모양 위젯으로 보여주는 앱입니다. **브라우저 확장 프로그램 없이**,
Electron 앱 하나가 macOS의 AppleScript(Apple Events)로 Safari/Chrome에게
"지금 재생 중인 정보 좀 줘"라고 직접 물어보는 방식으로 동작합니다.

폴더 구성:

- `electron-widget/main.js` — 위젯 창을 띄우고, 1초마다 Safari/Chrome에 재생 정보를 물어봄
- `electron-widget/renderer/` — 레코드판 위젯 UI (HTML/CSS/JS)
- `electron-widget/mac/*.applescript` — Safari/Chrome에서 재생 정보를 읽고 재생을 제어하는 스크립트

외부로 아무것도 전송되지 않고, 전부 내 컴퓨터 안에서만 동작합니다. macOS 전용입니다.

## 1. 위젯 앱 실행하기

사용자님의 터미널에서 실행해주세요.

```bash
cd ~/Desktop/yongtaek/vinylnyl/electron-widget
npm install
npm start
```

실행되면 화면 오른쪽 위쯤에 레코드판 위젯이 뜹니다.

- 드래그해서 원하는 위치로 옮길 수 있고, 다음에 켜도 그 위치를 기억해요.
- 메뉴 막대에 💿 아이콘이 생겨요 — 위젯 숨기기/보이기, 위치 초기화, 종료.
- 위젯에 마우스를 올리면 이전/재생·일시정지/다음 버튼이 나타나요.

## 2. 브라우저 설정 (딱 한 번만 하면 됨)

브라우저마다 "AppleScript로 페이지 안 자바스크립트를 실행하는 것"을 허용하는 설정을
켜줘야 해요. 확장 프로그램 설치가 아니라 브라우저 자체의 설정 한 개입니다.

**Chrome**

메뉴 막대 → **보기(View)** → **개발자(Developer)** → **"Apple 이벤트로부터 JavaScript 허용"** 체크

**Safari**

1. Safari → 설정 → 고급 탭 → "메뉴 막대에서 개발자용 메뉴 보기" 체크
2. 메뉴 막대의 **개발자용(Develop)** 메뉴 → **"Apple 이벤트로부터 JavaScript 허용"** 체크

둘 다 켜두면 두 브라우저 아무 데서나 재생해도 위젯이 반응해요 (동시에 켜놔도 안 부딪힘).

## 3. 권한 허용

설정을 켠 뒤 music.youtube.com에서 곡을 재생하면, macOS가 다음과 같은 자동화 권한
팝업을 띄울 수 있어요.

> "Electron"이(가) "Google Chrome"을(를) 제어하려고 합니다
> "Electron"이(가) "Safari"를(을) 제어하려고 합니다

**허용**을 눌러주세요. 혹시 못 보고 지나쳤다면 시스템 설정 > 개인정보 보호 및 보안 >
자동화(Automation)에서 Electron이 Chrome/Safari를 제어할 수 있게 직접 켜줄 수 있어요.

## 문제 해결

- 위젯이 계속 반응 안 하면: 2번 설정(브라우저별 "Apple 이벤트로부터 JavaScript 허용")과
  3번 권한(자동화 허용)을 다시 확인해주세요. 둘 중 하나라도 꺼져 있으면 조용히 실패해요.
- 그래도 안 되면: 터미널에서 아래처럼 직접 실행해서 어떤 값이 나오는지 확인할 수 있어요
  (`null`이 나오면 재생 중인 music.youtube.com 탭을 못 찾은 것, 에러가 나오면 권한/설정
  문제예요).

  ```bash
  osascript ~/Desktop/yongtaek/vinylnyl/electron-widget/mac/read-chrome.applescript
  osascript ~/Desktop/yongtaek/vinylnyl/electron-widget/mac/read-safari.applescript
  ```

- 곡 제목/썸네일이 안 뜨면: YouTube Music이 UI를 업데이트해서 페이지 구조가 바뀌었을
  수 있어요. `mac/read-chrome.applescript`와 `mac/read-safari.applescript` 안의
  `.title.style-scope.ytmusic-player-bar` 같은 선택자를 실제 페이지에 맞게 고쳐주면 됩니다.

## 더블클릭용 .app으로 패키징하기

```bash
cd ~/Desktop/yongtaek/vinylnyl/electron-widget
npm install
npm run dist
```

끝나면 `electron-widget/dist/mac/Vinylnyl.app` (Apple Silicon이면
`dist/mac-arm64/Vinylnyl.app`)가 생겨요. Finder에서 그 앱을 `응용 프로그램(Applications)`
폴더로 옮겨주세요.

**처음 실행할 때:** 서명이 안 된 앱이라 더블클릭하면 "확인되지 않은 개발자" 경고가 떠요.
아이콘을 **control-클릭(또는 우클릭) → 열기**를 눌러서 한 번만 허용해주면 그다음부터는
평소처럼 더블클릭으로 열려요.

패키징한 뒤로는 macOS 자동화 권한 팝업에도 "Electron" 대신 "Vinylnyl"이라는 이름으로 떠요.
(이전에 Electron에게 줬던 자동화 권한과는 별개라, Chrome/Safari 제어 권한을 다시 한번
허용해줘야 할 수 있어요.)

**로그인할 때 자동으로 켜지게 하려면:** 시스템 설정 → 일반 → 로그인 항목 → Vinylnyl 추가.
그럼 컴퓨터 켤 때마다 위젯이 알아서 떠요.
