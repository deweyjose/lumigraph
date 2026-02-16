# Lumigraph — Product Specification

## 1. Vision

Lumigraph is a multi-user astrophotography platform where users can:

- Publish final processed images
- Upload and share integration data (FITS, stacks, etc.)
- Document acquisition details
- Document processing workflows
- Later: construct, share, and execute workflows with guardrails
- Eventually: automate execution in the cloud

Lumigraph is not just a gallery.  
It is a structured astrophotography journal and dataset publishing platform.

---

## 2. Phase Strategy

### Phase 1 — Astro Journal + Dataset Platform (MVP)

Focus:
- Authentication
- Image posts
- Dataset uploads
- Public browsing
- Clean multi-user foundation

### Phase 2 — Workflow Documentation

Focus:
- Structured workflow steps
- Manual vs automated step types
- Attach PixInsight process icons
- Guardrails and step guidance

### Phase 3 — AI Copilot + Workflow Construction

Focus:
- On-platform AI assistant
- Workflow validation
- Target-aware guardrails
- Intelligent recommendations

### Phase 4 — Cloud Execution Engine

Focus:
- Execute workflows server-side
- Batch processing
- Distributed pipeline
- Optional paid compute tier

---

## 3. Core Domain Concepts (Phase 1)

### 3.1 User

A registered user who can:

- Create image posts
- Upload datasets
- Publish work
- Manage visibility

All primary keys use UUID.

---

### 3.2 ImagePost

Represents a final astrophotography image.

**Fields:**

- `id` (UUID)
- `userId`
- `slug` (unique)
- `title`
- `description`
- `visibility` ("draft" | "private" | "unlisted" | "public")
- `targetName` (e.g., "M31")
- `targetType` (Galaxy, Nebula, etc.)
- `captureDate`
- `bortle` (int)
- `finalImageUrl`
- `finalImageThumbUrl`
- `createdAt`
- `updatedAt`

**Rules:**

- Only owner can edit
- Visibility: draft (owner only), private (owner only), unlisted (link-only), public (discoverable)
- Slug must be unique

---

### 3.3 Dataset

Represents integration data associated with an image post.

**Fields:**

- `id` (UUID)
- `userId`
- `imagePostId` (optional)
- `title`
- `description`
- `visibility` ("private" | "unlisted" | "public")
- `createdAt`
- `updatedAt`

**Rules:**

- Dataset may exist independently of a published post
- Visibility controls download access
- Owner-only mutation

---

### 3.4 DatasetArtifact

Represents an uploaded file in S3.

**Fields:**

- `id` (UUID)
- `datasetId`
- `filename`
- `fileType`
- `s3Key`
- `sizeBytes`
- `checksum` (optional)
- `createdAt`

**Rules:**

- Files stored in S3 only
- No large blobs in database
- Access via presigned URLs
- Bucket access not public

---

## 4. Multi-Environment Deployment Model

Lumigraph runs across:

- Dev AWS Account
- Prod AWS Account

Terraform structure:

- `infrastructure/bootstrap`
- `infrastructure/app`

GitHub OIDC assumes environment-specific `AWS_ROLE_ARN`.

Deployment model:

- Auto plan on PR + main
- Manual apply on branches
- Auto apply on main
- GitHub environments inject correct `AWS_ROLE_ARN`

---

## 5. Architectural Principles

1. UUID everywhere (until it doesn’t make sense)
2. No business logic in route handlers
3. Validate all API input with Zod
4. Service layer owns domain logic
5. Repository layer owns database access
6. S3 stores all large artifacts
7. Documentation is part of definition of done
8. Small increments > large refactors

---

## 6. Non-Goals (Phase 1)

- No workflow construction yet
- No AI copilot yet
- No cloud execution yet
- No monetization features
- No advanced search

Keep Phase 1 minimal and shippable.

---

## 7. Future Direction (Context Only)

Later phases may include:

- Structured workflow builder
- Step type taxonomy (automated/manual/iterative)
- PixInsight artifact upload
- AI feedback during workflow construction
- Target-aware processing suggestions
- Cloud-based workflow execution
- Community voting and forking

These are not part of Phase 1.

---

## 8. Definition of Done (Phase 1)

Lumigraph MVP is complete when:

- A user can log in
- Create an image post
- Upload integration artifacts to S3
- Publish the post
- Public users can browse and view posts
- Datasets can be downloaded via presigned URL
- Dev and Prod environments deploy cleanly via OIDC
