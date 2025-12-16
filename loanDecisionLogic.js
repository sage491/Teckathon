/**
 * ============================================================
 * AGENTIC AI PERSONAL LOAN DECISIONING SYSTEM
 * Master Agent + Worker Agents Architecture
 * ============================================================
 * NBFC/BFSI Hackathon Prototype - Tata Capital Style
 * Confidence-Based, Explainable Loan Decisioning Engine
 * ============================================================
 */

// ============================================================
// MOCK CUSTOMER DATABASE
// ============================================================
const MOCK_CUSTOMERS = {
  "ABCDE1234F": {
    name: "Rahul Sharma",
    pan: "ABCDE1234F",
    dob: "1990-05-15",
    verified: true,
    creditScore: 780,
    existingLoans: 1,
    monthlyIncome: 85000,
    employer: "TCS Limited",
    employmentYears: 5
  },
  "XYZAB5678G": {
    name: "Priya Patel",
    pan: "XYZAB5678G",
    dob: "1988-11-22",
    verified: true,
    creditScore: 650,
    existingLoans: 3,
    monthlyIncome: 45000,
    employer: "Freelance",
    employmentYears: 2
  },
  "LMNOP9012H": {
    name: "Amit Kumar",
    pan: "LMNOP9012H",
    dob: "1995-03-10",
    verified: true,
    creditScore: 820,
    existingLoans: 0,
    monthlyIncome: 120000,
    employer: "Infosys",
    employmentYears: 8
  }
};

// ============================================================
// CONFIDENCE WEIGHTS & THRESHOLDS
// ============================================================
const CONFIDENCE_WEIGHTS = {
  intent: 0.30,    // 30% weight - loan purpose clarity
  identity: 0.25,  // 25% weight - KYC verification
  credit: 0.25,    // 25% weight - credit bureau score
  income: 0.20     // 20% weight - income verification
};

// Realistic caps - no dimension reaches 100%
const CONFIDENCE_CAPS = {
  intent: 97,      // Can't be 100% certain of borrower intent
  identity: 99,    // 1% residual risk (document fraud)
  income: 92,      // Income can fluctuate
  credit: 96       // Credit models have inherent uncertainty
};

const THRESHOLDS = {
  rejected: 40,                // < 40% after all checks = Rejected
  verification_required: 50,   // < 50% = Verification required
  processing: 50,              // 50-69% = Processing
  review: 70,                  // 70-88% = Under Review
  approved: 89                 // >= 89% = Auto-approval eligible
};

// Stagnation tracking for fallback awareness
const STAGNATION_CONFIG = {
  maxAttempts: 3,
  currentAttempts: 0,
  lastConfidence: 0
};

// ============================================================
// GLOBAL STATE - MASTER AGENT CONTEXT
// ============================================================
const state = {
  // Decision outcome
  decisionState: "PENDING",

  // Confidence vector (0-100)
  confidence: {
    intent: 0,
    identity: 0,
    income: 0,
    credit: 0,
    overall: 0
  },

  // Customer data (collected during session)
  customerData: {
    loanAmount: null,
    tenure: null,
    purpose: null,
    employmentType: null,
    monthlyIncome: null,
    panNumber: null,
    name: null
  },

  // Fetched/verified data
  verifiedData: {
    panVerified: false,
    customerProfile: null,
    creditScore: null,
    creditScoreCategory: null,
    incomeVerified: false,
    salarySlipData: null,
    eligibilityRatio: null
  },

  // Agent orchestration
  activeAgent: null,
  agentQueue: [],
  completedAgents: [],

  // Risk assessment
  riskStatus: "UNKNOWN",
  riskRationale: "",
  riskFactors: [],

  // Document tracking
  documents: {
    pan: { uploaded: false, filename: null, timestamp: null },
    salarySlip: { uploaded: false, filename: null, timestamp: null, required: false }
  },

  // Activity log
  activityLog: [],

  // Session metadata
  sessionId: generateSessionId(),
  sessionStart: new Date().toISOString(),
  lastUpdated: null
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function generateSessionId() {
  return 'LOAN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function logActivity(agent, action, details, impact = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    displayTime: new Date().toLocaleTimeString(),
    agent: agent,
    action: action,
    details: details,
    impact: impact
  };
  state.activityLog.push(entry);
  state.lastUpdated = entry.timestamp;
  console.log(`[${entry.displayTime}] [${agent}] ${action}: ${details}`);
  return entry;
}

function calculateOverallConfidence() {
  // Apply caps before calculation
  const cappedIntent = Math.min(state.confidence.intent, CONFIDENCE_CAPS.intent);
  const cappedIdentity = Math.min(state.confidence.identity, CONFIDENCE_CAPS.identity);
  const cappedIncome = Math.min(state.confidence.income, CONFIDENCE_CAPS.income);
  const cappedCredit = Math.min(state.confidence.credit, CONFIDENCE_CAPS.credit);

  // Weighted average formula: C = 0.30*Intent + 0.25*Identity + 0.25*Credit + 0.20*Income
  const weighted = 
    cappedIntent * CONFIDENCE_WEIGHTS.intent +
    cappedIdentity * CONFIDENCE_WEIGHTS.identity +
    cappedCredit * CONFIDENCE_WEIGHTS.credit +
    cappedIncome * CONFIDENCE_WEIGHTS.income;
  
  state.confidence.overall = Math.round(weighted);
  
  // Track stagnation
  if (state.confidence.overall === STAGNATION_CONFIG.lastConfidence) {
    STAGNATION_CONFIG.currentAttempts++;
    if (STAGNATION_CONFIG.currentAttempts >= STAGNATION_CONFIG.maxAttempts) {
      logActivity("Master Agent", "FALLBACK_AWARE", 
        `Confidence stagnant at ${state.confidence.overall}% for ${STAGNATION_CONFIG.currentAttempts} attempts`,
        "Manual review fallback available if needed"
      );
    }
  } else {
    STAGNATION_CONFIG.currentAttempts = 0;
    STAGNATION_CONFIG.lastConfidence = state.confidence.overall;
  }
  
  return state.confidence.overall;
}

// ============================================================
// MASTER AGENT - DECISION GOVERNOR
// ============================================================
const MasterAgent = {
  name: "Master Agent",

  // Evaluate which agent should be triggered next
  evaluateNextAction() {
    logActivity(this.name, "EVALUATE", "Analyzing confidence vector for next action");
    
    const conf = state.confidence;
    const overall = conf.overall;

    // Find weakest dimension
    const dimensions = [
      { name: 'intent', value: conf.intent, agent: 'Sales Agent' },
      { name: 'identity', value: conf.identity, agent: 'Verification Agent' },
      { name: 'income', value: conf.income, agent: 'Underwriting Agent' },
      { name: 'credit', value: conf.credit, agent: 'Underwriting Agent' }
    ];

    const weakest = dimensions.reduce((min, dim) => 
      dim.value < min.value ? dim : min
    );

    logActivity(this.name, "AGENT_TRIGGER", `Weakest dimension: ${weakest.name.toUpperCase()} (${weakest.value}%)`, 
      `Activating ${weakest.agent} to address weakest signal`);

    // Decision logic based on thresholds
    if (overall >= THRESHOLDS.approved) {
      this.transitionToApproved();
      return { action: 'APPROVE', agent: 'Sanction Generator', reason: `Confidence threshold met (${overall}% >= 89%)` };
    }

    // Trigger weakest dimension agent only if not already completed
    if (!state.completedAgents.includes(weakest.agent)) {
      return { 
        action: 'ACTIVATE', 
        agent: weakest.agent, 
        reason: `${weakest.name} confidence at ${weakest.value}% - requires improvement` 
      };
    }

    // All agents completed but threshold not met - wait for user input
    if (overall < THRESHOLDS.approved) {
      logActivity(this.name, "STALLED", 
        `All agents completed. Overall confidence: ${overall}%. Awaiting additional signals or manual review.`,
        "May require additional documentation or manual underwriter intervention");
    }

    return { action: 'WAIT', agent: null, reason: 'Awaiting user input or additional documents' };
  },

  // Update decision state based on confidence
  updateDecisionState() {
    const overall = state.confidence.overall;
    let previousState = state.decisionState;

    // Check for rejection conditions
    if (this.shouldReject()) {
      state.decisionState = "REJECTED";
      return state.decisionState;
    }

    // Decision state based on explicit thresholds
    if (overall >= THRESHOLDS.approved) {
      state.decisionState = "APPROVED";
    } else if (overall >= THRESHOLDS.review) {
      state.decisionState = "REVIEW";
    } else if (overall >= THRESHOLDS.processing) {
      state.decisionState = "PROCESSING";
    } else {
      state.decisionState = "PENDING";
    }

    // Refined risk assessment with rationale
    this.assessRisk();

    if (previousState !== state.decisionState) {
      logActivity(this.name, "STATE_CHANGE", 
        `Decision state: ${previousState} → ${state.decisionState}`,
        `Risk: ${state.riskStatus}`
      );
    }

    return state.decisionState;
  },

  // Comprehensive risk assessment with rationale
  assessRisk() {
    const creditScore = state.verifiedData.creditScore || 0;
    const identityVerified = state.confidence.identity >= 90;
    const incomeVerified = state.verifiedData.incomeVerified;
    const hasRiskFactors = state.riskFactors.length > 0;

    // HIGH: Missing identity OR credit < 700
    if (!identityVerified || (creditScore > 0 && creditScore < 700)) {
      state.riskStatus = "HIGH";
      if (!identityVerified) {
        state.riskRationale = "Identity verification incomplete - KYC pending";
      } else {
        state.riskRationale = `Credit score ${creditScore} below threshold (700) - elevated default risk`;
      }
      return;
    }

    // MEDIUM: Partial income proof OR credit 700-740
    if (!incomeVerified || (creditScore >= 700 && creditScore <= 740)) {
      state.riskStatus = "MEDIUM";
      if (!incomeVerified) {
        state.riskRationale = "Income partially verified - salary slip recommended for confirmation";
      } else {
        state.riskRationale = `Credit score ${creditScore} in marginal range (700-740) - standard monitoring applies`;
      }
      return;
    }

    // LOW: Credit > 740 + verified income
    if (creditScore > 740 && incomeVerified) {
      state.riskStatus = "LOW";
      state.riskRationale = `Strong profile: Credit score ${creditScore} with verified income of ₹${state.verifiedData.salarySlipData?.netSalary?.toLocaleString() || 'N/A'}`;
      return;
    }

    // Default case: credit > 740 but income not fully verified
    if (creditScore > 740) {
      state.riskStatus = "LOW";
      state.riskRationale = `Credit score ${creditScore} indicates strong creditworthiness - income verification would further strengthen`;
      return;
    }

    // Fallback
    state.riskStatus = "MEDIUM";
    state.riskRationale = "Assessment in progress - awaiting additional verification signals";
  },

  // Transition to approved state
  transitionToApproved() {
    state.decisionState = "APPROVED";
    state.riskStatus = "LOW";
    state.activeAgent = null;
    logActivity(this.name, "APPROVED", 
      `Loan application approved with ${state.confidence.overall}% confidence`,
      "Sanction letter can be generated"
    );
  },

  // Check if application should be rejected
  shouldReject() {
    const creditScore = state.verifiedData.creditScore;
    const identityVerified = state.confidence.identity >= 50;
    const allAgentsCompleted = state.completedAgents.length >= 2; // At least verification and underwriting
    const overall = state.confidence.overall;

    // Reject if credit score is very poor (below 550)
    if (creditScore && creditScore < 550) {
      return true;
    }

    // Reject if all agents completed and overall confidence is below rejection threshold
    if (allAgentsCompleted && overall > 0 && overall < THRESHOLDS.rejected) {
      return true;
    }

    // Reject if identity verification failed after attempt
    if (state.documents.pan.uploaded && !identityVerified) {
      return true;
    }

    return false;
  },

  // Get rejection reason for user message
  getRejectionReason() {
    const creditScore = state.verifiedData.creditScore;
    const identityVerified = state.confidence.identity >= 50;
    const overall = state.confidence.overall;
    const reasons = [];

    if (creditScore && creditScore < 550) {
      reasons.push(`your credit score (${creditScore}) is below our minimum requirement of 550`);
    }

    if (creditScore && creditScore >= 550 && creditScore < 650) {
      reasons.push(`your credit score (${creditScore}) indicates high risk`);
    }

    if (state.documents.pan.uploaded && !identityVerified) {
      reasons.push("identity verification could not be completed successfully");
    }

    if (state.verifiedData.eligibilityRatio && state.verifiedData.eligibilityRatio > 60) {
      reasons.push(`your debt-to-income ratio (${state.verifiedData.eligibilityRatio.toFixed(1)}%) exceeds our maximum threshold of 60%`);
    }

    if (overall > 0 && overall < THRESHOLDS.rejected) {
      reasons.push(`overall assessment confidence (${overall}%) is below our approval threshold`);
    }

    if (reasons.length === 0) {
      reasons.push("your application did not meet our lending criteria at this time");
    }

    return reasons.join(", and ");
  },

  // Main orchestration loop
  orchestrate() {
    calculateOverallConfidence();
    this.updateDecisionState();
    const nextAction = this.evaluateNextAction();
    
    if (nextAction.agent && nextAction.agent !== state.activeAgent) {
      state.activeAgent = nextAction.agent;
      logActivity(this.name, "ORCHESTRATE", 
        `Activating ${nextAction.agent}`,
        nextAction.reason
      );
    }

    return nextAction;
  }
};

// ============================================================
// SALES / INTENT AGENT
// ============================================================
const SalesAgent = {
  name: "Sales Agent",

  // Process loan application intent
  processIntent(loanAmount, tenure, purpose, employmentType, incomeRange) {
    logActivity(this.name, "TRIGGERED", "Processing customer intent and loan requirements");
    state.activeAgent = this.name;

    let intentScore = 0;
    let factors = [];

    // Loan amount analysis - gradual increments
    if (loanAmount) {
      state.customerData.loanAmount = parseFloat(loanAmount);
      if (loanAmount >= 50000 && loanAmount <= 2500000) {
        intentScore += 18;  // Reduced from 25 for gradual increase
        factors.push("Loan amount within eligible range");
      } else if (loanAmount > 2500000) {
        intentScore += 12;
        factors.push("High loan amount - additional verification needed");
      } else {
        intentScore += 15;
        factors.push("Small loan amount");
      }
      logActivity(this.name, "CAPTURED", `Loan Amount: ₹${loanAmount.toLocaleString()}`);
    }

    // Tenure analysis - gradual increments
    if (tenure) {
      state.customerData.tenure = parseInt(tenure);
      if (tenure >= 12 && tenure <= 60) {
        intentScore += 18;  // Reduced from 25
        factors.push("Tenure within standard range");
      } else {
        intentScore += 10;
        factors.push("Non-standard tenure requested");
      }
      logActivity(this.name, "CAPTURED", `Tenure: ${tenure} months`);
    }

    // Purpose analysis - gradual increments
    if (purpose) {
      state.customerData.purpose = purpose;
      const lowRiskPurposes = ['home_improvement', 'education', 'medical'];
      const medRiskPurposes = ['wedding', 'travel', 'debt_consolidation'];
      
      if (lowRiskPurposes.includes(purpose)) {
        intentScore += 22;  // Reduced from 25
        factors.push("Low-risk loan purpose");
      } else if (medRiskPurposes.includes(purpose)) {
        intentScore += 17;
        factors.push("Standard loan purpose");
      } else {
        intentScore += 12;
        factors.push("Purpose noted");
      }
      logActivity(this.name, "CAPTURED", `Purpose: ${purpose.replace('_', ' ')}`);
    }

    // Employment type analysis - gradual increments
    if (employmentType) {
      state.customerData.employmentType = employmentType;
      if (employmentType === 'salaried') {
        intentScore += 22;  // Reduced from 25
        factors.push("Salaried employment - stable income expected");
      } else if (employmentType === 'self-employed') {
        intentScore += 16;
        factors.push("Self-employed - income verification important");
      } else if (employmentType === 'business') {
        intentScore += 14;
        factors.push("Business owner - additional documentation may be required");
      }
      logActivity(this.name, "CAPTURED", `Employment: ${employmentType}`);
    }

    // Income range preliminary assessment - gradual increments
    if (incomeRange) {
      state.customerData.monthlyIncome = this.parseIncomeRange(incomeRange);
      intentScore += 12;  // Reduced from 15
      factors.push("Income range provided");
      logActivity(this.name, "CAPTURED", `Income Range: ${incomeRange}`);
    }

    // Update confidence with cap enforcement
    const newIntentConfidence = Math.min(CONFIDENCE_CAPS.intent, state.confidence.intent + intentScore);
    const delta = newIntentConfidence - state.confidence.intent;
    state.confidence.intent = newIntentConfidence;

    logActivity(this.name, "CONFIDENCE_UPDATE", 
      `Intent Confidence: +${delta}% → ${state.confidence.intent}%`,
      factors.join("; ")
    );

    // Add to completed agents if sufficient data
    if (state.confidence.intent >= 75 && !state.completedAgents.includes(this.name)) {
      state.completedAgents.push(this.name);
      logActivity(this.name, "COMPLETE", "Intent capture complete - sufficient data collected");
    }

    // Trigger master agent orchestration
    MasterAgent.orchestrate();

    return {
      success: true,
      intentScore: state.confidence.intent,
      factors: factors
    };
  },

  parseIncomeRange(range) {
    const ranges = {
      '0-25000': 12500,
      '25000-50000': 37500,
      '50000-100000': 75000,
      '100000+': 150000
    };
    return ranges[range] || 50000;
  }
};

// ============================================================
// VERIFICATION AGENT
// ============================================================
const VerificationAgent = {
  name: "Verification Agent",

  // Verify PAN and fetch customer profile
  verifyPAN(panNumber) {
    logActivity(this.name, "TRIGGERED", "Initiating PAN/KYC verification");
    state.activeAgent = this.name;

    // Simulate API delay
    logActivity(this.name, "API_CALL", "Connecting to NSDL/UIDAI verification service...");

    // Mock verification
    const normalizedPAN = panNumber ? panNumber.toUpperCase().trim() : this.generateRandomPAN();
    state.customerData.panNumber = normalizedPAN;

    // Check against mock database or generate random
    let customerProfile = MOCK_CUSTOMERS[normalizedPAN];
    
    if (!customerProfile) {
      // Generate random customer data
      customerProfile = this.generateMockCustomer(normalizedPAN);
    }

    state.verifiedData.panVerified = true;
    state.verifiedData.customerProfile = customerProfile;
    state.customerData.name = customerProfile.name;
    state.documents.pan.uploaded = true;
    state.documents.pan.timestamp = new Date().toISOString();

    logActivity(this.name, "VERIFIED", 
      `PAN: ${normalizedPAN} - ${customerProfile.name}`,
      "KYC verification successful"
    );

    // Update identity confidence - capped at 99% (residual document fraud risk)
    const identityBoost = 85 + Math.floor(Math.random() * 10);  // 85-94% initial
    state.confidence.identity = Math.min(CONFIDENCE_CAPS.identity, identityBoost);
    logActivity(this.name, "CONFIDENCE_UPDATE", 
      `Identity Confidence: → ${state.confidence.identity}%`,
      "KYC verification complete (1% residual fraud risk retained)"
    );

    // Also update credit confidence with preliminary score
    if (customerProfile.creditScore) {
      state.verifiedData.creditScore = customerProfile.creditScore;
      this.processCreditScore(customerProfile.creditScore);
    }

    if (!state.completedAgents.includes(this.name)) {
      state.completedAgents.push(this.name);
      logActivity(this.name, "COMPLETE", "Identity verification complete");
    }

    // Trigger master agent orchestration
    MasterAgent.orchestrate();

    return {
      success: true,
      verified: true,
      customer: customerProfile
    };
  },

  processCreditScore(score) {
    let category, confidence;
    
    // Credit confidence with realistic variance and cap at 96%
    if (score >= 800) {
      category = "EXCELLENT";
      confidence = 91 + Math.floor(Math.random() * 5);  // 91-95%, capped at 96
      state.riskFactors = state.riskFactors.filter(f => !f.includes('credit'));
    } else if (score >= 750) {
      category = "VERY_GOOD";
      confidence = 82 + Math.floor(Math.random() * 8);  // 82-89%
      state.riskFactors = state.riskFactors.filter(f => !f.includes('credit'));
    } else if (score >= 700) {
      category = "GOOD";
      confidence = 70 + Math.floor(Math.random() * 8);  // 70-77%
    } else if (score >= 650) {
      category = "FAIR";
      confidence = 52 + Math.floor(Math.random() * 8);  // 52-59%
      if (!state.riskFactors.includes("Fair credit score - monitor closely")) {
        state.riskFactors.push("Fair credit score - monitor closely");
      }
    } else {
      category = "POOR";
      confidence = 28 + Math.floor(Math.random() * 10);  // 28-37%
      if (!state.riskFactors.includes("Low credit score - elevated default risk")) {
        state.riskFactors.push("Low credit score - elevated default risk");
      }
    }

    // Apply cap
    confidence = Math.min(confidence, CONFIDENCE_CAPS.credit);
    
    state.verifiedData.creditScoreCategory = category;
    state.confidence.credit = confidence;

    logActivity(this.name, "CREDIT_SCORE", 
      `Credit Score: ${score} (${category})`,
      `Credit Confidence: ${confidence}% (model uncertainty: ${100 - confidence}%)`
    );
  },

  generateRandomPAN() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let pan = '';
    for (let i = 0; i < 5; i++) pan += chars[Math.floor(Math.random() * chars.length)];
    for (let i = 0; i < 4; i++) pan += nums[Math.floor(Math.random() * nums.length)];
    pan += chars[Math.floor(Math.random() * chars.length)];
    return pan;
  },

  generateMockCustomer(pan) {
    const names = ["Arun Verma", "Sneha Reddy", "Vikram Singh", "Ananya Iyer", "Rajesh Gupta"];
    const employers = ["Wipro", "HCL Technologies", "Tech Mahindra", "Accenture", "Cognizant"];
    
    return {
      name: names[Math.floor(Math.random() * names.length)],
      pan: pan,
      dob: "1992-07-20",
      verified: true,
      creditScore: Math.floor(Math.random() * 200) + 650, // 650-850
      existingLoans: Math.floor(Math.random() * 3),
      monthlyIncome: Math.floor(Math.random() * 100000) + 40000, // 40k-140k
      employer: employers[Math.floor(Math.random() * employers.length)],
      employmentYears: Math.floor(Math.random() * 10) + 1
    };
  },

  // DigiLocker OAuth verification simulation
  verifyViaDigiLocker() {
    logActivity(this.name, "TRIGGERED", "Initiating DigiLocker OAuth verification");
    state.activeAgent = this.name;

    // Simulate OAuth flow steps
    logActivity(this.name, "OAUTH_INIT", "Connecting to DigiLocker OAuth service...");
    
    // Generate verified customer profile
    const normalizedPAN = this.generateRandomPAN();
    const customerProfile = MOCK_CUSTOMERS[normalizedPAN] || this.generateMockCustomer(normalizedPAN);
    
    // Add address from DigiLocker
    customerProfile.address = this.generateAddress();
    customerProfile.kycMethod = "DigiLocker";
    customerProfile.digilockerVerified = true;

    state.customerData.panNumber = normalizedPAN;
    state.verifiedData.panVerified = true;
    state.verifiedData.customerProfile = customerProfile;
    state.customerData.name = customerProfile.name;
    state.documents.pan.uploaded = true;
    state.documents.pan.method = "DigiLocker OAuth";
    state.documents.pan.timestamp = new Date().toISOString();

    logActivity(this.name, "OAUTH_SUCCESS", 
      "DigiLocker authentication successful",
      "User authorized data sharing via secure OAuth 2.0 flow"
    );

    logActivity(this.name, "DIGILOCKER_VERIFIED", 
      `PAN: ${normalizedPAN} | Name: ${customerProfile.name} | DOB: ${customerProfile.dob}`,
      `Address verified: ${customerProfile.address.city}, ${customerProfile.address.state}`
    );

    // Higher identity confidence for DigiLocker (government-verified)
    // Range: 94-98% (better than manual upload due to OAuth + govt verification)
    const identityBoost = 94 + Math.floor(Math.random() * 5);  // 94-98%
    state.confidence.identity = Math.min(CONFIDENCE_CAPS.identity, identityBoost);
    
    logActivity(this.name, "CONFIDENCE_UPDATE", 
      `Identity Confidence: → ${state.confidence.identity}%`,
      "DigiLocker OAuth verification provides higher confidence than manual upload"
    );

    // Process credit score
    if (customerProfile.creditScore) {
      state.verifiedData.creditScore = customerProfile.creditScore;
      this.processCreditScore(customerProfile.creditScore);
    }

    // Mark as completed
    if (!state.completedAgents.includes(this.name)) {
      state.completedAgents.push(this.name);
      logActivity(this.name, "COMPLETE", "DigiLocker KYC verification complete");
    }

    // Trigger master agent orchestration
    MasterAgent.orchestrate();

    return {
      success: true,
      verified: true,
      method: "DigiLocker",
      customer: customerProfile
    };
  },

  generateAddress() {
    const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata"];
    const states = ["Maharashtra", "Delhi", "Karnataka", "Telangana", "Tamil Nadu", "Maharashtra", "West Bengal"];
    const index = Math.floor(Math.random() * cities.length);
    
    return {
      line1: `${Math.floor(Math.random() * 500) + 1}, ${["MG Road", "Park Street", "Residency Road", "Main Road"][Math.floor(Math.random() * 4)]}`,
      city: cities[index],
      state: states[index],
      pincode: `${Math.floor(Math.random() * 900000) + 100000}`
    };
  }
};

// ============================================================
// UNDERWRITING AGENT
// ============================================================
const UnderwritingAgent = {
  name: "Underwriting Agent",

  // Evaluate creditworthiness
  evaluateCredit() {
    logActivity(this.name, "TRIGGERED", "Initiating credit and income evaluation");
    state.activeAgent = this.name;

    if (!state.verifiedData.creditScore && state.verifiedData.customerProfile) {
      state.verifiedData.creditScore = state.verifiedData.customerProfile.creditScore;
      VerificationAgent.processCreditScore(state.verifiedData.creditScore);
    }

    // Calculate debt-to-income ratio if we have loan amount and income
    if (state.customerData.loanAmount && state.customerData.monthlyIncome) {
      const emi = this.calculateEMI(
        state.customerData.loanAmount,
        state.customerData.tenure || 36,
        12.5
      );
      const dti = (emi / state.customerData.monthlyIncome) * 100;
      state.verifiedData.eligibilityRatio = dti;

      logActivity(this.name, "DTI_ANALYSIS", 
        `EMI: ₹${Math.round(emi).toLocaleString()} | DTI Ratio: ${dti.toFixed(1)}%`,
        dti < 40 ? "Healthy DTI ratio" : "High DTI - may need review"
      );

      // Income confidence based on DTI - gradual and capped at 92%
      if (dti < 30) {
        const incomeBoost = 58 + Math.floor(Math.random() * 8);  // 58-65%
        state.confidence.income = Math.min(CONFIDENCE_CAPS.income, Math.max(state.confidence.income, incomeBoost));
      } else if (dti < 40) {
        const incomeBoost = 48 + Math.floor(Math.random() * 8);  // 48-55%
        state.confidence.income = Math.min(CONFIDENCE_CAPS.income, Math.max(state.confidence.income, incomeBoost));
      } else if (dti < 50) {
        const incomeBoost = 38 + Math.floor(Math.random() * 8);  // 38-45%
        state.confidence.income = Math.min(CONFIDENCE_CAPS.income, Math.max(state.confidence.income, incomeBoost));
      } else {
        state.confidence.income = Math.max(state.confidence.income, 25);
        if (!state.riskFactors.includes("High debt-to-income ratio")) {
          state.riskFactors.push("High debt-to-income ratio");
        }
      }
    }

    logActivity(this.name, "CONFIDENCE_UPDATE", 
      `Income Confidence: ${state.confidence.income}%`,
      "Based on preliminary assessment"
    );

    MasterAgent.orchestrate();

    return {
      success: true,
      creditScore: state.verifiedData.creditScore,
      eligibilityRatio: state.verifiedData.eligibilityRatio
    };
  },

  // Process salary slip with OCR simulation
  verifySalarySlip(filename) {
    logActivity(this.name, "TRIGGERED", "Processing salary slip document with OCR");
    state.activeAgent = this.name;

    state.documents.salarySlip.uploaded = true;
    state.documents.salarySlip.filename = filename;
    state.documents.salarySlip.timestamp = new Date().toISOString();

    logActivity(this.name, "OCR_PROCESSING", "Extracting data from salary slip document...");

    // Derive salary from user-declared income with deterministic session-based variance
    const extractedSalaryData = this.simulateOCRExtraction();

    state.verifiedData.salarySlipData = extractedSalaryData;
    state.verifiedData.incomeVerified = true;

    logActivity(this.name, "OCR_COMPLETE", 
      `Extracted Net Salary: ₹${Math.round(extractedSalaryData.netSalary).toLocaleString()}`,
      `Source: ${extractedSalaryData.employer} | Confidence: ${extractedSalaryData.ocrConfidence}%`
    );

    // Compare declared vs extracted income
    const declaredIncome = state.customerData.monthlyIncome || 50000;
    const variance = Math.abs(extractedSalaryData.netSalary - declaredIncome) / declaredIncome * 100;
    
    if (variance < 10) {
      logActivity(this.name, "INCOME_MATCH", 
        `Declared (₹${declaredIncome.toLocaleString()}) vs Extracted (₹${Math.round(extractedSalaryData.netSalary).toLocaleString()}) - variance ${variance.toFixed(1)}%`,
        "Income declaration verified - high alignment"
      );
    } else if (variance < 25) {
      logActivity(this.name, "INCOME_VARIANCE", 
        `Declared (₹${declaredIncome.toLocaleString()}) vs Extracted (₹${Math.round(extractedSalaryData.netSalary).toLocaleString()}) - variance ${variance.toFixed(1)}%`,
        "Moderate variance detected - within acceptable range"
      );
    } else {
      logActivity(this.name, "INCOME_MISMATCH", 
        `Declared (₹${declaredIncome.toLocaleString()}) vs Extracted (₹${Math.round(extractedSalaryData.netSalary).toLocaleString()}) - variance ${variance.toFixed(1)}%`,
        "Significant variance - may require clarification"
      );
    }

    // Income confidence based on variance and OCR quality
    let incomeConfidence;
    if (variance < 10 && extractedSalaryData.ocrConfidence >= 95) {
      incomeConfidence = 88 + Math.floor(Math.random() * 4);  // 88-91%
    } else if (variance < 25 && extractedSalaryData.ocrConfidence >= 90) {
      incomeConfidence = 82 + Math.floor(Math.random() * 6);  // 82-87%
    } else {
      incomeConfidence = 75 + Math.floor(Math.random() * 7);  // 75-81%
    }

    state.confidence.income = Math.min(CONFIDENCE_CAPS.income, incomeConfidence);
    logActivity(this.name, "CONFIDENCE_UPDATE", 
      `Income Confidence: → ${state.confidence.income}%`,
      `Based on OCR quality (${extractedSalaryData.ocrConfidence}%) and variance (${variance.toFixed(1)}%)`
    );

    if (!state.completedAgents.includes(this.name)) {
      state.completedAgents.push(this.name);
      logActivity(this.name, "COMPLETE", "Underwriting assessment complete");
    }

    MasterAgent.orchestrate();

    return {
      success: true,
      salaryData: extractedSalaryData,
      variance: variance.toFixed(1)
    };
  },

  // Simulate OCR extraction from salary slip based on declared income
  simulateOCRExtraction() {
    // Derive base salary from user-declared income or profile
    let baseSalary = state.customerData.monthlyIncome || 
                     state.verifiedData.customerProfile?.monthlyIncome || 
                     50000;

    // Create deterministic session-based seed for consistent variance
    const sessionSeed = parseInt(state.sessionId.split('-')[1], 36) % 100;
    
    // Apply session-based variance (-15% to +10% of declared income)
    const varianceFactor = 0.85 + (sessionSeed / 100) * 0.25;  // 0.85 to 1.10
    const extractedGross = Math.round(baseSalary * varianceFactor);
    
    // Realistic deductions (10-20% based on salary bracket)
    const deductionRate = extractedGross > 100000 ? 0.18 : 
                         extractedGross > 50000 ? 0.15 : 0.12;
    const extractedNet = Math.round(extractedGross * (1 - deductionRate));

    // OCR confidence based on document quality (deterministic per session)
    const ocrConfidence = 91 + (sessionSeed % 8);  // 91-98%

    // Select employer from profile or generate realistic name
    const employer = state.verifiedData.customerProfile?.employer || 
                    this.generateEmployerName(extractedGross);

    return {
      grossSalary: extractedGross,
      netSalary: extractedNet,
      employer: employer,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      ocrConfidence: ocrConfidence,
      deductions: {
        pf: Math.round(extractedGross * 0.12 * 0.4),
        tax: Math.round(extractedGross * deductionRate * 0.6),
        other: Math.round(extractedGross * deductionRate * 0.0)
      },
      extractionMethod: "OCR + NLP Pattern Matching"
    };
  },

  generateEmployerName(salary) {
    const smallCompanies = ["Nexus Solutions Pvt Ltd", "Vertex Technologies", "Quantum Infotech"];
    const mediumCompanies = ["Mindtree Ltd", "Tech Mahindra", "L&T Infotech"];
    const largeCompanies = ["Tata Consultancy Services", "Infosys Limited", "Wipro Limited"];
    
    if (salary > 100000) {
      return largeCompanies[Math.floor(Math.random() * largeCompanies.length)];
    } else if (salary > 50000) {
      return mediumCompanies[Math.floor(Math.random() * mediumCompanies.length)];
    } else {
      return smallCompanies[Math.floor(Math.random() * smallCompanies.length)];
    }
  },

  calculateEMI(principal, tenureMonths, annualRate) {
    const monthlyRate = annualRate / 12 / 100;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return emi;
  }
};

// ============================================================
// SANCTION GENERATOR AGENT
// ============================================================
const SanctionGenerator = {
  name: "Sanction Generator",

  canGenerate() {
    return state.confidence.overall >= THRESHOLDS.approved && state.decisionState === "APPROVED";
  },

  generate() {
    if (!this.canGenerate()) {
      logActivity(this.name, "BLOCKED", 
        `Cannot generate - confidence at ${state.confidence.overall}%`,
        `Required: ${THRESHOLDS.approved}%`
      );
      return null;
    }

    logActivity(this.name, "TRIGGERED", "Generating sanction letter");
    state.activeAgent = this.name;

    const sanctionDate = new Date();
    const validTill = new Date(sanctionDate);
    validTill.setDate(validTill.getDate() + 30);

    const interestRate = this.calculateInterestRate();
    const processingFee = Math.round(state.customerData.loanAmount * 0.02);
    const emi = UnderwritingAgent.calculateEMI(
      state.customerData.loanAmount,
      state.customerData.tenure || 36,
      interestRate
    );

    const sanctionLetter = {
      sanctionId: 'SANC-' + Date.now().toString(36).toUpperCase(),
      sessionId: state.sessionId,
      status: "APPROVED",
      sanctionDate: sanctionDate.toLocaleDateString(),
      validTill: validTill.toLocaleDateString(),
      
      applicant: {
        name: state.customerData.name || state.verifiedData.customerProfile?.name || "Applicant",
        pan: state.customerData.panNumber,
        creditScore: state.verifiedData.creditScore
      },

      loanDetails: {
        amount: state.customerData.loanAmount,
        tenure: state.customerData.tenure || 36,
        interestRate: interestRate,
        emi: Math.round(emi),
        processingFee: processingFee,
        totalPayable: Math.round(emi * (state.customerData.tenure || 36))
      },

      confidenceBreakdown: {
        intent: state.confidence.intent,
        identity: state.confidence.identity,
        income: state.confidence.income,
        credit: state.confidence.credit,
        overall: state.confidence.overall  // This will be 92-96% due to caps and weights
      },
      riskAssessment: state.riskStatus,
      riskRationale: state.riskRationale || "Profile meets all approval criteria with acceptable risk parameters",

      terms: [
        "Loan disbursement subject to document verification",
        "Interest rate may vary based on RBI guidelines",
        "Processing fee is non-refundable",
        "Insurance is optional but recommended"
      ]
    };

    logActivity(this.name, "GENERATED", 
      `Sanction Letter: ${sanctionLetter.sanctionId}`,
      `Loan Amount: ₹${state.customerData.loanAmount?.toLocaleString()} @ ${interestRate}% p.a.`
    );

    if (!state.completedAgents.includes(this.name)) {
      state.completedAgents.push(this.name);
    }

    return sanctionLetter;
  },

  calculateInterestRate() {
    // Base rate + risk adjustment
    let baseRate = 10.5;
    const creditScore = state.verifiedData.creditScore || 700;
    
    if (creditScore >= 800) baseRate -= 1.5;
    else if (creditScore >= 750) baseRate -= 1.0;
    else if (creditScore >= 700) baseRate -= 0.5;
    else if (creditScore < 650) baseRate += 2.0;

    return Math.round(baseRate * 10) / 10;
  }
};

// ============================================================
// PUBLIC API FUNCTIONS
// ============================================================

// Called when user submits chat/intent data
function processIntentData(loanAmount, tenure, purpose, employmentType, incomeRange) {
  return SalesAgent.processIntent(loanAmount, tenure, purpose, employmentType, incomeRange);
}

// Called for DigiLocker OAuth verification
function verifyViaDigiLocker() {
  return VerificationAgent.verifyViaDigiLocker();
}

// Called when PAN is uploaded manually
function uploadPAN(panNumber = null) {
  return VerificationAgent.verifyPAN(panNumber);
}

// Called when salary slip is uploaded
function uploadSalarySlip(filename = 'salary_slip.pdf') {
  return UnderwritingAgent.verifySalarySlip(filename);
}

// Called to trigger underwriting evaluation
function triggerUnderwriting() {
  return UnderwritingAgent.evaluateCredit();
}

// Check if sanction can be generated
function canGenerateSanctionLetter() {
  return SanctionGenerator.canGenerate();
}

// Generate sanction letter
function generateSanctionLetter() {
  return SanctionGenerator.generate();
}

// Get current state for UI
function getCurrentState() {
  return {
    decisionState: state.decisionState,
    overallConfidence: state.confidence.overall,
    intentConfidence: state.confidence.intent,
    identityConfidence: state.confidence.identity,
    incomeConfidence: state.confidence.income,
    creditConfidence: state.confidence.credit,
    activeAgent: state.activeAgent,
    riskStatus: state.riskStatus,
    riskRationale: state.riskRationale,
    riskFactors: [...state.riskFactors],
    uploadedDocuments: {
      pan: state.documents.pan.uploaded,
      salarySlip: state.documents.salarySlip.uploaded
    },
    salarySlipRequired: state.documents.salarySlip.required,
    customerData: { ...state.customerData },
    verifiedData: { ...state.verifiedData },
    activityLog: [...state.activityLog],
    completedAgents: [...state.completedAgents],
    sessionId: state.sessionId
  };
}

// Get activity log
function getActivityLog() {
  return [...state.activityLog];
}

// Get rejection reason
function getRejectionReason() {
  return MasterAgent.getRejectionReason();
}

// Check if application is rejected
function isApplicationRejected() {
  return state.decisionState === "REJECTED";
}

// Reset for demo
function resetState() {
  state.decisionState = "PENDING";
  state.confidence = { intent: 0, identity: 0, income: 0, credit: 0, overall: 0 };
  state.customerData = { loanAmount: null, tenure: null, purpose: null, employmentType: null, monthlyIncome: null, panNumber: null, name: null };
  state.verifiedData = { panVerified: false, customerProfile: null, creditScore: null, creditScoreCategory: null, incomeVerified: false, salarySlipData: null, eligibilityRatio: null };
  state.activeAgent = null;
  state.agentQueue = [];
  state.completedAgents = [];
  state.riskStatus = "UNKNOWN";
  state.riskRationale = "";
  state.riskFactors = [];
  STAGNATION_CONFIG.currentAttempts = 0;
  STAGNATION_CONFIG.lastConfidence = 0;
  state.documents = { pan: { uploaded: false, filename: null, timestamp: null }, salarySlip: { uploaded: false, filename: null, timestamp: null, required: false } };
  state.activityLog = [];
  state.sessionId = generateSessionId();
  state.sessionStart = new Date().toISOString();
  state.lastUpdated = null;

  logActivity("System", "RESET", "Session reset - new loan application started");
}

// Initialize with welcome log
logActivity("System", "INIT", `Session started: ${state.sessionId}`);
logActivity("Master Agent", "READY", "Agentic loan decisioning system initialized", "Awaiting customer input");
