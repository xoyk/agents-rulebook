<!-- rule:publishing -->
## Publishing

{{one line: what is published, where, and what triggers it}}

Publishing is not an edit that can be taken back. Both rules below were paid
for once already, on another project, and both look like paranoia until the
day they do not.

<!-- rule:publishing-is-overwriting -->
### A file cannot be unpublished, only overwritten

**Symptom** — screenshots on a live site carried real customer data: issue
keys, summaries, the initials of the people assigned. They were deleted from
the repository and pushed. The HTML updated correctly and stopped referencing
them; both image URLs went on answering `200` with the original bytes —
`cf-cache-status: HIT`, `age: 320`, `cache-control: public, s-maxage=604800`.

A deployment that no longer contains a file does not evict what the edge
already holds, and a query-string cache-buster does not shift it either. Left
alone it would have served the real data for a week.

What worked was a deployment putting **new bytes at the same paths**, confirmed
by fetching them: 88069 B → 1978 B, about two minutes after the build.

```bash
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' https://<site>/<asset>
```

So: to take something off a published site, replace it. Deleting it looks like
the same action and is not. **Confirm by fetching the URL** — the state of the
repository proves nothing about what the edge is serving.

<!-- rule:public-invented-data -->
### Anything shown in public is drawn from invented data

Every screen, frame or fixture that can end up on a public page uses made-up
projects, made-up people and made-up numbers. Not "scrubbed before export":
**invented at the source**, so the safe result is what happens by default
rather than something somebody has to remember at the last step.

The production material these are copied from follows the same rule, because a
copy inherits whatever it was copied from — which is how real data reaches a
public page in the first place.
