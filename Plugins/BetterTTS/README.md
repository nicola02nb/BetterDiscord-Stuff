# BetterTTS for BetterDiscord 🗣️

A BetterDiscord(BD) a plugin that allows you to play a custom TTS when a message is received.

## Features:

- Enable/Disable TTS entirely
- Enable/Disable `/tts` command
- Enable/Disable user announcement when joining/leaving a channel
- Enable/Disable message reading from channels

### TTS Message Sources:

- Select from which channels TTS should read messages:
  - Never
  - All Channels
  - Focused Channel
  - Connected Channel
  - Focused Server Channels
  - Connected Server Channels
- Set when to ignore TTS while in a voice channel (None / Subscribed / Focused+Connected / All)
- Subscribe/Unsubscribe from servers (guilds) and channels (checkbox on right-click)

### Message Reading Settings:

- Set which channels should prepend server/channel name (None / Subscribed / Focused+Connected / All)
- Prepend/Not Prepend Server name before reading messages
- Prepend/Not Prepend Channel name before reading messages
- Prepend/Not Prepend Usernames before reading messages
- Set which name should be read for users (Default / Username / Display Name / Friend Name / Server Name)
- Set how URLs should be read (Remove / Domain Only / Substitute with "URL" / Keep)
- Enable/Disable reading message spoilers

### TTS Voice Source:

- Choose the TTS source
- Choose the voice for TTS
- Set StreamElements API Key (required for StreamElements source)

Sources Available:

- Discord Default TTS https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
- Streamelements API (About 206 Voices) https://api.streamelements.com/kappa/v2/speech
- Some TikTok voices https://tiktok-tts.weilnet.workers.dev/api/generation

### TTS Audio Settings:

- Set TTS Volume
- Set TTS Speech Rate
- Preview TTS with a test message

### Message Block Filters:

Block messages from:

- Blocked users
- Ignored users
- Non-friend users
- Muted channels
- Muted servers
- Muted users (checkbox on right-click)

### Other

- Adjust Volume
- Select Speech Rate
- Play an audio preview
- Select Delay between Messages
- Set a Keyboard Shortcut to Toggle TTS On/Off (With toast)
