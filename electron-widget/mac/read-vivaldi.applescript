on run
	set fallbackResult to "no-tab-found"
	set playingResult to ""
	set jsCode to "(function(){function getText(sel){var el=document.querySelector(sel);return el?(el.title||el.textContent||'').trim():'';}function getThumb(){var img=document.querySelector('ytmusic-player-bar img');return img&&img.src?img.src.replace(/=w\\d+-h\\d+.*$/,'=w300-h300-l90-rj'):'';}var video=document.querySelector('video');var title=getText('.title.style-scope.ytmusic-player-bar')||document.title.replace(/ - YouTube Music$/,'');var byline=getText('.byline.style-scope.ytmusic-player-bar');var artist=(byline.split(' \\u2022 ')[0]||'').trim();var isPlaying=!!video&&!video.paused&&!video.ended;return JSON.stringify({type:'nowPlaying',title:title,artist:artist,thumbnail:getThumb(),isPlaying:isPlaying,duration:video?(video.duration||0):0,currentTime:video?(video.currentTime||0):0});})();"
	try
		if application "Vivaldi" is running then
			tell application "Vivaldi"
				if (count of windows) > 0 then
					repeat with w in windows
						repeat with t in tabs of w
							set tURL to ""
							try
								set tURL to URL of t
							end try
							if tURL contains "music.youtube.com" then
								set oneResult to "js-error"
								try
									set oneResult to execute t javascript jsCode
								on error errMsg
									set oneResult to "js-error: " & errMsg
								end try
								if fallbackResult is "no-tab-found" then set fallbackResult to oneResult
								if oneResult contains "\"isPlaying\":true" then
									set playingResult to oneResult
									exit repeat
								end if
							end if
						end repeat
						if playingResult is not "" then exit repeat
					end repeat
				end if
			end tell
		end if
	on error errMsg2
		set fallbackResult to "outer-error: " & errMsg2
	end try
	if playingResult is not "" then
		return playingResult
	else
		return fallbackResult
	end if
end run
