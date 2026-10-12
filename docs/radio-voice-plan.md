# Audio identity for team radio

Role labels must be generated from waveform evidence, not words. DeepSeek only translates text. The UI preserves driver team-colour and engineer white after playback whenever a role is identified from a verified audio reference.

The background worker uses the public ONNX export of pyannote segmentation 3.0 to detect voice turns and overlap, followed by WeSpeaker ResNet34 to extract a normalised 256-dimensional voice vector. Both model revisions and weight checksums are pinned. All inference runs on the GitHub CPU worker and outputs persistent session data; page requests never run a model or require a redeploy.

Role assignment requires independently human-confirmed references for both the driver and engineer on the relevant driver's radio channel and season. An unlabelled cluster is not a driver/engineer identity. Non-driver is never automatically engineer. Unknown, very short, overlapping, mixed-role subtitle segments and low/marginal matches remain unidentified. Similarity thresholds are provisional conservative gates, not calibrated accuracy claims; hold-out recordings need human review before any accuracy claim.

References live in `voice-references.json` on the persistent data branch, with `id`, `driverCode`, `year`, `role`, `recordingUrl`, `start`, `end`, `verifiedBy: human`, `verifiedAt`, `model`, and an `embedding` array. Changing references changes their hash and automatically queues reclassification of existing clips. New voices and engineer changes require additional reference confirmation, rather than quietly assigning a wrong role.

A one-time calibration set is prepared from real recordings. Its voice A/B labels are deliberately anonymous until listened to and confirmed. The resulting references apply to subsequent races in that season without website publication. No annotation supplied by a model or a sentence-pattern rule may be marked human-verified.
