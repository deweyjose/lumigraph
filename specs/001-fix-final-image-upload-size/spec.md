# Feature Specification: Fix Final Image Upload File Size Limit

**Feature Branch**: `001-fix-final-image-upload-size`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "fix a bug with Final image upload. Currently says file too big. but we should be able to upload really large file."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Large Final Image (Priority: P1)

An astrophotographer creates a post and wants to upload their final processed image (or integration artifacts). The file is large—high-resolution TIFFs, FITS stacks, or zipped datasets commonly exceed hundreds of megabytes. Currently the system rejects the upload with a "file too big" error. The user expects to upload files typical of astrophotography workflows without arbitrary size restrictions blocking them.

**Why this priority**: This is the core bug. Users cannot complete their primary workflow (publishing work with assets) when the limit is too low.

**Independent Test**: Can be fully tested by attempting to upload a large file (e.g. 500MB+) and verifying the upload succeeds and the file appears in the dataset or post. Delivers immediate value by unblocking the publish workflow.

**Acceptance Scenarios**:

1. **Given** a user with a draft post or dataset, **When** they select a large file (within the new supported range) for upload, **Then** the upload completes successfully and the file is stored and accessible.
2. **Given** a user attempting to upload a file, **When** the file exceeds the configured maximum, **Then** the system returns a clear, actionable error message (not a generic "file too big").
3. **Given** the upload flow, **When** a file within the allowed size is submitted, **Then** the user does not see "file too big" or equivalent rejection.

### Edge Cases

- What happens when a file exceeds the maximum allowed size? The system MUST return a clear error explaining the limit and what the user can do (e.g. reduce file size or contact support for higher limits).
- How does the system handle files at the boundary of the limit? Uploads at exactly the maximum allowed size MUST succeed.
- How does the system handle concurrent large uploads? Behavior should remain predictable (no silent failures or timeouts without user feedback).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to upload final images and dataset artifacts up to a configurable maximum size that supports typical astrophotography workflows (large FITS, TIFFs, zipped stacks).
- **FR-002**: The system MUST reject uploads that exceed the maximum with a clear, user-friendly error message that states the limit and suggests next steps.
- **FR-003**: The maximum file size MUST be configurable (e.g. via environment or deployment configuration) so deployments can tune for their storage and cost constraints.
- **FR-004**: The default maximum MUST be 1 GB (1,073,741,824 bytes) when `ARTIFACT_MAX_SIZE_BYTES` is not set, sufficient for common astrophotography file sizes so most users are unblocked without configuration.
- **FR-005**: The system MUST validate file size before initiating the upload so users receive immediate feedback rather than failing after a long upload.

### Key Entities

- **Upload flow**: The sequence for storing files (request upload URL → upload file → confirm). Affected by size validation at the initial request step.
- **Final image / Dataset artifact**: The file being uploaded. Size is validated at request time.

## Clarifications

### Session 2026-03-03

- Q: What is the default ARTIFACT_MAX_SIZE_BYTES if not specified in the env? → A: 1 GB (1,073,741,824 bytes)

## Assumptions

- "Final image upload" includes both (a) the main image for an image post and (b) dataset artifacts (FITS, ZIP) when the user refers to uploading their final processed work. The bug manifests in the artifact presign API; the fix applies to any upload flow that enforces a size limit.
- "Really large" means files in the hundreds of MB to low GB range typical of astrophotography (e.g. 500MB–2GB). The exact default is an implementation detail; the spec requires it to be sufficient for common workflows.
- No change to storage backend or infrastructure is required; only the enforced limit and configuration need adjustment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully upload files up to at least 1GB without seeing "file too big" or equivalent errors when using default configuration.
- **SC-002**: Users who attempt to upload a file exceeding the limit receive a clear error message within 5 seconds (no long upload followed by failure).
- **SC-003**: Zero regression: uploads that worked before the fix continue to work after the fix.
- **SC-004**: Administrators can adjust the maximum file size via configuration without code changes.
