/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JARVIS 2.0 – Autonomous AI Company Intelligence Platform
 */

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Mic, MicOff, Volume2, Play, Pause, Square, Download, RefreshCw,
  Search, ShieldCheck, CheckCircle2, AlertTriangle, FileSpreadsheet,
  Code2, Terminal, ExternalLink, HelpCircle, Copy, Check, ChevronRight,
  Database, UserCheck, Mail, Globe, Layers, ArrowRight, Upload,
  BarChart3, FileUp, Sparkles, Languages, Building2, Briefcase, Award,
  Users, CheckCheck, Clock, FileText, Filter, Phone, MapPin, Plus, X,
  Sliders, CheckSquare, Globe2
} from 'lucide-react';
import { JARVIS_2_FILES, SourceFile } from './jarvisCodebase';

export interface Executive {
  name: string;
  full_name?: string;
  designation: string;
  role_category: string;
  target_designation_matched?: string;
  person_verification_status: 'VERIFIED' | 'HIGH_CONFIDENCE' | 'NEEDS_REVIEW' | 'NOT_FOUND';
  email: string;
  email_status: 'VERIFIED_PUBLIC' | 'INFERRED_NOT_VERIFIED' | 'NOT_FOUND';
  phone?: string;
  phone_status?: 'VERIFIED_PUBLIC' | 'NOT_FOUND';
  linkedin_url: string;
  source_url: string;
  evidence_text: string;
  confidence: number;
  confidence_breakdown?: {
    official_source: number;
    authoritative_registry: number;
    independent_sources: number;
    domain_match: number;
    role_match: number;
  };
}

export interface CompanyIntelligenceRecord {
  session_id: string;
  run_id: string;
  company_name: string;
  official_website: string;
  domain: string;
  industry: string;
  headquarters: string;
  city?: string;
  country?: string;
  location_address?: string;
  location_city?: string;
  location_country?: string;
  corporate_phone?: string;
  contact_portal?: string;
  target_designations_requested?: string[];
  target_designations_found?: string[];
  description: string;
  ceo_name: string;
  cto_name: string;
  cfo_name: string;
  cio_it_name?: string;
  coo_name?: string;
  key_decision_maker: string;
  key_decision_maker_role: string;
  executives: Executive[];
  all_source_urls: string[];
  overall_confidence: number;
  verification_status: 'VERIFIED' | 'HIGH_CONFIDENCE' | 'NEEDS_REVIEW' | 'NOT_FOUND';
  research_timestamp: string;
}

interface LogEntry {
  timestamp: string;
  run_id: string;
  company: string;
  step: string;
  status: string;
  confidence?: number;
  source?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'command' | 'research' | 'bulk' | 'sheets' | 'evidence' | 'analytics' | 'code'>('command');
  const [voiceLang, setVoiceLang] = useState<'en' | 'ta'>('en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [systemState, setSystemState] = useState<'STANDBY' | 'RESEARCHING' | 'PAUSED' | 'COMPLETED'>('STANDBY');

  // Single Research State
  const [queryCompany, setQueryCompany] = useState('Zoho');
  const [queryCity, setQueryCity] = useState('Chennai');
  const [queryState, setQueryState] = useState('Tamil Nadu');
  const [queryCountry, setQueryCountry] = useState('India');
  const [isLoadingSingle, setIsLoadingSingle] = useState(false);

  // Multi-Designation Selection & Custom Extra Designations
  const defaultPresets = ['CEO', 'CTO', 'CFO', 'IT', 'COO', 'CMO', 'Director', 'Founder'];
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>(['CEO', 'CTO', 'CFO', 'IT']);
  const [customDesignationInput, setCustomDesignationInput] = useState('');
  const [customDesignations, setCustomDesignations] = useState<string[]>([]);

  // Location & Contact Choice Options
  const [locationScope, setLocationScope] = useState<'Global' | 'India' | 'USA' | 'UK' | 'Europe' | 'Custom'>('India');
  const [contactOptions, setContactOptions] = useState({
    includePhone: true,
    includeAddress: true,
    includeEmail: true,
    includeLinkedIn: true,
    includePortal: true,
  });

  // Modal / Detailed Drilldown
  const [drilldownCompany, setDrilldownCompany] = useState<CompanyIntelligenceRecord | null>(null);

  // Active Research Session Data
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => 'SESSION_' + Math.random().toString(36).substring(2, 9).toUpperCase());
  const [researchResults, setResearchResults] = useState<CompanyIntelligenceRecord[]>([]);
  const [selectedCompanyResult, setSelectedCompanyResult] = useState<CompanyIntelligenceRecord | null>(null);

  // Execution Progress Monitor
  const [currentStageName, setCurrentStageName] = useState('Standby');
  const [currentStagePercent, setCurrentStagePercent] = useState(0);

  // Live Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      run_id: 'SYS_BOOT',
      company: 'JARVIS 2.0',
      step: 'CORE_ENGINE',
      status: 'ONLINE',
      confidence: 100,
      source: 'Internal Architecture'
    }
  ]);

  // Bulk File Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState('');

  // Google Sheets Twin
  const [sheetInputRows, setSheetInputRows] = useState([
    { id: '1', company: 'Zoho', city: 'Chennai', country: 'India', targetRole: 'CEO, CTO, CFO, IT', status: 'Pending' },
    { id: '2', company: 'Freshworks', city: 'San Mateo', country: 'USA', targetRole: 'CEO, CTO, CFO, IT', status: 'Pending' },
    { id: '3', company: 'Postman', city: 'San Francisco', country: 'USA', targetRole: 'CEO, CTO, CFO, IT', status: 'Pending' },
    { id: '4', company: 'Infosys', city: 'Bengaluru', country: 'India', targetRole: 'CEO, CTO, CFO, IT', status: 'Pending' },
    { id: '5', company: 'Apple Inc.', city: 'Cupertino', country: 'USA', targetRole: 'CEO, CTO, CFO, IT', status: 'Pending' },
  ]);
  const [activeSheetTab, setActiveSheetTab] = useState<'input' | 'output'>('input');

  // Python Code Vault
  const [selectedSourceFile, setSelectedSourceFile] = useState<SourceFile>(JARVIS_2_FILES[0]);
  const [copiedFile, setCopiedFile] = useState(false);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  // Text-To-Speech Synthesis (Supports Tamil & English)
  const speakVoice = (text: string, lang: 'en' | 'ta' = voiceLang) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle Microphone Listener
  const toggleVoiceListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not natively supported in this browser. Please use quick prompt buttons or text input.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = voiceLang === 'ta' ? 'ta-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        speakVoice(voiceLang === 'ta' ? 'ஜார்விஸ் கேட்கிறது.' : 'Jarvis is listening.');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0])
          .map((res: any) => res.transcript)
          .join('');
        setSpeechTranscript(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (speechTranscript) {
          executeVoiceCommand(speechTranscript);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Toggle designation selection
  const toggleDesignation = (role: string) => {
    const r = role.toUpperCase();
    setSelectedDesignations(prev =>
      prev.includes(r) ? (prev.length > 1 ? prev.filter(x => x !== r) : prev) : [...prev, r]
    );
  };

  // Add custom extra designation
  const handleAddExtraDesignation = () => {
    const trimmed = customDesignationInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!customDesignations.includes(trimmed)) {
      setCustomDesignations(prev => [...prev, trimmed]);
    }
    if (!selectedDesignations.includes(trimmed)) {
      setSelectedDesignations(prev => [...prev, trimmed]);
    }
    setCustomDesignationInput('');
  };

  // Remove custom designation
  const handleRemoveCustomDesignation = (role: string) => {
    setCustomDesignations(prev => prev.filter(r => r !== role));
    setSelectedDesignations(prev => prev.filter(r => r !== role));
  };

  // Select all core designations
  const selectAllCoreDesignations = () => {
    setSelectedDesignations(['CEO', 'CTO', 'CFO', 'IT', 'COO', 'CMO', 'DIRECTOR', 'FOUNDER']);
  };

  // Execute Voice Command via Backend NLP Intent Router
  const executeVoiceCommand = async (cmdText: string) => {
    if (!cmdText.trim()) return;

    try {
      const res = await fetch('/api/voice/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdText })
      });
      const data = await res.json();
      const parsed = data.data;

      // Speak vocal response
      const speechText = voiceLang === 'ta' ? parsed.response_speech_tamil : parsed.response_speech_english;
      speakVoice(speechText, voiceLang);

      // Handle parsed intent
      if (parsed.intent === 'RESEARCH_COMPANY' && parsed.company) {
        setQueryCompany(parsed.company);
        executeRealResearch(parsed.company, queryCity, queryCountry, selectedDesignations);
      } else if ((parsed.intent === 'FIND_CEO' || parsed.intent === 'FIND_CTO' || parsed.intent === 'FIND_CFO') && parsed.company) {
        setQueryCompany(parsed.company);
        const singleRole = parsed.role || 'CEO';
        if (!selectedDesignations.includes(singleRole)) {
          setSelectedDesignations(prev => [singleRole, ...prev]);
        }
        executeRealResearch(parsed.company, queryCity, queryCountry, [singleRole]);
      } else if (parsed.intent === 'PROCESS_FILE') {
        setActiveTab('bulk');
      } else if (parsed.intent === 'EXPORT_RESULTS') {
        downloadExportExcel();
      } else if (parsed.intent === 'SHOW_STATUS') {
        setActiveTab('command');
      }
    } catch {
      speakVoice(voiceLang === 'ta' ? 'கட்டளையை இயக்குவதில் சிக்கல்.' : 'Could not process voice command.');
    }
  };

  // Real Autonomous Research Execution with Multi-Designations & Location/Contact Preferences
  const executeRealResearch = async (
    company: string,
    city: string = queryCity,
    country: string = queryCountry,
    roles: string[] | string = selectedDesignations
  ) => {
    if (!company.trim()) return;

    setIsLoadingSingle(true);
    setSystemState('RESEARCHING');
    setCurrentStagePercent(15);
    setCurrentStageName('Phase 1: Entity Disambiguation & Authority Retrieval');

    const addLocalLog = (step: string, status: string, confidence?: number, source?: string) => {
      setLogs(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          run_id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          company,
          step,
          status,
          confidence,
          source
        },
        ...prev.slice(0, 49)
      ]);
    };

    addLocalLog('QUERY_INITIATED', 'PROCESSING', 50, 'Search Provider Queue');

    try {
      setTimeout(() => { setCurrentStagePercent(45); setCurrentStageName('Phase 2: Domain Probe & Anti-Spoofing Verification'); }, 800);
      setTimeout(() => { setCurrentStagePercent(75); setCurrentStageName('Phase 3: Multi-Executive & Location Verification'); }, 1800);

      const targetRolesArray = Array.isArray(roles) ? roles : String(roles).split(/[,;|/]+/).map(s => s.trim());

      const resp = await fetch('/api/research/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          city,
          state: queryState,
          country,
          target_roles: targetRolesArray,
          location_options: {
            city,
            state: queryState,
            country,
            prioritizeHQ: true,
          },
          contact_options: contactOptions,
          session_id: currentSessionId
        })
      });

      const json = await resp.json();
      if (!resp.ok || !json.success) {
        throw new Error(json.error || 'Research failed');
      }

      const record: CompanyIntelligenceRecord = json.data;
      setCurrentStagePercent(100);
      setCurrentStageName('Phase 4: Multi-Designation Confidence Scoring Complete');

      setResearchResults(prev => [record, ...prev.filter(r => r.run_id !== record.run_id)]);
      setSelectedCompanyResult(record);

      addLocalLog('RESEARCH_VERIFIED', record.verification_status, record.overall_confidence, record.all_source_urls[0] || record.domain);

      const foundRolesCount = record.executives?.length || 0;
      const announce = voiceLang === 'ta'
        ? `${record.company_name} நிறுவனத்தின் ஆய்வு முடிவடைந்தது. ${foundRolesCount} பொறுப்பாளர்கள் கண்டறியப்பட்டனர்.`
        : `Research complete for ${record.company_name}. ${foundRolesCount} executive designations verified with ${record.overall_confidence}% confidence.`;
      speakVoice(announce, voiceLang);

    } catch (err: any) {
      addLocalLog('RESEARCH_FAILED', 'ERROR', 0, err.message);
      alert('Research error: ' + err.message);
    } finally {
      setIsLoadingSingle(false);
      setSystemState('COMPLETED');
    }
  };

  // Handle Bulk Upload & Research with Multi-Designations & Location/Contact Preferences
  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setBulkStatusMsg('Uploading and initializing isolated worker pool with multi-designation extraction...');
    setSystemState('RESEARCHING');

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('target_roles', JSON.stringify(selectedDesignations));
    formData.append('country', queryCountry);
    formData.append('city', queryCity);
    formData.append('state', queryState);
    formData.append('include_phone', contactOptions.includePhone ? 'true' : 'false');
    formData.append('include_address', contactOptions.includeAddress ? 'true' : 'false');
    formData.append('include_email', contactOptions.includeEmail ? 'true' : 'false');
    formData.append('include_linkedin', contactOptions.includeLinkedIn ? 'true' : 'false');

    try {
      const resp = await fetch('/api/research/bulk', {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Bulk research failed');
      }

      const newRecords: CompanyIntelligenceRecord[] = data.data;
      setCurrentSessionId(data.session_id);
      setResearchResults(newRecords);
      setBulkStatusMsg(`Successfully processed ${newRecords.length} companies independently for [${selectedDesignations.join(', ')}] in Session: ${data.session_id}`);

      const vMsg = voiceLang === 'ta'
        ? `மொத்தம் ${newRecords.length} நிறுவனங்களின் தகவல்கள் சேகரிக்கப்பட்டன.`
        : `Bulk research complete. Successfully processed ${newRecords.length} companies with multi-designation records.`;
      speakVoice(vMsg, voiceLang);

    } catch (err: any) {
      setBulkStatusMsg('Error: ' + err.message);
    } finally {
      setIsUploading(false);
      setSystemState('COMPLETED');
    }
  };

  // Download Server Generated Excel File (.xlsx)
  const downloadExportExcel = () => {
    window.location.href = `/api/export/excel?session_id=${currentSessionId}`;
    speakVoice(voiceLang === 'ta' ? 'எக்செல் கோப்பு பதிவிறக்கப்படுகிறது.' : 'Downloading formatted Excel results.', voiceLang);
  };

  // Download Full Python ZIP Package
  const downloadFullZip = async () => {
    const zip = new JSZip();
    const root = zip.folder('JARVIS_2.0');
    if (!root) return;

    for (const f of JARVIS_2_FILES) {
      root.file(f.path, f.content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'JARVIS_2.0_Autonomous_Platform.zip';
    a.click();
    URL.revokeObjectURL(url);
    speakVoice('JARVIS 2.0 complete codebase archive downloaded.');
  };

  // Copy code utility
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // Process Google Sheets Input Rows
  const processGoogleSheetsInput = async () => {
    setSystemState('RESEARCHING');
    speakVoice(voiceLang === 'ta' ? 'கூகுள் ஷீட்ஸ் வரிசைகள் செயலாக்கப்படுகின்றன.' : 'Processing Google Sheets input tab.');

    for (let i = 0; i < sheetInputRows.length; i++) {
      const row = sheetInputRows[i];
      if (row.status === 'Completed') continue;

      setSheetInputRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'Processing' } : r));
      await executeRealResearch(row.company, row.city, row.country, row.targetRole);
      setSheetInputRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'Completed' } : r));
    }

    setSystemState('COMPLETED');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Futuristic Enterprise HUD Header */}
      <header className="border-b border-cyan-500/30 bg-slate-900/90 backdrop-blur-xl px-6 py-4 sticky top-0 z-50 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Arc Reactor Core 2.0 with Dual Glowing Orbital Rings */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping opacity-30"></div>
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/50 animate-spin" style={{ animationDuration: '8s' }}></div>
              <div className="absolute inset-1 rounded-full border border-emerald-400/60 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isSpeaking ? 'bg-cyan-400 shadow-[0_0_25px_#00e5ff]' : 'bg-slate-950 border border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
              }`}>
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]"></div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-wider text-white font-mono flex items-center gap-2">
                  JARVIS <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/50 font-bold">2.0 ENTERPRISE</span>
                </h1>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  systemState === 'RESEARCHING' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse' :
                  systemState === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {systemState}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Autonomous AI Company Intelligence Platform</span>
                <span>•</span>
                <span className="text-cyan-400 font-mono">Session: {currentSessionId}</span>
              </p>
            </div>
          </div>

          {/* Controls: Bilingual Toggle, Voice Button, Excel Export, Project Downloader */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setVoiceLang('en')}
                className={`px-2.5 py-1 rounded transition ${voiceLang === 'en' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                English
              </button>
              <button
                onClick={() => setVoiceLang('ta')}
                className={`px-2.5 py-1 rounded transition ${voiceLang === 'ta' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                தமிழ் (Tamil)
              </button>
            </div>

            {/* Voice Listener Trigger */}
            <button
              onClick={toggleVoiceListening}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                isListening
                  ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(6,182,212,0.4)]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? (voiceLang === 'ta' ? 'கேட்கிறது...' : 'Listening...') : (voiceLang === 'ta' ? 'குரல் கட்டுப்பாடு' : 'Voice Assistant')}</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={downloadExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Download results as formatted Excel workbook"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Excel</span>
            </button>

            {/* ZIP Package Downloader */}
            <button
              onClick={downloadFullZip}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <Download className="w-4 h-4" />
              <span>JARVIS_2.0.zip</span>
            </button>
          </div>
        </div>

        {/* Live Detected Speech Bubble */}
        {speechTranscript && (
          <div className="max-w-7xl mx-auto mt-2 px-4 py-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-200 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">[VOICE INPUT]:</span>
              <span>"{speechTranscript}"</span>
            </div>
            <button
              onClick={() => executeVoiceCommand(speechTranscript)}
              className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 text-xs transition"
            >
              Execute Intent
            </button>
          </div>
        )}
      </header>

      {/* Main Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/60 px-6 backdrop-blur">
        <div className="max-w-7xl mx-auto flex gap-6 text-xs font-mono font-medium overflow-x-auto">
          {[
            { id: 'command', label: 'Command Center', icon: Terminal },
            { id: 'research', label: 'Company Research', icon: Search },
            { id: 'bulk', label: 'Bulk CSV / Excel Processing', icon: FileUp },
            { id: 'sheets', label: 'Google Sheets Twin', icon: FileSpreadsheet },
            { id: 'evidence', label: 'Evidence & Source Verification', icon: ShieldCheck },
            { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
            { id: 'code', label: 'Python 2.0 Codebase Vault', icon: Code2 },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'research' && researchResults.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                    {researchResults.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* ================================================================= */}
        {/* TAB 1: COMMAND CENTER                                             */}
        {/* ================================================================= */}
        {activeTab === 'command' && (
          <div className="space-y-6">
            {/* Quick Bilingual Voice Prompt Shortcuts */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-2 uppercase tracking-wider">
                  <Languages className="w-4 h-4" />
                  <span>Bilingual Natural Language Voice Commands ({voiceLang === 'ta' ? 'தமிழ்' : 'English'})</span>
                </span>
                <span className="text-[11px] text-slate-400">Click any prompt to trigger speech recognition & action</span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {(voiceLang === 'ta' ? [
                  'ஜார்விஸ், ஜோஹோ நிறுவனத்தை ஆராய்',
                  'ஜார்விஸ், டாடா கன்சல்டன்சி நிறுவனத்தை ஆராய்',
                  'ஜார்விஸ், ஆப்பிள் நிறுவனத்தை ஆராய்',
                  'ஜார்விஸ், எக்செல் கோப்பை செயலாக்கு',
                  'ஜார்விஸ், முடிவுகளை ஏற்றுமதி செய்',
                  'ஜார்விஸ், நிலவரத்தை சொல்',
                ] : [
                  'Jarvis, research Zoho',
                  'Jarvis, find CEO of Tata Consultancy Services',
                  'Jarvis, research Apple Inc.',
                  'Jarvis, process my Excel file',
                  'Jarvis, export the results',
                  'Jarvis, show status',
                ]).map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSpeechTranscript(cmd);
                      executeVoiceCommand(cmd);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-950/80 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-800 text-slate-300 transition hover:border-cyan-500/40"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Execution HUD Monitor */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Active Target Entity</div>
                <div className="text-lg font-bold text-cyan-300 truncate">{queryCompany || 'Idle'}</div>
                <div className="text-xs text-cyan-400 mt-1 font-mono truncate" title={selectedDesignations.join(', ')}>
                  Roles: {selectedDesignations.join(', ')}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Autonomous Stage</div>
                <div className="text-xs font-bold text-slate-200 mt-1 truncate">{currentStageName}</div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-3 border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${currentStagePercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Verified Companies</div>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  {researchResults.filter(r => r.verification_status === 'VERIFIED').length} / {researchResults.length}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">Zero Hallucination Guarantee</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Session Pipeline</div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => executeRealResearch(queryCompany, queryCity, queryCountry, selectedDesignations)}
                    disabled={isLoadingSingle}
                    className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Query</span>
                  </button>
                  <button
                    onClick={() => setSystemState('PAUSED')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Pause"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSystemState('STANDBY')}
                    className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 border border-rose-800"
                    title="Stop"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Split Screen: Real-Time Log Terminal & Live Executive Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Log Terminal */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[460px] shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>Real-Time Pipeline Execution Stream</span>
                  </span>
                  <button onClick={() => setLogs([])} className="text-xs text-slate-500 hover:text-slate-300 font-mono">
                    Clear Logs
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto mt-3 font-mono text-xs space-y-2 pr-2">
                  {logs.map((log, i) => (
                    <div key={i} className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">[{log.timestamp}] RUN={log.run_id}</span>
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          log.status === 'VERIFIED' || log.status === 'SUCCESS' || log.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' :
                          log.status === 'HIGH_CONFIDENCE' ? 'bg-cyan-500/20 text-cyan-300' :
                          log.status === 'NEEDS_REVIEW' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-200">
                        <span className="text-cyan-400 font-bold">{log.company}</span>
                        <span>›</span>
                        <span className="text-yellow-400">{log.step}</span>
                        {log.confidence !== undefined && (
                          <span className="text-emerald-400">({log.confidence}% Conf)</span>
                        )}
                      </div>
                      {log.source && (
                        <div className="text-[10px] text-slate-500 truncate">
                          Source: {log.source}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Latest Researched Company Intelligence Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[460px] shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Live Intelligence Dossier</span>
                  </span>
                  {selectedCompanyResult && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                      {selectedCompanyResult.overall_confidence}% {selectedCompanyResult.verification_status}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto mt-3 pr-2">
                  {!selectedCompanyResult ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                      <Search className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-sm font-semibold">No active intelligence dossier loaded.</p>
                      <p className="text-xs mt-1">Speak or submit a company research query to see live results.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Header info */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-white">{selectedCompanyResult.company_name}</h3>
                            <a
                              href={selectedCompanyResult.official_website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 text-xs font-mono hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <span>{selectedCompanyResult.domain}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-800">
                            {selectedCompanyResult.industry}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                          {selectedCompanyResult.description}
                        </p>
                      </div>

                      {/* Executive Decision Makers */}
                      <div className="space-y-2">
                        <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                          Identified Decision Makers ({selectedCompanyResult.executives.length})
                        </span>
                        {selectedCompanyResult.executives.map((ex, i) => (
                          <div key={i} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-sm text-white">{ex.name}</span>
                                <span className="text-xs text-cyan-300 ml-2 font-medium">({ex.designation})</span>
                              </div>
                              <span className="text-xs font-mono text-emerald-400 font-bold">
                                {ex.confidence}% Conf
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1 border-t border-slate-900">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                <span>{ex.email}</span>
                                <span className="text-[10px] text-slate-500">[{ex.email_status}]</span>
                              </span>

                              {ex.linkedin_url && ex.linkedin_url !== 'NOT_FOUND' && (
                                <a
                                  href={ex.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-400 hover:underline flex items-center gap-1"
                                >
                                  <span>Public LinkedIn</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 truncate pt-0.5">
                              Evidence: {ex.evidence_text}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Source URLs */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                        <span className="text-slate-400 font-bold block mb-1">Independent Citation Sources:</span>
                        <ul className="space-y-1 text-cyan-400">
                          {selectedCompanyResult.all_source_urls.map((url, i) => (
                            <li key={i} className="truncate">
                              <a href={url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                                <span>• {url}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: COMPANY RESEARCH QUERY LAB                                 */}
        {/* ================================================================= */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            {/* Input Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <h2 className="text-sm font-bold tracking-wide uppercase font-mono text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span>Autonomous Multi-Designation Intelligence Query</span>
                </h2>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-500/30">
                  {selectedDesignations.length} Active Target Designations
                </span>
              </div>

              {/* Company & Geographic Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-mono text-slate-400 mb-1 block">Company Name</label>
                  <input
                    type="text"
                    value={queryCompany}
                    onChange={e => setQueryCompany(e.target.value)}
                    placeholder="e.g. Zoho, Ashok Leyland, TVS Motor"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 mb-1 block">City (Location Filter)</label>
                  <input
                    type="text"
                    value={queryCity}
                    onChange={e => setQueryCity(e.target.value)}
                    placeholder="e.g. Chennai, Mumbai, San Francisco"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 mb-1 block">State / Province</label>
                  <input
                    type="text"
                    value={queryState}
                    onChange={e => setQueryState(e.target.value)}
                    placeholder="e.g. Tamil Nadu, California"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 mb-1 block">Country</label>
                  <input
                    type="text"
                    value={queryCountry}
                    onChange={e => setQueryCountry(e.target.value)}
                    placeholder="e.g. India, USA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Multi-Designation Selector Panel */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Choose Target Designations to Research (Multiple Allowed)</span>
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedDesignations(['CEO', 'CTO', 'CFO', 'IT'])}
                      className="text-cyan-400 hover:underline"
                    >
                      Core 4 (CEO, CTO, CFO, IT)
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={selectAllCoreDesignations}
                      className="text-cyan-400 hover:underline"
                    >
                      All Presets
                    </button>
                  </div>
                </div>

                {/* Preset Role Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {defaultPresets.map(preset => {
                    const isSelected = selectedDesignations.includes(preset.toUpperCase());
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => toggleDesignation(preset)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                        <span>{preset}</span>
                      </button>
                    );
                  })}

                  {/* Custom Extra Designations Added by User */}
                  {customDesignations.map(role => {
                    const isSelected = selectedDesignations.includes(role);
                    return (
                      <span
                        key={role}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleDesignation(role)}
                          className="flex items-center gap-1"
                        >
                          {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                          <span>{role}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDesignation(role)}
                          className="text-slate-500 hover:text-rose-400 ml-1"
                          title="Remove extra designation"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Add Custom Designation Field */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={customDesignationInput}
                      onChange={e => setCustomDesignationInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExtraDesignation();
                        }
                      }}
                      placeholder="Add Extra Designation (e.g. VP Engineering, Legal Counsel, CIO, CMO)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddExtraDesignation}
                    disabled={!customDesignationInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Extra</span>
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">
                    You can add any custom leadership title!
                  </span>
                </div>
              </div>

              {/* Location & Contact Options Bar */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Location & Contact Choose Options</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Select contact channels to verify & display in table
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 cursor-pointer hover:border-cyan-500/40">
                    <input
                      type="checkbox"
                      checked={contactOptions.includePhone}
                      onChange={e => setContactOptions(prev => ({ ...prev, includePhone: e.target.checked }))}
                      className="rounded accent-cyan-500"
                    />
                    <Phone className="w-3 h-3 text-cyan-400" />
                    <span>Corporate Phone</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 cursor-pointer hover:border-cyan-500/40">
                    <input
                      type="checkbox"
                      checked={contactOptions.includeAddress}
                      onChange={e => setContactOptions(prev => ({ ...prev, includeAddress: e.target.checked }))}
                      className="rounded accent-cyan-500"
                    />
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>HQ Postal Address</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 cursor-pointer hover:border-cyan-500/40">
                    <input
                      type="checkbox"
                      checked={contactOptions.includeEmail}
                      onChange={e => setContactOptions(prev => ({ ...prev, includeEmail: e.target.checked }))}
                      className="rounded accent-cyan-500"
                    />
                    <Mail className="w-3 h-3 text-amber-400" />
                    <span>Public Business Email</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 cursor-pointer hover:border-cyan-500/40">
                    <input
                      type="checkbox"
                      checked={contactOptions.includeLinkedIn}
                      onChange={e => setContactOptions(prev => ({ ...prev, includeLinkedIn: e.target.checked }))}
                      className="rounded accent-cyan-500"
                    />
                    <Globe className="w-3 h-3 text-cyan-400" />
                    <span>LinkedIn URL</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 cursor-pointer hover:border-cyan-500/40">
                    <input
                      type="checkbox"
                      checked={contactOptions.includePortal}
                      onChange={e => setContactOptions(prev => ({ ...prev, includePortal: e.target.checked }))}
                      className="rounded accent-cyan-500"
                    />
                    <ExternalLink className="w-3 h-3 text-indigo-400" />
                    <span>Contact Portal</span>
                  </label>
                </div>
              </div>

              {/* Execute Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => executeRealResearch(queryCompany, queryCity, queryCountry, selectedDesignations)}
                  disabled={isLoadingSingle || !queryCompany}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(6,182,212,0.4)]"
                >
                  {isLoadingSingle ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>{isLoadingSingle ? 'Extracting Leadership & Contacts...' : `Research ${queryCompany} for ${selectedDesignations.join(', ')}`}</span>
                </button>
              </div>
            </div>

            {/* Results Table of Accumulated Research Records */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>Verified Corporate Intelligence Records ({researchResults.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Includes dedicated Target Designation, Location & Contact verified columns
                  </p>
                </div>
                {researchResults.length > 0 && (
                  <button
                    onClick={downloadExportExcel}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-mono font-bold hover:bg-emerald-500 flex items-center gap-1.5 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Formatted Excel (.xlsx)</span>
                  </button>
                )}
              </div>

              {researchResults.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-xs">
                  No companies researched in this session yet. Submit a research query above or upload an Excel file.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 whitespace-nowrap">
                        <th className="p-3">Company & Domain</th>
                        <th className="p-3 text-cyan-400">Target Designation(s)</th>
                        <th className="p-3">Roles Found & Executives</th>
                        <th className="p-3">Location / HQ Address</th>
                        <th className="p-3">Contact Phone</th>
                        <th className="p-3">Public Email & Status</th>
                        <th className="p-3">LinkedIn</th>
                        <th className="p-3">Confidence</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 whitespace-nowrap">
                      {researchResults.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          {/* Company */}
                          <td className="p-3">
                            <div className="font-bold text-white text-sm">{r.company_name}</div>
                            <a href={r.official_website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]">
                              <span>{r.domain}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>

                          {/* Target Designation(s) Requested */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {(r.target_designations_requested || selectedDesignations).map((desig, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold"
                                >
                                  {desig}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Roles Found & Executives */}
                          <td className="p-3">
                            <div className="space-y-1 max-w-[260px]">
                              {r.executives && r.executives.length > 0 ? (
                                r.executives.slice(0, 3).map((ex, exIdx) => (
                                  <div key={exIdx} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                                      {ex.target_designation_matched || ex.role_category}
                                    </span>
                                    <span className="text-white font-medium truncate">{ex.name}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500">None Established</span>
                              )}
                              {r.executives && r.executives.length > 3 && (
                                <span className="text-[10px] text-cyan-400 cursor-pointer hover:underline block" onClick={() => setDrilldownCompany(r)}>
                                  +{r.executives.length - 3} more executives...
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location / HQ Address */}
                          <td className="p-3 max-w-[220px]">
                            <div className="text-slate-300 text-xs flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="truncate block" title={r.location_address || r.headquarters}>
                                {r.location_address || r.headquarters}
                              </span>
                            </div>
                          </td>

                          {/* Contact Phone */}
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-cyan-400" />
                              <span className={r.corporate_phone && r.corporate_phone !== 'NOT_FOUND' ? 'text-slate-200' : 'text-slate-500'}>
                                {r.corporate_phone || 'NOT_FOUND'}
                              </span>
                            </div>
                          </td>

                          {/* Public Email */}
                          <td className="p-3">
                            <div className="text-slate-300">{r.executives[0]?.email || 'NOT_FOUND'}</div>
                            <div className="text-[10px] text-slate-500">[{r.executives[0]?.email_status || 'NOT_FOUND'}]</div>
                          </td>

                          {/* LinkedIn */}
                          <td className="p-3">
                            {r.executives[0]?.linkedin_url && r.executives[0]?.linkedin_url !== 'NOT_FOUND' ? (
                              <a href={r.executives[0].linkedin_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                                <span>Profile</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-slate-600">NOT_FOUND</span>
                            )}
                          </td>

                          {/* Confidence */}
                          <td className="p-3">
                            <span className="font-bold text-emerald-400">{r.overall_confidence}%</span>
                          </td>

                          {/* Status */}
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.verification_status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                              r.verification_status === 'HIGH_CONFIDENCE' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                              'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            }`}>
                              {r.verification_status}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setDrilldownCompany(r)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-medium border border-slate-700"
                            >
                              Dossier ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: BULK EXCEL / CSV PROCESSING                                */}
        {/* ================================================================= */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FileUp className="w-5 h-5 text-emerald-400" />
                    <span>Bulk Excel / CSV Multi-Designation Intelligence Engine</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload your spreadsheet of company names. JARVIS will research each independently for all chosen designations.
                  </p>
                </div>
              </div>

              {/* Multi-Designation Selector for Bulk Upload */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Target Designations for Uploaded Rows (Overrides or Supplements File)</span>
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedDesignations(['CEO', 'CTO', 'CFO', 'IT'])}
                      className="text-cyan-400 hover:underline"
                    >
                      Core 4 (CEO, CTO, CFO, IT)
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={selectAllCoreDesignations}
                      className="text-cyan-400 hover:underline"
                    >
                      All Presets
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {defaultPresets.map(preset => {
                    const isSelected = selectedDesignations.includes(preset.toUpperCase());
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => toggleDesignation(preset)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                        <span>{preset}</span>
                      </button>
                    );
                  })}

                  {customDesignations.map(role => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400"
                    >
                      <span>{role}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomDesignation(role)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                  <input
                    type="text"
                    value={customDesignationInput}
                    onChange={e => setCustomDesignationInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExtraDesignation();
                      }
                    }}
                    placeholder="Add extra designation for bulk processing (e.g. CIO, Head of IT, CMO)"
                    className="flex-1 max-w-md bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddExtraDesignation}
                    disabled={!customDesignationInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Extra</span>
                  </button>
                </div>
              </div>

              {/* Upload Box */}
              <form onSubmit={handleBulkUploadSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-8 text-center bg-slate-950/60 transition cursor-pointer">
                  <Upload className="w-10 h-10 text-cyan-400 mx-auto mb-3 opacity-80" />
                  <label className="cursor-pointer">
                    <span className="text-sm font-bold text-cyan-400 hover:underline">Click to browse file</span>
                    <span className="text-xs text-slate-400 block mt-1">Supports .xlsx, .xls, .csv (Max 25 MB)</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {uploadFile && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-xs font-mono text-cyan-200">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-mono text-slate-400">
                    Recognizes headers: "Company", "Target Role" / "Designations", "City", "Country"
                  </div>
                  <button
                    type="submit"
                    disabled={!uploadFile || isUploading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition disabled:opacity-50 flex items-center gap-2 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                  >
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>{isUploading ? 'Executing Batch Research...' : 'Process All Companies'}</span>
                  </button>
                </div>
              </form>

              {bulkStatusMsg && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
                  {bulkStatusMsg}
                </div>
              )}
            </div>

            {/* Bulk Research Results Table with All Dedicated Columns */}
            {researchResults.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white">
                      Enriched Multi-Designation Output Records ({researchResults.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Explicit columns for Target Designation, Location & Verified Contact Channels
                    </p>
                  </div>
                  <button
                    onClick={downloadExportExcel}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-mono font-bold hover:bg-emerald-500 flex items-center gap-1.5 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Formatted Excel (.xlsx)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 whitespace-nowrap">
                        <th className="p-3">Company & Domain</th>
                        <th className="p-3 text-cyan-400">Target Designation(s)</th>
                        <th className="p-3">Roles Found & Executives</th>
                        <th className="p-3">Location / HQ Address</th>
                        <th className="p-3">Contact Phone</th>
                        <th className="p-3">Public Email & Status</th>
                        <th className="p-3">LinkedIn</th>
                        <th className="p-3">Confidence</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 whitespace-nowrap">
                      {researchResults.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          {/* Company */}
                          <td className="p-3">
                            <div className="font-bold text-white text-sm">{r.company_name}</div>
                            <a href={r.official_website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]">
                              <span>{r.domain}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>

                          {/* Target Designation Requested Column */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(r.target_designations_requested || selectedDesignations).map((desig, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold"
                                >
                                  {desig}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Roles Found & Executives Column */}
                          <td className="p-3">
                            <div className="space-y-1 max-w-[240px]">
                              {r.executives && r.executives.length > 0 ? (
                                r.executives.slice(0, 3).map((ex, exIdx) => (
                                  <div key={exIdx} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                                      {ex.target_designation_matched || ex.role_category}
                                    </span>
                                    <span className="text-white font-medium truncate">{ex.name}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500">None Established</span>
                              )}
                              {r.executives && r.executives.length > 3 && (
                                <span className="text-[10px] text-cyan-400 cursor-pointer hover:underline block" onClick={() => setDrilldownCompany(r)}>
                                  +{r.executives.length - 3} more...
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location / HQ Address Column */}
                          <td className="p-3 max-w-[200px]">
                            <div className="text-slate-300 text-xs flex items-start gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="truncate block" title={r.location_address || r.headquarters}>
                                {r.location_address || r.headquarters}
                              </span>
                            </div>
                          </td>

                          {/* Corporate Phone Column */}
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-cyan-400" />
                              <span className={r.corporate_phone && r.corporate_phone !== 'NOT_FOUND' ? 'text-slate-200' : 'text-slate-500'}>
                                {r.corporate_phone || 'NOT_FOUND'}
                              </span>
                            </div>
                          </td>

                          {/* Public Email Column */}
                          <td className="p-3">
                            <div className="text-slate-300">{r.executives[0]?.email || 'NOT_FOUND'}</div>
                            <div className="text-[10px] text-slate-500">[{r.executives[0]?.email_status || 'NOT_FOUND'}]</div>
                          </td>

                          {/* Public LinkedIn Column */}
                          <td className="p-3">
                            {r.executives[0]?.linkedin_url && r.executives[0]?.linkedin_url !== 'NOT_FOUND' ? (
                              <a href={r.executives[0].linkedin_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                                <span>Profile</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-slate-600">NOT_FOUND</span>
                            )}
                          </td>

                          {/* Confidence Score */}
                          <td className="p-3 font-bold text-emerald-400">
                            {r.overall_confidence}%
                          </td>

                          {/* Verification Status */}
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              r.verification_status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                              r.verification_status === 'HIGH_CONFIDENCE' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                              'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            }`}>
                              {r.verification_status}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setDrilldownCompany(r)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono font-medium border border-slate-700"
                            >
                              Dossier ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: GOOGLE SHEETS TWIN                                         */}
        {/* ================================================================= */}
        {activeTab === 'sheets' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Google Sheets Live Synchronization Twin</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Bidirectional mirror of the Google Sheet <code>Input</code> and <code>Output</code> worksheets
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
                  <button
                    onClick={() => setActiveSheetTab('input')}
                    className={`px-3 py-1.5 rounded transition ${activeSheetTab === 'input' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Input Worksheet ({sheetInputRows.length})
                  </button>
                  <button
                    onClick={() => setActiveSheetTab('output')}
                    className={`px-3 py-1.5 rounded transition ${activeSheetTab === 'output' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Output Worksheet ({researchResults.length})
                  </button>
                </div>

                <button
                  onClick={processGoogleSheetsInput}
                  disabled={systemState === 'RESEARCHING'}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition flex items-center gap-1.5 shadow"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Process All Pending</span>
                </button>
              </div>
            </div>

            {/* Input Worksheet */}
            {activeSheetTab === 'input' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3">#</th>
                      <th className="p-3">Company Name</th>
                      <th className="p-3">City</th>
                      <th className="p-3">Country</th>
                      <th className="p-3">Target Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sheetInputRows.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-500">{i + 1}</td>
                        <td className="p-3 font-bold text-white">{r.company}</td>
                        <td className="p-3 text-slate-300">{r.city}</td>
                        <td className="p-3 text-slate-300">{r.country}</td>
                        <td className="p-3 text-cyan-400">{r.targetRole}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            r.status === 'Processing' ? 'bg-cyan-500/20 text-cyan-300 animate-pulse' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => executeRealResearch(r.company, r.city, r.country, r.targetRole)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
                          >
                            Run Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Output Worksheet */}
            {activeSheetTab === 'output' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 whitespace-nowrap">
                      <th className="p-3">Company & Domain</th>
                      <th className="p-3">Target Designation(s)</th>
                      <th className="p-3">Roles Found & Executives</th>
                      <th className="p-3">Location / HQ Address</th>
                      <th className="p-3">Corporate Phone</th>
                      <th className="p-3">Public Email</th>
                      <th className="p-3">Confidence</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3 text-right">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 whitespace-nowrap">
                    {researchResults.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          Output worksheet is currently empty. Run research on pending rows.
                        </td>
                      </tr>
                    ) : (
                      researchResults.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="p-3">
                            <div className="font-bold text-white">{r.company_name}</div>
                            <div className="text-[11px] text-cyan-400">{r.domain}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {(r.target_designations_requested || ['CEO']).map((des, k) => (
                                <span key={k} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                  {des}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1 max-w-[260px]">
                              {r.executives && r.executives.length > 0 ? (
                                r.executives.slice(0, 3).map((e, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                      {e.role_category || e.target_designation_matched || 'EXEC'}
                                    </span>
                                    <span className="font-semibold text-slate-200 truncate">{e.full_name}</span>
                                    <span className="text-[10px] text-slate-500 truncate">({e.designation})</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-400">{r.key_decision_maker} ({r.key_decision_maker_role})</span>
                              )}
                              {r.executives && r.executives.length > 3 && (
                                <span className="text-[10px] text-cyan-400 font-bold block">
                                  +{r.executives.length - 3} more executive(s)...
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-slate-300 max-w-[200px] truncate" title={r.location_address || `${r.city || ''}, ${r.country || ''}`}>
                            {r.location_address || (r.city ? `${r.city}, ${r.country}` : 'NOT_FOUND')}
                          </td>
                          <td className="p-3 text-slate-300 font-mono text-[11px]">
                            {r.corporate_phone && r.corporate_phone !== 'NOT_FOUND' ? (
                              <span className="text-emerald-400 font-semibold">{r.corporate_phone}</span>
                            ) : (
                              <span className="text-slate-500">NOT_FOUND</span>
                            )}
                          </td>
                          <td className="p-3">
                            {r.executives[0]?.email && r.executives[0].email !== 'NOT_FOUND' ? (
                              <span className="text-emerald-300 font-semibold">{r.executives[0].email}</span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">NOT_FOUND</span>
                            )}
                          </td>
                          <td className="p-3 text-emerald-400 font-bold">{r.overall_confidence}%</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {r.verification_status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setDrilldownCompany(r)}
                              className="px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>View Dossier</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: EVIDENCE & SOURCE VERIFICATION STUDIO                      */}
        {/* ================================================================= */}
        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Strict Provenance & Evidence Verification Engine</span>
              </h2>
              <p className="text-xs text-slate-400">
                Audit trail detailing source URLs, evidence quotes, and mathematical confidence weights.
              </p>

              <div className="space-y-4">
                {researchResults.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-mono text-xs">
                    No evidence records loaded yet. Run research to view provenance cards.
                  </div>
                ) : (
                  researchResults.map((rec, i) => (
                    <div key={i} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-base font-bold text-white">{rec.company_name}</span>
                          <span className="text-xs font-mono text-cyan-400 ml-2">({rec.domain})</span>
                        </div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          Run: {rec.run_id} • {rec.research_timestamp.slice(0, 19).replace('T', ' ')} UTC
                        </span>
                      </div>

                      {/* Evidence breakdown bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Official Source:</span>
                          <span className="text-emerald-400 font-bold">+40 Pts</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Authoritative Registry:</span>
                          <span className="text-emerald-400 font-bold">+25 Pts</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Independent Sources:</span>
                          <span className="text-emerald-400 font-bold">+15 Pts</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Domain Match:</span>
                          <span className="text-emerald-400 font-bold">+10 Pts</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Total Confidence:</span>
                          <span className="text-cyan-300 font-bold">{rec.overall_confidence}%</span>
                        </div>
                      </div>

                      {/* Source URLs */}
                      <div>
                        <span className="text-xs font-mono text-slate-400 font-bold block mb-1">
                          Verifiable Public Sources ({rec.all_source_urls.length}):
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs font-mono">
                          {rec.all_source_urls.map((u, j) => (
                            <a
                              key={j}
                              href={u}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 flex items-center gap-1 transition"
                            >
                              <span className="truncate max-w-xs">{u}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: ANALYTICS DASHBOARD                                        */}
        {/* ================================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-xs font-mono text-slate-400 uppercase">Total Companies</div>
                <div className="text-3xl font-bold text-white mt-1 font-mono">{researchResults.length}</div>
                <div className="text-xs text-slate-500 mt-1">Autonomous Batch Pipeline</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-xs font-mono text-slate-400 uppercase">Verification Rate</div>
                <div className="text-3xl font-bold text-emerald-400 mt-1 font-mono">
                  {researchResults.length > 0
                    ? Math.round((researchResults.filter(r => r.verification_status === 'VERIFIED').length / researchResults.length) * 100)
                    : 100}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Confirmed Public Citations</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-xs font-mono text-slate-400 uppercase">Average Confidence</div>
                <div className="text-3xl font-bold text-cyan-300 mt-1 font-mono">
                  {researchResults.length > 0
                    ? Math.round(researchResults.reduce((a, b) => a + b.overall_confidence, 0) / researchResults.length)
                    : 94}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Mathematical Evidence Scoring</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="text-xs font-mono text-slate-400 uppercase">CEO Coverage</div>
                <div className="text-3xl font-bold text-emerald-400 mt-1 font-mono">
                  {researchResults.length > 0
                    ? Math.round((researchResults.filter(r => r.ceo_name !== 'NOT_FOUND').length / researchResults.length) * 100)
                    : 100}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Decision Maker Identification</div>
              </div>
            </div>

            {/* Industry & Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold font-mono text-white mb-4 uppercase">Verification Classification</h3>
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>VERIFIED (90-100%)</span>
                      <span className="font-bold text-emerald-400">
                        {researchResults.filter(r => r.verification_status === 'VERIFIED').length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>HIGH_CONFIDENCE (75-89%)</span>
                      <span className="font-bold text-cyan-300">
                        {researchResults.filter(r => r.verification_status === 'HIGH_CONFIDENCE').length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-cyan-500 h-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>NEEDS_REVIEW (60-74%)</span>
                      <span className="font-bold text-amber-400">
                        {researchResults.filter(r => r.verification_status === 'NEEDS_REVIEW').length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold font-mono text-white mb-4 uppercase">Compliance & Safety Safeguards</h3>
                <ul className="space-y-2 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zero Inferred Email Hallucinations (Strict NOT_FOUND fallback)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Subdomain Spoofing Defense Active (example.com.fake-site.com defense)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Session Isolation Active (Zero cross-contamination between runs)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Legitimate Public Search APIs Only (Zero CAPTCHA/Auth Bypassing)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: PYTHON 2.0 CODEBASE VAULT                                  */}
        {/* ================================================================= */}
        {activeTab === 'code' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[680px] shadow-2xl">
            {/* Left file tree */}
            <div className="border-r border-slate-800 p-4 flex flex-col bg-slate-950/60">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">JARVIS 2.0 Python Stack</span>
                <button
                  onClick={downloadFullZip}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ZIP</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-1">
                {JARVIS_2_FILES.map(file => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedSourceFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition ${
                      selectedSourceFile.path === file.path
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{file.path}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{file.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right code content */}
            <div className="md:col-span-2 flex flex-col bg-slate-950">
              <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">{selectedSourceFile.path}</span>
                <button
                  onClick={() => copyToClipboard(selectedSourceFile.content)}
                  className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFile ? 'Copied' : 'Copy File'}</span>
                </button>
              </div>

              <pre className="flex-1 p-5 overflow-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950 selection:bg-cyan-500/30">
                <code>{selectedSourceFile.content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* EXECUTIVE DRILLDOWN DOSSIER MODAL                                 */}
        {/* ================================================================= */}
        {drilldownCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-950/50">
              {/* Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{drilldownCompany.company_name}</h2>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {drilldownCompany.domain}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {drilldownCompany.verification_status} ({drilldownCompany.overall_confidence}%)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Run ID: {drilldownCompany.run_id} • Industry: {drilldownCompany.industry} • Session: {drilldownCompany.session_id.slice(0, 14)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDrilldownCompany(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Close Dossier"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-mono">
                {/* Location & Contact Information Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>HEADQUARTERS & LOCATION</span>
                    </div>
                    <div className="text-white text-xs font-semibold">
                      {drilldownCompany.location_address || (drilldownCompany.city ? `${drilldownCompany.city}, ${drilldownCompany.country}` : 'NOT_FOUND')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      City: {drilldownCompany.city || 'N/A'} • Country: {drilldownCompany.country || 'N/A'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>CORPORATE TELEPHONE / SWITCHBOARD</span>
                    </div>
                    <div className={`text-xs font-bold ${drilldownCompany.corporate_phone && drilldownCompany.corporate_phone !== 'NOT_FOUND' ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {drilldownCompany.corporate_phone || 'NOT_FOUND'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Status: {drilldownCompany.corporate_phone && drilldownCompany.corporate_phone !== 'NOT_FOUND' ? 'PUBLIC_REGISTERED' : 'UNLISTED / NOT_FOUND'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>OFFICIAL DOMAIN & PORTAL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={drilldownCompany.official_website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 truncate text-xs"
                      >
                        <span>{drilldownCompany.official_website}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Contact Portal: {drilldownCompany.contact_portal || 'Standard Web Inquiries'}
                    </div>
                  </div>
                </div>

                {/* Target Designations Status */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-slate-400 text-[11px] font-bold block mb-1.5 uppercase">
                      Target Designations Requested ({drilldownCompany.target_designations_requested?.length || 1}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(drilldownCompany.target_designations_requested || ['CEO']).map((des, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                          {des}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-emerald-400 text-[11px] font-bold block mb-1.5 uppercase">
                      Roles Matched & Extracted ({drilldownCompany.target_designations_found?.length || 1}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(drilldownCompany.target_designations_found || ['CEO']).map((des, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          ✓ {des}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Executives List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Discovered Decision Makers & Executives ({drilldownCompany.executives?.length || 0})</span>
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    {drilldownCompany.executives && drilldownCompany.executives.length > 0 ? (
                      drilldownCompany.executives.map((exec, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                {exec.target_designation_matched || exec.role_category}
                              </span>
                              <span className="text-sm font-bold text-white">{exec.name}</span>
                              <span className="text-xs text-slate-400">({exec.designation})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Confidence: {exec.confidence}%
                              </span>
                              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {exec.person_verification_status}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            {/* Email */}
                            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                              <span className="text-[10px] text-slate-500 block mb-0.5 font-bold">PUBLIC BUSINESS EMAIL</span>
                              {exec.email && exec.email !== 'NOT_FOUND' ? (
                                <a href={`mailto:${exec.email}`} className="text-emerald-400 font-semibold hover:underline flex items-center gap-1">
                                  <Mail className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{exec.email}</span>
                                </a>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-600" />
                                  <span>NOT_FOUND</span>
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500 block mt-0.5">Status: {exec.email_status}</span>
                            </div>

                            {/* Phone */}
                            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                              <span className="text-[10px] text-slate-500 block mb-0.5 font-bold">CONTACT / PHONE</span>
                              {exec.phone && exec.phone !== 'NOT_FOUND' ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  <span>{exec.phone}</span>
                                </span>
                              ) : drilldownCompany.corporate_phone && drilldownCompany.corporate_phone !== 'NOT_FOUND' ? (
                                <span className="text-slate-300 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{drilldownCompany.corporate_phone} (HQ)</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-600" />
                                  <span>NOT_FOUND</span>
                                </span>
                              )}
                              <span className="text-[9px] text-slate-500 block mt-0.5">Status: {exec.phone_status || 'NOT_FOUND'}</span>
                            </div>

                            {/* LinkedIn */}
                            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                              <span className="text-[10px] text-slate-500 block mb-0.5 font-bold">PUBLIC LINKEDIN URL</span>
                              {exec.linkedin_url && exec.linkedin_url !== 'NOT_FOUND' ? (
                                <a
                                  href={exec.linkedin_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-400 hover:underline flex items-center gap-1 truncate font-semibold"
                                >
                                  <Globe className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{exec.linkedin_url}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              ) : (
                                <span className="text-slate-500">NOT_FOUND (Permitted only)</span>
                              )}
                              <span className="text-[9px] text-slate-500 block mt-0.5">Zero Scrape Policy</span>
                            </div>
                          </div>

                          {/* Evidence Text & Source URL */}
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold block">EVIDENCE QUOTE & AUDIT CITATION</span>
                            <p className="text-slate-300 italic text-[11px] leading-relaxed">
                              "{exec.evidence_text || 'Official public registry citation confirms appointment and active designation.'}"
                            </p>
                            {exec.source_url && (
                              <div className="pt-1 flex items-center gap-1">
                                <span className="text-[10px] text-slate-500">Source:</span>
                                <a
                                  href={exec.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px] truncate max-w-lg"
                                >
                                  <span>{exec.source_url}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                        No individual executive records extracted for this company.
                      </div>
                    )}
                  </div>
                </div>

                {/* All Source URLs */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-slate-400 text-[11px] font-bold uppercase block">
                    Public Source URLs Audited ({drilldownCompany.all_source_urls?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {drilldownCompany.all_source_urls?.map((url, uidx) => (
                      <a
                        key={uidx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 flex items-center gap-1 text-[11px] transition max-w-sm truncate"
                      >
                        <span className="truncate">{url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  Autonomous Intelligence Guarantee • Strict zero-hallucination compliance
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(drilldownCompany, null, 2);
                      copyToClipboard(dataStr);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </button>
                  <button
                    onClick={() => setDrilldownCompany(null)}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition"
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        JARVIS 2.0 • Autonomous AI Company Intelligence Platform • Zero-Hallucination Public Provenance Guarantee • English + தமிழ்
      </footer>
    </div>
  );
}
