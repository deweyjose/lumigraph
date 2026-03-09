# Integration Set Workflow QA Checklist

Use this focused checklist when validating upload, explorer, and export UX on
`/integration-sets/:id`.

## Happy paths

- [ ] Add files and folders into queue, then run `Upload queued files`.
- [ ] Queue summary and progress bar update as statuses move from `pending` to
      `uploading` to `uploaded`.
- [ ] Explorer reflects newly uploaded files without a full page reload.
- [ ] Select files/folders and start ZIP export.
- [ ] Export row transitions from `PENDING` to `RUNNING` to `READY`.
- [ ] `Download ZIP` works for a ready, non-expired export.

## Upload clarity and recovery

- [ ] Failed uploads are visible with actionable error text.
- [ ] `Retry failed` moves failed entries back to `pending`.
- [ ] `Clear uploaded` removes successfully uploaded queue entries.
- [ ] `Clear queue` removes remaining queue entries when needed.

## Explorer ergonomics

- [ ] Search filter narrows visible tree nodes by name/path.
- [ ] `Select visible files` selects all files currently visible after filter.
- [ ] `Expand all` and `Collapse all` improve navigation on deep trees.
- [ ] Selection summary shows file count + total bytes and selected-path preview.

## Export lifecycle feedback

- [ ] Export status banner shows active polling feedback while jobs are running.
- [ ] Running jobs display progress bar and file counts.
- [ ] Failed/cancelled jobs expose retry guidance and can be deleted.
- [ ] Ready jobs show output size and expiry metadata.

## Edge cases

- [ ] Empty set shows guidance when no files exist yet.
- [ ] Filter with zero matches shows the specific "no matches" state.
- [ ] Partial upload failure keeps successful uploads while isolating failed
      queue entries.
- [ ] Expired ready jobs clearly indicate expiry and block stale download.
