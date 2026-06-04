# ZUtils

A collection of browser-based utilities for developers.

## Features

- **PagerDuty Calendar**: Visualize PagerDuty on-call schedules.
- **ANSI Converter**: Convert ANSI-colored logs to HTML.
- **SQS Visualizer**: Visualize SQS queue depth and CloudWatch metrics.
- **Markdown to PDF**: Render Markdown (with Mermaid diagrams) and export it to PDF.

## Markdown to PDF

A fully client-side tool: write or load Markdown on the left, see a GitHub-styled
preview on the right, then export to PDF. Fenced ` ```mermaid ``` ` blocks render
as diagrams. The preview follows the app's light/dark theme.

### Usage

1. Open the **Markdown to PDF** tab.
2. Paste/type Markdown, or use **Load file** to open a `.md` / `.markdown` file.
3. Click **Export PDF** — your browser's print dialog opens; choose **Save as PDF**
   as the destination.

> Tip: in the print dialog, enable **Background graphics** if you want dark-theme
> backgrounds to print. For a clean white document, export in light theme.

No server is required — the feature works on the deployed static site.

## SQS Visualizer

The SQS Visualizer uses a **hybrid architecture** to ensure security and simplicity.

- **Frontend (Static):** The UI runs entirely in your browser. When deployed (e.g., to GitHub Pages), it remains a static site with no access to your AWS credentials.
- **Backend (Local):** A small Node.js server runs on your local machine. It acts as a secure bridge, using your local AWS credential chain to fetch metrics and serving them to the browser via `localhost`.

### Prerequisites

- **Node.js**: Installed on your machine.
- **AWS Credentials**: Configured via the AWS CLI.

#### AWS Authentication

The server uses your local AWS configuration. To set up your credentials:

1.  **Standard Configuration**: Run `aws configure` to set your Access Key and Secret.
2.  **SSO Login**: If your organization uses SSO, run:
    ```bash
    aws sso login --profile <your-profile-name>
    ```
3.  **Finding Profiles**: You can find your available profile names in your AWS config file:
    ```bash
    cat ~/.aws/config | grep '\[profile'
    ```
    Use these names in the **Profile** field of the SQS Visualizer UI.

### Running the Server

From the root of the project:

```bash
npm run server
```

The server binds to `http://localhost:3000` by default.

### Configuration

- **API Base URL**: The React app defaults to `http://localhost:3000`. To override this (e.g., if running the server on a different host), set `REACT_APP_SQS_API_BASE_URL` during build:
  ```bash
  REACT_APP_SQS_API_BASE_URL=http://my-bastion:3000 npm run build
  ```
- **AWS Region**: Default region is `ap-southeast-1`. This can be overridden in the UI form.
- **AWS Profile**: Named profiles can be specified in the UI form.

## Development

```bash
bun install
bun start
```

## Build & Deploy

```bash
npm run deploy
```
