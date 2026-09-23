on run argv
	set theAction to item 1 of argv
	set sel to ""
	if theAction is "playPause" then
		set sel to ".play-pause-button"
	else if theAction is "next" then
		set sel to ".next-button"
	else if theAction is "prev" then
		set sel to ".previous-button"
	end if
	if sel is "" then return "ignored"

	set checkJS to "(function(){var v=document.querySelector('video');return (v&&!v.paused&&!v.ended)?'playing':'paused';})();"
	set fallbackTab to missing value
	set playingTab to missing value

	try
		if application "Brave Browser" is running then
			tell application "Brave Browser"
				repeat with w in windows
					repeat with t in tabs of w
						set tURL to ""
						try
							set tURL to URL of t
						end try
						if tURL contains "music.youtube.com" then
							if fallbackTab is missing value then set fallbackTab to t
							try
								set playState to execute t javascript checkJS
								if playState is "playing" then
									set playingTab to t
									exit repeat
								end if
							end try
						end if
					end repeat
					if playingTab is not missing value then exit repeat
				end repeat

				set targetTab to fallbackTab
				if playingTab is not missing value then set targetTab to playingTab

				if targetTab is not missing value then
					set jsCode to "(function(){var b=document.querySelector('" & sel & "');if(b)b.click();return 'ok';})();"
					execute targetTab javascript jsCode
					return "done"
				end if
			end tell
		end if
	end try
	return "no-tab"
end run
