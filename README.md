# AMQ scripts

Collection of \*monkey userscripts for Anime Music Quiz

## `amqAutocase.user.js`

Changes your answer to lowercase so you can pretend you didn't use dropdown, or alternate casing to troll.

## `amqCoopPaste.user.js`

Defunct now with official teams mode, but playing as individual players still gives more XP/notes per right answer if everyone is on their own.
When turned on, automatically pastes your answer into the chat, and pastes other players' answers from chat into your own box if they have the script enabled.

Use at your own peril.

## `amqHostSpyMode.user.js`

Automatically hosts Spy vs. Spy mode. See [this pastebin](https://pastebin.com/Q1Z35czX) for details.

The script works by:

1. Counting down while in the lobby before starting a game
2. Sending private messages to each player as the round starts for their target
3. Managing which players are alive during the round
    - Kills players for answering their assassin's rig
    - Sends messages after each song as a reminder for who is still alive
4. Kills last place at the end of the game
5. Continues multi-round games if more than 4 players are alive at the end of any round
    - Moves all dead players from the previous round to spectate
6. Automatically forces new players to spectate if there is an ongoing multi-round game
7. Determines the winner once there are less than 4 players alive

If anyone wants to turn this into a bot that automatically hosts rooms that would be cool.

## `amqHotkeys.user.js`

Customizable hotkeys with various game and lobby functions. Also has auto skip and auto ready built in.

## `amqListEntryCounter.user.js`

Similar to Joseph's song counter script, this counts the total number of unique entries on your list with songs in AMQ.
Useful for finding how many entries you have on a given setting.

Choose the following settings in the lobby before starting, if desired:

- Difficulty
- Song Type
- Dub/Rebroadcast

## `amqMuteOnAnswer.user.js`

Mutes the current song once you answer or the replay phase starts, and unmutes audio once the next song starts.

## `amqVideoBackground.user.js`

Changes AMQ background to the specified video. Edit the script to choose the URL.
