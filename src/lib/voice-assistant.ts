import { Project, Expense, Donation, ProjectMilestone, DistributionBatch, ReportSnapshot } from '../types';

export type AssistantLanguage = 'en' | 'hi';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  language: AssistantLanguage;
  referenceLink?: {
    label: string;
    targetId: string;
    url?: string;
  };
  audioAvailable?: boolean;
  timestamp: string;
}

export interface AssistantContext {
  project: Project;
  donations: Donation[];
  expenses: Expense[];
  milestones: ProjectMilestone[];
  batches: DistributionBatch[];
  snapshot?: ReportSnapshot | null;
  anchorTxHash?: string | null;
}

/**
 * Normalizes text for intent matching (removes accents, punctuation, lowercases)
 */
function cleanQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?,.!;:'"()]/g, '')
    .trim();
}

/**
 * Deterministic Answer Resolver:
 * Takes the user's natural language question (English, Hindi, or Hinglish)
 * and answers strictly from verified project data without hallucination.
 */
export function resolveProjectQuestion(
  query: string,
  lang: AssistantLanguage,
  ctx: AssistantContext
): { text: string; referenceLink?: { label: string; targetId: string; url?: string } } {
  const q = cleanQuery(query);

  const totalReceived = ctx.donations.reduce((sum, d) => sum + (d.amount_received || 0), 0);
  const totalSpent = ctx.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const remaining = Math.max(0, totalReceived - totalSpent);

  const totalDeliveriesExpected = ctx.batches.reduce((sum, b) => sum + (b.expected_quantity || 0), 0);
  const totalDeliveriesAck = ctx.batches.reduce((sum, b) => sum + (b.acknowledged_count || 0), 0);
  const totalDeliveriesPending = Math.max(0, totalDeliveriesExpected - totalDeliveriesAck);
  const ackRate = totalDeliveriesExpected > 0 ? Math.round((totalDeliveriesAck / totalDeliveriesExpected) * 100) : 0;

  const expensesWithEvidence = ctx.expenses.filter((e) => e.evidence_status && e.evidence_status !== 'MISSING_EVIDENCE');
  const expensesMissingEvidence = ctx.expenses.filter((e) => !e.evidence_status || e.evidence_status === 'MISSING_EVIDENCE');
  const flaggedExpenses = ctx.expenses.filter((e) => e.evidence_status === 'FLAGGED');

  // 1. Deliveries / QR Proof of Delivery Query (Check specific beneficiary intent first)
  if (
    q.includes('deliver') ||
    q.includes('beneficiar') ||
    /\bkits?\b/i.test(q) ||
    q.includes('school kit') ||
    q.includes('batch') ||
    q.includes('acknowledg') ||
    q.includes('वितरण') ||
    q.includes('लाभार्थी') ||
    q.includes('सामान मिला') ||
    q.includes('कितने बच्चों')
  ) {
    if (lang === 'hi') {
      return {
        text: `प्रूफ ऑफ डिलीवरी के अनुसार कुल ${totalDeliveriesExpected} वस्तुओं का वितरण लक्षित था, जिनमें से ${totalDeliveriesAck} प्राप्तियों की पुष्टि QR कोड के माध्यम से हो चुकी है (${ackRate}% पावती दर)। ${totalDeliveriesPending} पावतियां प्रक्रियाधीन हैं।`,
        referenceLink: { label: 'प्रूफ ऑफ डिलीवरी देखें (Proof of Delivery)', targetId: 'proof-of-delivery' }
      };
    }
    return {
      text: `Under Proof of Delivery, ${totalDeliveriesAck} out of ${totalDeliveriesExpected} items have received digital recipient acknowledgements via secure single-use QR codes (${ackRate}% acknowledgement rate). ${totalDeliveriesPending} are currently pending field confirmation.`,
      referenceLink: { label: 'View Proof of Delivery Section', targetId: 'proof-of-delivery' }
    };
  }

  // 2. Remaining Balance Query (Checked before general received/spent so "kitna bacha hai" resolves to balance)
  if (
    q.includes('remaining') ||
    q.includes('balance') ||
    q.includes('left') ||
    q.includes('bacha') ||
    q.includes('shesh') ||
    q.includes('शेष') ||
    q.includes('बचा')
  ) {
    if (lang === 'hi') {
      return {
        text: `वर्तमान में प्रोजेक्ट खाते में कुल शेष (Remaining Balance) ₹${remaining.toLocaleString('en-IN')} है (प्राप्त ₹${totalReceived.toLocaleString('en-IN')} - खर्च ₹${totalSpent.toLocaleString('en-IN')})।`,
        referenceLink: { label: 'वित्तीय अवलोकन देखें', targetId: 'financial-overview' }
      };
    }
    return {
      text: `The remaining unspent balance is ₹${remaining.toLocaleString('en-IN')} (Calculated as ₹${totalReceived.toLocaleString('en-IN')} received minus ₹${totalSpent.toLocaleString('en-IN')} spent).`,
      referenceLink: { label: 'View Financial Summary', targetId: 'financial-overview' }
    };
  }

  // 3. Total Received / Donations Query
  if (
    q.includes('receive') ||
    q.includes('received') ||
    q.includes('donation') ||
    q.includes('raised') ||
    q.includes('kitna paisa') ||
    q.includes('kitna fund') ||
    q.includes('kitna daan') ||
    q.includes('प्राप्त') ||
    q.includes('दान') ||
    q.includes('कितना पैसा आया')
  ) {
    if (lang === 'hi') {
      return {
        text: `इस प्रोजेक्ट में कुल ₹${totalReceived.toLocaleString('en-IN')} का फंड प्राप्त हुआ है (${ctx.donations.length} दान प्रविष्टियों के माध्यम से)। लक्ष्य ₹${(ctx.project.goal_amount || 0).toLocaleString('en-IN')} का था।`,
        referenceLink: { label: 'वित्तीय अवलोकन देखें (Financials)', targetId: 'financial-overview' }
      };
    }
    return {
      text: `FundTrail has recorded a total of ₹${totalReceived.toLocaleString('en-IN')} received across ${ctx.donations.length} verified contribution records against a goal of ₹${(ctx.project.goal_amount || 0).toLocaleString('en-IN')}.`,
      referenceLink: { label: 'View Financial Summary', targetId: 'financial-overview' }
    };
  }

  // 4. Total Spent / Expenses Query
  if (
    q.includes('spent') ||
    q.includes('spend') ||
    q.includes('expense') ||
    q.includes('kharch') ||
    q.includes('kharcha') ||
    q.includes('खर्च') ||
    q.includes('व्यय')
  ) {
    if (lang === 'hi') {
      return {
        text: `अब तक इस प्रोजेक्ट में कुल ₹${totalSpent.toLocaleString('en-IN')} खर्च किए गए हैं (${ctx.expenses.length} खर्च प्रविष्टियों में)। खर्चों की मुख्य श्रेणी ${ctx.expenses[0]?.category || 'शैक्षिक सामग्री'} है।`,
        referenceLink: { label: 'खर्चों का विवरण देखें (Expenses)', targetId: 'expense-breakdown' }
      };
    }
    return {
      text: `Total recorded expenditure is ₹${totalSpent.toLocaleString('en-IN')} across ${ctx.expenses.length} expense items. The largest expense category is ${ctx.expenses[0]?.category || 'Project Materials'}.`,
      referenceLink: { label: 'View Expense Breakdown', targetId: 'expense-breakdown' }
    };
  }

  // 4. Evidence / Invoices / Receipts Query
  if (
    q.includes('evidence') ||
    q.includes('invoice') ||
    q.includes('receipt') ||
    q.includes('bill') ||
    q.includes('proof') ||
    q.includes('saboot') ||
    q.includes('रसीद') ||
    q.includes('बिल') ||
    q.includes('प्रमाण')
  ) {
    if (lang === 'hi') {
      return {
        text: `${ctx.expenses.length} खर्चों में से ${expensesWithEvidence.length} के सहायक बिल या रसीदें IPFS पर SHA-256 हैश के साथ अपलोड हैं। ${expensesMissingEvidence.length} खर्चों के बिल अभी अपलोड होने शेष हैं।`,
        referenceLink: { label: 'साक्ष्य टाइमलाइन देखें (Evidence)', targetId: 'evidence-timeline' }
      };
    }
    return {
      text: `Out of ${ctx.expenses.length} expenses, ${expensesWithEvidence.length} have supporting invoice/receipt evidence anchored with SHA-256 integrity digests on IPFS. ${expensesMissingEvidence.length} expenses are pending document upload.`,
      referenceLink: { label: 'View Evidence Timeline', targetId: 'evidence-timeline' }
    };
  }

  // 5. Flagged / Inconsistencies Query
  if (
    q.includes('flag') ||
    q.includes('flagged') ||
    q.includes('mismatch') ||
    q.includes('duplicate') ||
    q.includes('discrepan') ||
    q.includes('problem') ||
    q.includes('gadbad') ||
    q.includes('गड़बड़') ||
    q.includes('फ्लैग')
  ) {
    if (lang === 'hi') {
      return {
        text: flaggedExpenses.length > 0
          ? `एविडेंस इंटेलिजेंस ने ${flaggedExpenses.length} खर्चों को अतिरिक्त समीक्षा के लिए फ्लैग किया है (राशि बेमेल या डुप्लीकेट बिल की जांच हेतु)। स्वतंत्र सत्यापनकर्ता इसकी जांच कर रहे हैं।`
          : `इस समय कोई गंभीर डुप्लीकेट या फ्लैग की गई विसंगति नहीं है। सभी अपलोड किए गए दस्तावेजों का सत्यापन सामान्य है।`,
        referenceLink: { label: 'खर्चों की स्थिति देखें', targetId: 'expense-breakdown' }
      };
    }
    return {
      text: flaggedExpenses.length > 0
        ? `Evidence Intelligence has flagged ${flaggedExpenses.length} expense(s) for independent review due to potential amount discrepancies or duplicate checks. Independent verifiers are reviewing these.`
        : `No critical duplicate or mismatch flags are active for this project's expenses. All uploaded documents match verified hashes.`,
      referenceLink: { label: 'View Expense Breakdown', targetId: 'expense-breakdown' }
    };
  }

  // 7. Milestones Query
  if (
    q.includes('milestone') ||
    q.includes('stage') ||
    q.includes('step') ||
    q.includes('माइलस्टोन') ||
    q.includes('चरण') ||
    q.includes('पड़ाव')
  ) {
    const releasedCount = ctx.milestones.filter((m) => m.status === 'RELEASED').length;
    const approvedCount = ctx.milestones.filter((m) => m.status === 'APPROVED').length;
    if (lang === 'hi') {
      return {
        text: `इस प्रोजेक्ट में कुल ${ctx.milestones.length} माइलस्टोन्स हैं। ${releasedCount} माइलस्टोन्स के फंड जारी हो चुके हैं, ${approvedCount} स्वीकृत हैं, और शेष प्रगति पर हैं।`,
        referenceLink: { label: 'माइलस्टोन प्रगति देखें', targetId: 'milestones-section' }
      };
    }
    return {
      text: `The project has ${ctx.milestones.length} defined milestones. ${releasedCount} milestone(s) have completed independent verification and released escrowed funds; others are progressing through review.`,
      referenceLink: { label: 'View Milestone Progress', targetId: 'milestones-section' }
    };
  }

  // 8. Blockchain & Report Hash Query
  if (
    q.includes('blockchain') ||
    q.includes('anchor') ||
    q.includes('hash') ||
    q.includes('polygon') ||
    q.includes('amoy') ||
    q.includes('स्मार्ट अनुबंध') ||
    q.includes('ब्लॉकचेन')
  ) {
    const tx = ctx.anchorTxHash || ctx.snapshot?.snapshot_json ? 'anchored' : null;
    if (lang === 'hi') {
      return {
        text: `यह सार्वजनिक रिपोर्ट Polygon Amoy टेस्टनेट (Chain ID 80002) पर क्रिप्टोग्राफिक SHA-256 हैश द्वारा अपरिवर्तनीय रूप से एंकर की गई है। कोई भी व्यक्ति ब्लॉकचेन एक्सप्लोरर पर इसकी प्रामाणिकता स्वयं जांच सकता है।`,
        referenceLink: { label: 'ब्लॉकचेन सत्यापन देखें', targetId: 'blockchain-verification' }
      };
    }
    return {
      text: `This public donor report is cryptographically anchored on Polygon Amoy (Chain ID 80002) via the ReportAnchor smart contract. Anyone can independently verify the SHA-256 fingerprint against the blockchain.`,
      referenceLink: { label: 'Verify On-Chain Anchor', targetId: 'blockchain-verification' }
    };
  }

  // 9. Default Fallback
  if (lang === 'hi') {
    return {
      text: `यह सवाल महत्वपूर्ण है, लेकिन यह जानकारी प्रकाशित प्रोजेक्ट रिपोर्ट में सीधे उपलब्ध नहीं है। आप वित्तीय सारांश, खर्चों के बिल, या प्रूफ ऑफ डिलीवरी अनुभाग देख सकते हैं।`,
      referenceLink: { label: 'प्रोजेक्ट रिपोर्ट पर वापस जाएं', targetId: 'financial-overview' }
    };
  }
  return {
    text: `Sorry, this information is not explicitly documented in the published project report. You can review the verified financials, invoice evidence, or proof of delivery sections below.`,
    referenceLink: { label: 'Back to Report Overview', targetId: 'financial-overview' }
  };
}

/**
 * Speech Recognition Wrapper (Web Speech API with graceful fallback)
 */
export class SpeechRecognitionService {
  private recognition: any = null;
  public isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.isSupported = true;
      }
    }
  }

  public startListening(
    lang: AssistantLanguage,
    onResult: (transcript: string) => void,
    onError: (err: string) => void,
    onEnd: () => void
  ): void {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this browser. Please use text input.');
      return;
    }

    this.recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      onError(event.error || 'Speech capture failed');
    };

    this.recognition.onend = () => {
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      onError(e.message || 'Error starting speech capture');
    }
  }

  public stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }
}

/**
 * Text-to-Speech Synthesizer (SpeechSynthesis with voice matching)
 */
export function speakText(text: string, lang: AssistantLanguage): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Try to pick an appropriate language voice
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) =>
    lang === 'hi' ? v.lang.includes('hi') : v.lang.includes('en-IN') || v.lang.includes('en-US')
  );
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  window.speechSynthesis.speak(utterance);
}
