# JARVIS V1 — Voice-Controlled Research Automation Assistant

JARVIS V1 is an autonomous, voice-driven research agent that reads target company lists from a Google Sheet, discovers their authentic corporate websites and domains, conducts legitimate public research to identify executive decision-makers (CEOs, founders, directors, VPs), extracts verified contact points and LinkedIn URLs without scraping, computes mathematical confidence scores, and writes structured outputs back to Google Sheets and Excel workbooks.

---

## 1. Architecture Overview

```
Voice / CLI / API / Dashboard
             ↓
    Command Router & STT
             ↓
     Queue & Orchestrator (Worker Pool)
             ↓
       Google Sheets (Input Tab)
             ↓
     Company Discovery (Domain Normalization & Entity Disambiguation)
             ↓
 Decision-Maker Search (Tavily Search API + SQLite Cache)
             ↓
 AI Extraction (OpenAI Responses API + Structured Output)
             ↓
  Compliance Verification (Email Rules & Permitted LinkedIn Resolver)
             ↓
    Confidence Engine (Weighted Evidence Scoring 0-100)
             ↓
 Deduplication & Merging
             ↓
   Google Sheets (Output Tab) & Excel Export
```

---

## 2. Requirements & Prerequisites

- **Operating System:** Windows 10/11, macOS, or Linux
- **Python:** 3.11 or higher
- **Google Cloud Platform:** Free tier account with Sheets API enabled
- **Search Provider:** Tavily Search API key
- **AI Model Provider:** OpenAI API key (`OPENAI_MODEL=gpt-5.6-luna`)

---

## 3. Windows 11 / 10 Quickstart Guide

Open PowerShell or Command Prompt:

```cmd
:: 1. Navigate to JARVIS project directory
cd JARVIS_V1

:: 2. Create virtual environment
py -3.11 -m venv .venv

:: 3. Activate virtual environment
.venv\Scripts\activate

:: 4. Upgrade pip
python -m pip install --upgrade pip

:: 5. Install all dependencies
pip install -r requirements.txt

:: 6. Copy environment configuration
copy .env.example .env
```

*(On macOS/Linux, run: `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cp .env.example .env`)*

---

## 4. Google Cloud & Google Sheets Setup

### Step-by-Step Walkthrough

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** > **New Project** > Name it `Jarvis-Automation` > Click **Create**.
3. In the left navigation, open **APIs & Services** > **Library**.
4. Search for **Google Sheets API** and click **Enable**.
5. Open **APIs & Services** > **OAuth consent screen**:
   - Choose **External** > Click **Create**.
   - Fill in App name: `JARVIS V1`, User support email, and Developer contact email.
   - Click **Save and Continue** through Scopes.
   - In **Test users**, add your personal Google account email > Click **Save and Continue**.
6. Open **APIs & Services** > **Credentials**:
   - Click **Create Credentials** > **OAuth client ID**.
   - Application type: **Desktop app**.
   - Name: `JARVIS Desktop Client`.
   - Click **Create**.
7. In the OAuth client popup, click **Download JSON**.
8. Rename the downloaded file to:
   ```
   credentials.json
   ```
9. Place `credentials.json` directly inside the root `JARVIS_V1/` directory alongside `app.py`.

---

## 5. Google Sheet Structure

Create a new Google Sheet in Google Drive. Note the spreadsheet ID from the URL:
`https://docs.google.com/spreadsheets/d/`**`<GOOGLE_SHEET_ID>`**`/edit`

### 1. Worksheet Name: `Input`

Create row 1 headers in the `Input` sheet:

| Company Name | City | Country | Target Role | Max People | Status |
|---|---|---|---|---|---|
| Zoho | Chennai | India | CEO | 1 | Pending |
| TCS | Chennai | India | CEO | 1 | Pending |
| Infosys | Bengaluru | India | CEO | 1 | Pending |

### 2. Worksheet Name: `Output`

The application will **automatically create and format** the `Output` worksheet with frozen headers and the following columns:

```
Company | City | Country | Domain | First Name | Last Name | Full Name | Designation | Email | Email Status | LinkedIn URL | Source URLs | Confidence | Verification Status | Run ID | Updated At
```

---

## 6. Configuring `.env`

Edit your `.env` file with your credentials:

```ini
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.6-luna

TAVILY_API_KEY=tvly-...

GOOGLE_SHEET_ID=1A2B3C4D5E6F7G8H...
GOOGLE_CREDENTIALS_PATH=credentials.json
GOOGLE_TOKEN_PATH=token.json

INPUT_TAB=Input
OUTPUT_TAB=Output

MAX_WORKERS=5
MAX_SEARCH_RESULTS=6
CACHE_TTL_HOURS=168
REQUEST_TIMEOUT=20
MIN_CONFIDENCE=75
```

---

## 7. Running JARVIS V1

### Option A: Interactive Voice & Assistant Console
```cmd
python app.py
```
JARVIS will announce: *"Jarvis V1 initialized and standing by. Say or type a command."*
You can speak into your microphone or type commands:
- `"Jarvis, process pending companies"`
- `"Jarvis, process Zoho"`
- `"Jarvis, find CEO of Zoho"`
- `"Jarvis, find five decision makers for Zoho"`
- `"Jarvis, export Excel"`
- `"Jarvis, show status"`
- `"Jarvis, pause"`
- `"Jarvis, resume"`
- `"Jarvis, stop"`

### Option B: Batch CLI Commands
```cmd
:: Process all pending companies from Google Sheet
python app.py --pending

:: Process with row limit
python app.py --pending --limit 5

:: Research a specific company
python app.py --company Zoho --role CEO

:: Dry-run mode (does not update Google Sheet)
python app.py --company Zoho --dry-run

:: Export results directly to Excel
python app.py --export
```

### Option C: REST API & Web Dashboard
```cmd
uvicorn api.main:app --reload --port 8000
```
Open your browser to:
- **Interactive Web Dashboard:** `http://localhost:8000/dashboard`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

## 8. Confidence Scoring & Compliance Engine

JARVIS assigns a mathematical score (0-100) based on strict factual provenance:

| Evidence Criterion | Points |
|---|---|
| Official company source confirmed | +40 |
| Authoritative third-party source (Gov registry / Forbes / Bloomberg) | +25 |
| Two independent sources confirming entity & role | +15 |
| Exact company domain match | +10 |
| Target role match | +5 |
| Geographic headquarters match | +5 |

### Classifications:
- **90 – 100:** `VERIFIED`
- **75 – 89:** `HIGH_CONFIDENCE`
- **60 – 74:** `NEEDS_REVIEW`
- **0 – 59:** `LOW_CONFIDENCE`

### Safety & Compliance Rules:
1. **Never guesses emails:** If an email is predicted via formula (`first.last@domain.com`), it is classified as `INFERRED_NOT_VERIFIED` and cleared (`null`). Only explicitly published contact emails from legitimate sources receive `VERIFIED_PUBLIC`.
2. **Never scrapes private LinkedIn data:** LinkedIn URLs are stored **only** when returned in permitted, public search results or public company press pages.
3. **Never bypasses CAPTCHAs or Cloudflare:** Operates strictly via official and compliant APIs.

---

## 9. Running Automated Tests

Run the test suite without making external API calls:

```cmd
pytest -v
```

All tests for URL normalization, Apple Inc. disambiguation, email verification rules, person deduplication, and confidence scoring run against isolated fixtures.

---

## 10. Troubleshooting

1. **`OAuth credentials file credentials.json not found`**:
   Ensure `credentials.json` downloaded from Google Cloud Console is placed in `JARVIS_V1/credentials.json`.
2. **`Tavily API key is missing`**:
   Add `TAVILY_API_KEY=tvly-...` to your `.env` file.
3. **`Microphone input unavailable`**:
   JARVIS automatically falls back to an interactive console input if no microphone or PyAudio driver is detected. You can speak or type anytime.
4. **`pyttsx3 audio driver warning`**:
   In headless or container environments without an audio device, speech output is logged to the console with `[JARVIS SPEAKS]`.
