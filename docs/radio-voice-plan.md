# Audio identity: suspended after source research

As of 2026-10-12, audio identity is experimental and suspended in the hourly production workflow. English transcription and DeepSeek Flash translation continue automatically. The API reports `voiceStatus: unavailable`; the client does not poll for identity or show repeated confirmation prompts. Unidentified subtitles remain readable white. No role is inferred from text or the car number.

## Sources inspected

The official Singapore race archive [index](https://livetiming.formula1.com/static/2026/2026-10-11_Singapore_Grand_Prix/2026-10-11_Race/Index.json) lists the available feeds. All 32 [TeamRadio captures](https://livetiming.formula1.com/static/2026/2026-10-11_Singapore_Grand_Prix/2026-10-11_Race/TeamRadio.json) contain only `Utc`, `RacingNumber`, and `Path`. The number identifies the car channel, not the person speaking. `AudioStreams.json` contains English live coverage; `ContentStreams.json` contains commentary and the same coverage stream. Neither provides per-turn speaker identity.

The original Antonelli recording used in calibration is mono, 48 kHz MP3. Driver and engineer are not separate stereo channels. Official named radio videos, such as [Hamilton and Peter Bonnington at Silverstone](https://www.formula1.com/en/video/great-britain-2020-listen-to-hamiltons-radio-during-silverstone-tyre-drama.1687509568748062870), identify participants but do not supply machine-readable turn labels. Official interviews could seed candidate voice references, but matching clean interview audio to distorted radio requires validation and is not currently a proven automatic solution.

The public [scriptaudio radio dataset](https://huggingface.co/datasets/scriptaudio/f1-team-radio) has approximately 14,700 recordings and transcripts, with driver/channel identifiers but no per-turn driver/engineer reference labels. We did not find a ready-to-use, reliably labelled voice bank for the current field. This finding concerns the public sources inspected, not undisclosed private F1 interfaces.

## Failed calibration and retained experiment

The user confirmed voice A was the team, but voice B contained both driver and team. Therefore B cannot be registered as a driver reference, and the model's anonymous clusters cannot be treated as reliably separated people. No role reference has been registered. No further user-by-user confirmation is requested.

The retained experimental scripts use pinned, checksum-verified pyannote segmentation ONNX and WeSpeaker ResNet34 embeddings. Role assignment requires independently human-confirmed driver and engineer references for the channel and season. Provisional similarity gates have not been validated for accuracy. The experiment can be revisited if reliable labelled sources and independent validation become available; it does not run automatically in production now.
