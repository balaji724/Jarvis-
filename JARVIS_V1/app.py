"""
JARVIS V1 — Command Line Interface and Main Voice Automation Runner.
"""

import argparse
import sys
from jarvis.database.database import init_db
from jarvis.pipeline.orchestrator import Orchestrator
from jarvis.voice.command_router import CommandRouter, VoiceIntent
from jarvis.voice.speech_to_text import SpeechToText
from jarvis.voice.text_to_speech import speak
from jarvis.utils.logger import logger

def run_voice_loop(orchestrator: Orchestrator):
    """
    Listens continuously for verbal or typed JARVIS commands.
    """
    stt = SpeechToText()
    speak("Jarvis V1 initialized and standing by. Say or type a command.")
    print("\n" + "="*60)
    print(" JARVIS V1 — VOICE AUTOMATION ASSISTANT")
    print(" Commands:")
    print("   'Jarvis, process pending companies'")
    print("   'Jarvis, process Zoho'")
    print("   'Jarvis, find CEO of Zoho'")
    print("   'Jarvis, find five decision makers for Zoho'")
    print("   'Jarvis, export Excel'")
    print("   'Jarvis, show status'")
    print("   'Jarvis, pause' / 'Jarvis, resume' / 'Jarvis, stop'")
    print("   Type 'exit' to quit.")
    print("="*60 + "\n")

    while True:
        try:
            # Attempt microphone capture
            voice_text = stt.listen_command()
            if not voice_text:
                # Text input prompt if no microphone detected
                user_input = input("\n[JARVIS LISTENING]> ").strip()
            else:
                user_input = voice_text

            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit", "q"):
                speak("Shutting down Jarvis. Goodbye.")
                break

            cmd = CommandRouter.parse(user_input)
            logger.info(f"Interpreted Intent: {cmd.intent} (Params: {cmd.model_dump()})")

            if cmd.intent == VoiceIntent.PROCESS_PENDING or cmd.intent == VoiceIntent.PROCESS_SHEET:
                orchestrator.process_pending_companies()
            elif cmd.intent == VoiceIntent.PROCESS_COMPANY and cmd.company:
                orchestrator.process_single_company(
                    company_name=cmd.company,
                    target_role=cmd.role or "CEO",
                    max_people=cmd.max_people
                )
            elif cmd.intent == VoiceIntent.FIND_PEOPLE and cmd.company:
                orchestrator.process_single_company(
                    company_name=cmd.company,
                    target_role=cmd.role or "CEO",
                    max_people=cmd.max_people
                )
            elif cmd.intent == VoiceIntent.EXPORT_EXCEL:
                orchestrator.export_excel()
            elif cmd.intent == VoiceIntent.SHOW_STATUS:
                status = orchestrator.get_status()
                speak(f"Status: {status['state']}. {status['completed']} completed, {status['remaining']} remaining.")
            elif cmd.intent == VoiceIntent.PAUSE:
                orchestrator.pause()
            elif cmd.intent == VoiceIntent.RESUME:
                orchestrator.resume()
            elif cmd.intent == VoiceIntent.STOP:
                orchestrator.stop()
            else:
                speak("Command not recognized. Please repeat or type your instruction.")

        except (KeyboardInterrupt, EOFError):
            print("\nExiting...")
            break
        except Exception as e:
            logger.error(f"Error in main loop: {e}")

def main():
    parser = argparse.ArgumentParser(description="JARVIS V1 — Voice-Controlled Research Assistant")
    parser.add_argument("--pending", action="store_true", help="Process all pending companies from Google Sheet")
    parser.add_argument("--company", type=str, help="Process a single specific company")
    parser.add_argument("--role", type=str, default="CEO", help="Target role (default: CEO)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of pending companies to process")
    parser.add_argument("--dry-run", action="store_true", help="Run without writing back to Google Sheet")
    parser.add_argument("--export", action="store_true", help="Export existing results to Excel file")

    args = parser.parse_args()

    # Initialize SQLite database
    init_db()
    orchestrator = Orchestrator()

    if args.export:
        path = orchestrator.export_excel()
        print(f"Excel export complete: {path}")
        sys.exit(0)

    if args.company:
        print(f"Researching company: {args.company} (Role: {args.role})...")
        results = orchestrator.process_single_company(
            company_name=args.company,
            target_role=args.role,
            max_people=1,
            dry_run=args.dry_run
        )
        for r in results:
            print(f"\n[RESULT] {r.company} | Domain: {r.domain}")
            print(f"Executive: {r.full_name} ({r.designation})")
            print(f"Email: {r.email} [{r.email_status}]")
            print(f"LinkedIn: {r.linkedin_url}")
            print(f"Confidence: {r.confidence}% ({r.verification_status})")
        sys.exit(0)

    if args.pending:
        print(f"Processing pending companies (Limit: {args.limit}, DryRun: {args.dry_run})...")
        orchestrator.process_pending_companies(limit=args.limit, dry_run=args.dry_run)
        sys.exit(0)

    # Interactive voice / prompt loop
    run_voice_loop(orchestrator)

if __name__ == "__main__":
    main()
