# Team Radio subtitles

OpenF1 publishes recording URLs, without transcript text. The production website reads finished transcripts from the public `codex/radio-transcripts` branch of `championwang00/pitwall-f1`. GitHub Actions performs speech recognition independently of the Vercel deployment. New recordings become readable without building or redeploying the website.

## Automatic updates

`.github/workflows/radio-transcripts.yml` runs every hour at minute 17 UTC, and can also be run manually. It checks completed race, qualifying, sprint and practice sessions for the current UTC year, newest first. Future, cancelled and testing sessions are excluded. Sessions in the last two weeks are checked each run so recordings published late are picked up; older sessions are audited weekly. At most 80 clips are processed per run; subsequent runs resume remaining work. The daily manifest heartbeat keeps the data branch active between race weekends.

Discovery uses Python's standard library. If there is no pending audio, the workflow does not install or load the speech engine. Otherwise it runs [`faster-whisper`](https://github.com/SYSTRAN/faster-whisper) 1.2.1 with `small.en` on CPU using int8. The model is cached between jobs. Before recognition, ffmpeg converts audio to 16 kHz mono, applies a 200–3800 Hz voice band and normalises loudness, matching the local pipeline. A short vocabulary prompt supplies F1 technical terms and driver-name spellings without inventing statements. The workflow installs ffmpeg only when there is pending audio; manual use falls back to the source audio if ffmpeg is unavailable. Each clip is saved separately, including when another clip fails. If every attempted clip fails, the command exits with an error after saving retry state; the workflow still uploads that state. Failures retry after one hour, increasing to a maximum 24-hour interval. Quiet or uncertain segments and repeated stock phrases are filtered; an empty successful transcript means no clear speech was recognised. Generated words can still contain recognition errors, especially under engine noise.

The cloud runner reads media from the website's existing public `/api/radio/audio` endpoint using `RADIO_AUDIO_PROXY=https://pitwall-f1-nine.vercel.app/api/radio/audio`, because direct F1 audio requests from GitHub runners returned HTTP 403. Original recording URLs still pass the same strict host and path checks. The worker only accepts this authorised proxy, rejects redirects and non-audio responses, and enforces download timeout and size limits. Local runs default to direct official audio requests.

The workflow needs `contents: write` for the repository's built-in `GITHUB_TOKEN`; speech recognition uses no external ASR key, while Chinese translation requires the encrypted `DEEPSEEK_API_KEY` secret. DeepSeek calls run in the background worker, never on page requests. The `codex/radio-transcripts` data branch must exist before the first run. It must contain `vercel.json` with `git.deploymentEnabled["codex/radio-transcripts"]=false`; the workflow copies the same configuration on every run. [Vercel's branch configuration](https://vercel.com/docs/project-configuration/git-configuration) disables automatic deployments for that branch. Code changes to the website still require normal deployment.

## Data contract

Each recording directory is `recording_url.split('/TeamRadio/')[0]`. Its UTF-8 SHA-256, in full lowercase hex, determines `sessions/<hash>.json`:

```json
{"version":1,"updatedAt":"ISO timestamp","sessionKey":11388,"transcripts":{"https://livetiming.formula1.com/static/.../TeamRadio/VER_1.mp3":{"text":"Box, box.","segments":[{"start":0,"end":1,"text":"Box, box."}],"model":"faster-whisper/small.en","at":"ISO timestamp","v":3}},"failures":{}}
```

`manifest.json` tracks discovery times and known recording URLs; `queue.json` is the latest discovered pending batch. Per-clip failure records include attempt count, error, timestamp and next retry time. Completed clips are skipped on all subsequent runs.

The website prefers the matching cloud pack, once per directory even for a session-wide batch, and falls back to valid bundled `data/radio-transcripts.json` entries, including older timed formats. Origin packs have a five-minute in-process TTL. Read failures retain already loaded text. Missing production subtitles return HTTP 202 with `status: pending` and a 30-second `Retry-After`; clips that failed processing return `status: retrying`. A missing pack is pending, not a completed empty transcript. The browser polls only visible rows and the open audio card, increasing its delay to a maximum two minutes. Scrolling away or closing the card cancels its polling. Recognition errors, temporary fetching errors and completed clips with no clear speech have distinct displayed statuses.

`GET /api/radio/transcript?url=...` returns timed text or a pending state. `POST /api/radio/transcript` with `{ "urls": [...] }` remains a cache-only bulk lookup returning `{ "url": transcript-or-null }`. Production requests never start local Whisper processes. Local development retains the original ffmpeg/Whisper fallback.

## Manual operations

```sh
# Seed the existing bundled transcripts into a checked-out data branch.
python3 scripts/cloud-radio-transcripts.py --data-dir /path/to/radio-data --seed data/radio-transcripts.json

# Check a single finished session without installing ASR dependencies.
python3 scripts/cloud-radio-transcripts.py --data-dir /path/to/radio-data --session 11388 --discover-only

# Generate a three-clip smoke batch, resuming the discovered queue.
python3 -m pip install -r scripts/cloud-radio-requirements.txt
python3 scripts/cloud-radio-transcripts.py --data-dir /path/to/radio-data --from-queue --limit 3

# Discover a historical season; use --dry-run to stop before transcription.
python3 scripts/cloud-radio-transcripts.py --data-dir /path/to/radio-data --year 2025 --dry-run
```

Manual GitHub Actions inputs accept an optional session key and year. Set the boolean `retry_failed` input to true, or pass `--retry-failed` locally, to retry failed clips immediately after fixing an infrastructure error. This explicitly ignores failed-clip cooldown; completed clips are always skipped. Scheduled runs keep their normal retry delay. Scheduled runs always use the current year. A dry run writes discovery metadata and the pending queue, but does not run ASR. Commit and push the data directory to `codex/radio-transcripts` to publish manual results.

## Verification and limits

```sh
node --no-warnings --experimental-strip-types --import ./scripts/lib/ts-register.mjs scripts/test-cloud-radio.mjs
python3 scripts/test-cloud-radio.py
```

These checks cover shared pack keys, recording URL restrictions, one pack fetch for a batch, deployed lookup and HTTP 202, legacy cache compatibility, pending polling, retrying fetch errors, completed-session filtering, deduplication and saving successes when another clip fails. Audio downloads reject redirects, enforce the OpenF1 recording host/path, use a 30-second timeout and an 8 MiB size limit.

GitHub [scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) may be delayed, and run only when the workflow exists on the default branch. OpenF1 or GitHub failures can postpone availability; automatic subtitles are not a promise of immediate completion or perfect accuracy. Completed years remain readable, but scheduled discovery follows the current year; historical backfills use manual input. The previously investigated `audio-transcript.one2x.ai` service had HTTPS connection failure and HTTP 502, so production updates use the independent CPU worker.

## Chinese captions and speaker identity

The same hourly workflow runs `cloud-radio-translate.py` after transcription. It sends each complete clip's ordered English segments to [DeepSeek Flash](https://api-docs.deepseek.com/api/create-chat-completion/) (`deepseek-flash`, thinking disabled) so the model can use dialogue context, and stores `zh` per segment plus `textZh` in the data branch. Responses must contain exactly the expected unique segment IDs; truncated, missing, duplicate or empty translations are rejected. The prompt supplies F1 vocabulary, preserves uncertainty in unclear ASR text, and prohibits adding facts or inferring speaker identity. Translation metadata records model, format, revision and time.

`DEEPSEEK_API_KEY` lives in the repository's encrypted GitHub Actions secret and is exposed only to the translation step. It is never written into captions, committed files or the browser. The worker uses the official HTTPS API, refuses redirects, sanitizes API failures, retries temporary errors, and processes at most 80 clips per run. Existing non-Flash translations are automatically reprocessed, newest first. Empty speech requires no API call. Failed translations retain all previous English and Chinese captions; successful clips and retry states are saved individually. There is no local translation-model fallback.
Cloud records take precedence over older bundled records. The API returns `translationStatus: pending` while Chinese is missing and uses `no-store`; the browser keeps English visible and polls visible rows/open cards until translation is ready. The cloud pack cache can delay new data by up to five minutes. Website deployments are independent of subtitle/translation updates.

Driver speech uses team colour and engineer speech uses white after playback, with both English and Chinese lines inheriting the same role. Identity now comes exclusively from audio segmentation and WeSpeaker voice matching against human-confirmed references; subtitle phrasing, `spk: voice` guesses and clip ordering cannot assign roles. Unknown identities have an explicit “identity pending confirmation” label and normal readable text.

The hourly job also runs `cloud-radio-voices.py`. It downloads pinned, checksum-verified public ONNX models for pyannote segmentation 3.0 and WeSpeaker ResNet34, runs on CPU and stores voice turns, vectors and matched segment roles alongside existing captions. Clips are limited to 300 seconds. Overlapping or mixed-voice subtitle segments remain unknown. Two human-verified references (driver and engineer) are required for a channel/season; both a cosine-similarity gate and a margin over the competing role are required, with stricter gates for short speech. These are conservative provisional thresholds, not a measured accuracy claim.

`voice-references.json` lives on the independent data branch. `calibrate-radio-voice.py` registers a specifically human-confirmed reference from an analysed clip. Changing the reference hash automatically queues old clips for reclassification; already computed audio vectors are reused without downloading the recording or loading a model. New recordings and engineer changes are handled by the background worker. Until reference identities have actually been confirmed, no driver/engineer assignment is asserted. See [audio identity plan](radio-voice-plan.md).

The page API returns `voiceStatus` and retains live polling of visible rows and the open card while identity is pending. Role changes therefore arrive independently of website publication, just like Chinese subtitles. Audio-processing failures save retry state and preserve English and Chinese captions. Models and API keys never run in the browser.
Regression checks cover timed translation alignment, incremental backfill, retries without losing English, empty speech, cloud-over-bundle precedence, live arrival of Chinese without refreshing, and audio-only driver/team roles, voice-vector reclassification, unknown/overlap handling, and reference provenance.
