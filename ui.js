/**
 * ============================================================
 * UI CONTROLLER
 * Agentic AI Loan Decisioning System
 * ============================================================
 * Handles all UI interactions and state synchronization.
 * Reads from loanDecisionLogic.js and updates the interface.
 * ============================================================
 */

// ============================================================
// STATE TRACKING
// ============================================================
let currentStep = 1;
let collectedData = {
  loanAmount: null,
  tenure: null,
  purpose: null,
  employmentType: null,
  incomeRange: null
};

// ============================================================
// DOM ELEMENTS - Will be populated after DOMContentLoaded
// ============================================================
let elements = {};

function initializeElements() {
  elements = {
    // Session
    sessionId: document.getElementById('sessionId'),
    resetBtn: document.getElementById('resetBtn'),

    // Chat
    chatMessages: document.getElementById('chatMessages'),

    // Form steps
    formStep1: document.getElementById('formStep1'),
    formStep2: document.getElementById('formStep2'),
    formStep3: document.getElementById('formStep3'),
    formStep4: document.getElementById('formStep4'),
    documentsStep: document.getElementById('documentsStep'),

    // Inputs
    loanAmount: document.getElementById('loanAmount'),
    tenure: document.getElementById('tenure'),
    submitStep1: document.getElementById('submitStep1'),

    // Document uploads
    uploadPANBtn: document.getElementById('uploadPANBtn'),
    uploadSalaryBtn: document.getElementById('uploadSalaryBtn'),
    panDocStatus: document.getElementById('panDocStatus'),
    salaryDocStatus: document.getElementById('salaryDocStatus'),
    panCard: document.getElementById('panCard'),
    salaryCard: document.getElementById('salaryCard'),

    // Decision panel
    decisionState: document.getElementById('decisionState'),
    activeAgent: document.getElementById('activeAgent'),
    riskStatus: document.getElementById('riskStatus'),
    riskRationale: document.getElementById('riskRationale'),
    overallConfidenceValue: document.getElementById('overallConfidenceValue'),
    overallConfidenceBar: document.getElementById('overallConfidenceBar'),

    // Confidence breakdown
    intentConfidenceValue: document.getElementById('intentConfidenceValue'),
    intentConfidenceBar: document.getElementById('intentConfidenceBar'),
    identityConfidenceValue: document.getElementById('identityConfidenceValue'),
    identityConfidenceBar: document.getElementById('identityConfidenceBar'),
    incomeConfidenceValue: document.getElementById('incomeConfidenceValue'),
    incomeConfidenceBar: document.getElementById('incomeConfidenceBar'),
    creditConfidenceValue: document.getElementById('creditConfidenceValue'),
    creditConfidenceBar: document.getElementById('creditConfidenceBar'),

    // Customer data
    customerDataCard: document.getElementById('customerDataCard'),
    customerName: document.getElementById('customerName'),
    customerPAN: document.getElementById('customerPAN'),
    creditScoreDisplay: document.getElementById('creditScoreDisplay'),
    verifiedIncomeDisplay: document.getElementById('verifiedIncomeDisplay'),
    incomeRow: document.getElementById('incomeRow'),

    // Sanction
    generateSanctionBtn: document.getElementById('generateSanctionBtn'),
    sanctionOutput: document.getElementById('sanctionOutput'),

    // Activity log
    activityLog: document.getElementById('activityLog'),

    // Pipeline
    pipelineSales: document.getElementById('pipelineSales'),
    pipelineVerification: document.getElementById('pipelineVerification'),
    pipelineUnderwriting: document.getElementById('pipelineUnderwriting'),
    pipelineSanction: document.getElementById('pipelineSanction'),

    // Modal
    sanctionModal: document.getElementById('sanctionModal'),
    sanctionLetterContent: document.getElementById('sanctionLetterContent'),
    closeModal: document.getElementById('closeModal')
  };
  
  console.log('Elements initialized:', Object.keys(elements).filter(k => elements[k] !== null).length, 'found');
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing...');
  
  // First, initialize all DOM element references
  initializeElements();
  
  // Then initialize UI and bind events
  initializeUI();
  bindEventListeners();
  refreshUI();
  
  console.log('Initialization complete');
});

function initializeUI() {
  const state = getCurrentState();
  if (elements.sessionId) {
    elements.sessionId.textContent = state.sessionId;
  }
  showStep(1);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function bindEventListeners() {
  // Step 1: Loan details
  if (elements.submitStep1) {
    console.log('Binding click event to submitStep1');
    elements.submitStep1.addEventListener('click', handleStep1Submit);
  } else {
    console.error('submitStep1 button not found!');
  }

  // Purpose buttons
  document.querySelectorAll('.purpose-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handlePurposeSelect(e.currentTarget.dataset.purpose));
  });

  // Employment buttons
  document.querySelectorAll('.employment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleEmploymentSelect(e.currentTarget.dataset.employment));
  });

  // Income buttons
  document.querySelectorAll('.income-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleIncomeSelect(e.currentTarget.dataset.income));
  });

  // KYC verification choice
  const digilockerBtn = document.getElementById('digilockerBtn');
  const manualUploadBtn = document.getElementById('manualUploadBtn');
  if (digilockerBtn) {
    digilockerBtn.addEventListener('click', handleDigiLockerVerification);
  }
  if (manualUploadBtn) {
    manualUploadBtn.addEventListener('click', handleManualUploadChoice);
  }

  // Document uploads
  elements.uploadPANBtn.addEventListener('click', handlePANUpload);
  elements.uploadSalaryBtn.addEventListener('click', handleSalaryUpload);

  // Sanction generation
  elements.generateSanctionBtn.addEventListener('click', handleSanctionGeneration);

  // Reset
  elements.resetBtn.addEventListener('click', handleReset);

  // Modal close
  elements.closeModal.addEventListener('click', () => {
    elements.sanctionModal.classList.remove('active');
  });

  // Close modal on outside click
  elements.sanctionModal.addEventListener('click', (e) => {
    if (e.target === elements.sanctionModal) {
      elements.sanctionModal.classList.remove('active');
    }
  });
}

// ============================================================
// STEP HANDLERS
// ============================================================
function showStep(step) {
  // Hide all steps
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  
  // Show requested step
  const stepElement = document.getElementById(`formStep${step}`);
  if (stepElement) {
    stepElement.classList.add('active');
    currentStep = step;
  }
}

function handleStep1Submit(e) {
  console.log('handleStep1Submit called');
  
  if (e) {
    e.preventDefault();
  }

  if (!elements.loanAmount || !elements.tenure) {
    console.error('Form elements not found:', {
      loanAmount: elements.loanAmount,
      tenure: elements.tenure
    });
    return;
  }

  const loanAmount = elements.loanAmount.value.trim();
  const tenure = elements.tenure.value.trim();

  console.log('Form values:', { loanAmount, tenure });

  if (!loanAmount || !tenure) {
    alert('Please enter both loan amount and tenure.');
    return;
  }

  const loanAmountNum = parseFloat(loanAmount);
  const tenureNum = parseInt(tenure);

  if (isNaN(loanAmountNum) || loanAmountNum < 50000 || loanAmountNum > 5000000) {
    alert('Please enter a valid loan amount between ₹50,000 and ₹50,00,000');
    return;
  }

  if (isNaN(tenureNum) || tenureNum < 6 || tenureNum > 84) {
    alert('Please enter a valid tenure between 6 and 84 months');
    return;
  }

  collectedData.loanAmount = loanAmountNum;
  collectedData.tenure = tenureNum;

  // Add chat message
  addChatMessage('user', `I need a loan of ₹${loanAmountNum.toLocaleString()} for ${tenureNum} months.`);

  // Process partial intent
  processIntentData(collectedData.loanAmount, collectedData.tenure, null, null, null);

  // Bot response
  setTimeout(() => {
    addChatMessage('bot', 'Great! I\'ve noted your loan requirements. What\'s the primary purpose of this loan?');
    showStep(2);
    refreshUI();
  }, 500);
}

function handlePurposeSelect(purpose) {
  collectedData.purpose = purpose;

  // Highlight selected
  document.querySelectorAll('.purpose-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`[data-purpose="${purpose}"]`).classList.add('selected');

  const purposeLabels = {
    'home_improvement': 'Home Improvement',
    'education': 'Education',
    'medical': 'Medical Expenses',
    'wedding': 'Wedding',
    'travel': 'Travel',
    'debt_consolidation': 'Debt Consolidation',
    'other': 'Other Purpose'
  };

  addChatMessage('user', `Purpose: ${purposeLabels[purpose]}`);

  // Process updated intent
  processIntentData(collectedData.loanAmount, collectedData.tenure, purpose, null, null);

  setTimeout(() => {
    addChatMessage('bot', 'Thanks! Now, could you tell me about your employment status?');
    showStep(3);
    refreshUI();
  }, 500);
}

function handleEmploymentSelect(employment) {
  collectedData.employmentType = employment;

  // Highlight selected
  document.querySelectorAll('.employment-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`[data-employment="${employment}"]`).classList.add('selected');

  const empLabels = {
    'salaried': 'Salaried Employee',
    'self-employed': 'Self-Employed Professional',
    'business': 'Business Owner'
  };

  addChatMessage('user', `Employment: ${empLabels[employment]}`);

  // Process updated intent
  processIntentData(null, null, null, employment, null);

  setTimeout(() => {
    addChatMessage('bot', 'Perfect! Lastly, what\'s your approximate monthly income range?');
    showStep(4);
    refreshUI();
  }, 500);
}

function handleIncomeSelect(income) {
  collectedData.incomeRange = income;

  // Highlight selected
  document.querySelectorAll('.income-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector(`[data-income="${income}"]`).classList.add('selected');

  const incomeLabels = {
    '0-25000': '₹0 - ₹25,000',
    '25000-50000': '₹25,000 - ₹50,000',
    '50000-100000': '₹50,000 - ₹1,00,000',
    '100000+': 'Above ₹1,00,000'
  };

  addChatMessage('user', `Monthly Income: ${incomeLabels[income]}`);

  // Process final intent
  processIntentData(null, null, null, null, income);

  setTimeout(() => {
    addChatMessage('bot', 'Excellent! I\'ve captured all your loan requirements. Now, please upload your documents for verification.');
    elements.documentsStep.classList.add('active');
    document.getElementById('formStep4').classList.remove('active');
    refreshUI();
  }, 500);
}

// ============================================================
// KYC VERIFICATION HANDLERS
// ============================================================
function handleDigiLockerVerification() {
  addChatMessage('user', 'Initiating DigiLocker verification...');
  
  // Hide choice section
  document.getElementById('kycChoiceSection').style.display = 'none';
  
  // Show DigiLocker OAuth flow
  const digilockerFlow = document.getElementById('digilockerFlow');
  digilockerFlow.style.display = 'block';
  
  const oauthStatus = document.getElementById('oauthStatus');
  
  // Simulate OAuth steps
  setTimeout(() => {
    oauthStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting to DigiLocker...';
  }, 800);
  
  setTimeout(() => {
    oauthStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> User authentication in progress...';
  }, 1800);
  
  setTimeout(() => {
    oauthStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching verified documents...';
  }, 2800);
  
  setTimeout(() => {
    // Call DigiLocker verification
    const result = verifyViaDigiLocker();
    
    oauthStatus.innerHTML = '<i class="fas fa-check-circle" style="color: #4caf50;"></i> Verification successful!';
    
    const state = getCurrentState();
    const customer = state.verifiedData.customerProfile;
    
    addChatMessage('bot', 
      `✓ DigiLocker verification complete!<br>` +
      `<strong>Name:</strong> ${customer.name}<br>` +
      `<strong>PAN:</strong> ${state.customerData.panNumber}<br>` +
      `<strong>DOB:</strong> ${customer.dob}<br>` +
      `<strong>Address:</strong> ${customer.address.city}, ${customer.address.state}<br>` +
      `<strong>Credit Score:</strong> ${state.verifiedData.creditScore}`
    );
    
    // Check for rejection after DigiLocker verification
    if (isApplicationRejected()) {
      const reason = getRejectionReason();
      setTimeout(() => {
        addChatMessage('bot', `❌ We're sorry, but we are unable to approve your loan application at this time because ${reason}. Please feel free to apply again in the future or contact our support team for more information.`);
      }, 1000);
    }
    
    // Show customer data card
    elements.customerDataCard.style.display = 'block';
    
    // Hide DigiLocker flow and show salary slip section
    setTimeout(() => {
      digilockerFlow.style.display = 'none';
      document.getElementById('salarySlipSection').style.display = 'block';
    }, 1000);
    
    refreshUI();
  }, 3800);
}

function handleManualUploadChoice() {
  addChatMessage('user', 'I\'ll upload my PAN card manually');
  
  // Hide choice section
  document.getElementById('kycChoiceSection').style.display = 'none';
  
  // Show manual PAN section
  document.getElementById('manualPanSection').style.display = 'block';
  
  addChatMessage('bot', 'Please upload your PAN card document for manual verification.');
}

// ============================================================
// DOCUMENT HANDLERS
// ============================================================
function handlePANUpload() {
  // Simulate file selection
  addChatMessage('user', 'Uploading PAN Card document...');
  
  // Disable button during "upload"
  elements.uploadPANBtn.disabled = true;
  elements.uploadPANBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

  setTimeout(() => {
    // Call logic
    const result = uploadPAN();

    // Update UI
    const panCard = document.getElementById('panCard');
    panCard.classList.add('uploaded');
    const panDocStatus = document.getElementById('panDocStatus');
    panDocStatus.textContent = 'Verified ✓';
    elements.uploadPANBtn.innerHTML = '<i class="fas fa-check"></i> Verified';
    elements.uploadPANBtn.classList.add('verified');

    const state = getCurrentState();
    addChatMessage('bot', `PAN verification complete! Your identity has been confirmed as ${state.customerData.name}. Credit score: ${state.verifiedData.creditScore}`);

    // Check for rejection after PAN verification
    if (isApplicationRejected()) {
      const reason = getRejectionReason();
      setTimeout(() => {
        addChatMessage('bot', `❌ We're sorry, but we are unable to approve your loan application at this time because ${reason}. Please feel free to apply again in the future or contact our support team for more information.`);
      }, 1000);
    }

    // Show customer data card
    elements.customerDataCard.style.display = 'block';

    // Show salary slip section after manual PAN verification
    document.getElementById('salarySlipSection').style.display = 'block';

    refreshUI();
  }, 1500);
}

function handleSalaryUpload() {
  addChatMessage('user', 'Uploading Salary Slip...');

  elements.uploadSalaryBtn.disabled = true;
  elements.uploadSalaryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> OCR Processing...';

  setTimeout(() => {
    const result = uploadSalarySlip('salary_slip.pdf');

    elements.salaryCard.classList.add('uploaded');
    elements.salaryDocStatus.textContent = 'OCR Verified ✓';
    elements.uploadSalaryBtn.innerHTML = '<i class="fas fa-check"></i> Verified';
    elements.uploadSalaryBtn.classList.add('verified');

    const state = getCurrentState();
    if (state.verifiedData.salarySlipData) {
      const salaryData = state.verifiedData.salarySlipData;
      const declaredIncome = state.customerData.monthlyIncome || 50000;
      const variance = result.variance || 0;
      
      let message = `✓ OCR extraction complete! Net salary: ₹${Math.round(salaryData.netSalary).toLocaleString()} (Gross: ₹${salaryData.grossSalary.toLocaleString()})`;
      
      if (variance < 10) {
        message += ` - Matches declared income closely (variance: ${variance}%)`;
      } else if (variance < 25) {
        message += ` - Moderate variance from declared income (${variance}%)`;
      }
      
      addChatMessage('bot', message);
    }

    // Check for rejection after salary verification
    if (isApplicationRejected()) {
      const reason = getRejectionReason();
      setTimeout(() => {
        addChatMessage('bot', `❌ We're sorry, but we are unable to approve your loan application at this time because ${reason}. Please feel free to apply again in the future or contact our support team for more information.`);
      }, 1000);
    }

    refreshUI();
  }, 2000);
}

// ============================================================
// SANCTION HANDLER
// ============================================================
function handleSanctionGeneration() {
  if (!canGenerateSanctionLetter()) {
    alert('Confidence threshold not met for sanction generation.');
    return;
  }

  const sanctionLetter = generateSanctionLetter();

  if (sanctionLetter) {
    // Generate sanction letter HTML
    const letterHTML = generateSanctionLetterHTML(sanctionLetter);
    elements.sanctionLetterContent.innerHTML = letterHTML;
    elements.sanctionModal.classList.add('active');

    addChatMessage('bot', `🎉 Congratulations! Your loan has been approved! Sanction ID: ${sanctionLetter.sanctionId}`);

    refreshUI();
  }
}

function generateSanctionLetterHTML(letter) {
  return `
    <div class="sanction-letter-body">
      <div class="letter-header">
        <div class="company-logo">
          <i class="fas fa-building-columns"></i>
          <span>TATA Capital Financial Services Ltd.</span>
        </div>
        <div class="sanction-badge">
          <i class="fas fa-check-circle"></i>
          ${letter.status}
        </div>
      </div>

      <div class="letter-ref">
        <div class="ref-item">
          <span class="ref-label">Sanction ID:</span>
          <span class="ref-value">${letter.sanctionId}</span>
        </div>
        <div class="ref-item">
          <span class="ref-label">Date:</span>
          <span class="ref-value">${letter.sanctionDate}</span>
        </div>
        <div class="ref-item">
          <span class="ref-label">Valid Till:</span>
          <span class="ref-value">${letter.validTill}</span>
        </div>
      </div>

      <div class="letter-section">
        <div class="section-title">Applicant Details</div>
        <div class="applicant-info">
          <div class="info-row">
            <span>Name:</span>
            <strong>${letter.applicant.name}</strong>
          </div>
          <div class="info-row">
            <span>PAN:</span>
            <strong>${letter.applicant.pan}</strong>
          </div>
          <div class="info-row">
            <span>Credit Score:</span>
            <strong>${letter.applicant.creditScore}</strong>
          </div>
        </div>
      </div>

      <div class="letter-section">
        <div class="section-title">Loan Details</div>
        <table class="loan-table">
          <tr>
            <td>Loan Amount</td>
            <td class="amount">₹${letter.loanDetails.amount?.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Tenure</td>
            <td>${letter.loanDetails.tenure} months</td>
          </tr>
          <tr>
            <td>Interest Rate</td>
            <td>${letter.loanDetails.interestRate}% p.a.</td>
          </tr>
          <tr>
            <td>EMI</td>
            <td class="amount">₹${letter.loanDetails.emi?.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Processing Fee</td>
            <td>₹${letter.loanDetails.processingFee?.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>Total Amount Payable</td>
            <td class="amount">₹${letter.loanDetails.totalPayable?.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="letter-section">
        <div class="section-title">AI Confidence Assessment</div>
        <div class="confidence-summary">
          <div class="conf-item">
            <span>Intent</span>
            <div class="conf-bar"><div style="width: ${letter.confidenceBreakdown.intent}%"></div></div>
            <span>${letter.confidenceBreakdown.intent}%</span>
          </div>
          <div class="conf-item">
            <span>Identity</span>
            <div class="conf-bar"><div style="width: ${letter.confidenceBreakdown.identity}%"></div></div>
            <span>${letter.confidenceBreakdown.identity}%</span>
          </div>
          <div class="conf-item">
            <span>Income</span>
            <div class="conf-bar"><div style="width: ${letter.confidenceBreakdown.income}%"></div></div>
            <span>${letter.confidenceBreakdown.income}%</span>
          </div>
          <div class="conf-item">
            <span>Credit</span>
            <div class="conf-bar"><div style="width: ${letter.confidenceBreakdown.credit}%"></div></div>
            <span>${letter.confidenceBreakdown.credit}%</span>
          </div>
          <div class="conf-overall">
            <strong>Overall Confidence: ${letter.confidenceBreakdown.overall}%</strong>
            <span class="risk-label ${letter.riskAssessment.toLowerCase()}">${letter.riskAssessment} Risk</span>
          </div>
          <div class="risk-rationale-box">
            <i class="fas fa-info-circle"></i>
            ${letter.riskRationale || 'Risk assessment based on multi-factor analysis'}
          </div>
        </div>
      </div>

      <div class="letter-section terms">
        <div class="section-title">Terms & Conditions</div>
        <ul>
          ${letter.terms.map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>

      <div class="letter-footer">
        <div class="signature">
          <div class="sig-line"></div>
          <div class="sig-name">Authorized Signatory</div>
          <div class="sig-title">TATA Capital Financial Services Ltd.</div>
        </div>
        <div class="stamp">
          <i class="fas fa-certificate"></i>
          <span>AI Verified</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// CHAT FUNCTIONS
// ============================================================
function addChatMessage(type, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type === 'bot' ? 'bot-message' : 'user-message'}`;

  if (type === 'bot') {
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message-content">
        <div class="message-header">AI Assistant</div>
        <div class="message-text">${text}</div>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-header">You</div>
        <div class="message-text">${text}</div>
      </div>
      <div class="message-avatar user">
        <i class="fas fa-user"></i>
      </div>
    `;
  }

  elements.chatMessages.appendChild(messageDiv);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ============================================================
// RESET HANDLER
// ============================================================
function handleReset() {
  if (confirm('Reset the entire session? All progress will be lost.')) {
    resetState();
    
    // Reset UI state
    currentStep = 1;
    collectedData = {
      loanAmount: null,
      tenure: null,
      purpose: null,
      employmentType: null,
      incomeRange: null
    };

    // Clear chat except welcome
    elements.chatMessages.innerHTML = `
      <div class="chat-message bot-message">
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          <div class="message-header">AI Assistant</div>
          <div class="message-text">
            Welcome to TATA Capital! I'm here to help you with your personal loan application. 
            Let's start by understanding your loan requirements.
          </div>
        </div>
      </div>
    `;

    // Reset form
    elements.loanAmount.value = '';
    elements.tenure.value = '';
    document.querySelectorAll('.purpose-btn, .employment-btn, .income-btn').forEach(b => {
      b.classList.remove('selected');
    });

    // Reset document uploads
    elements.panCard.classList.remove('uploaded');
    elements.salaryCard.classList.remove('uploaded');
    elements.uploadPANBtn.disabled = false;
    elements.uploadPANBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
    elements.uploadPANBtn.classList.remove('verified');
    elements.uploadSalaryBtn.disabled = false;
    elements.uploadSalaryBtn.innerHTML = '<i class="fas fa-upload"></i> Upload';
    elements.uploadSalaryBtn.classList.remove('verified');
    elements.panDocStatus.textContent = 'Required for KYC';
    elements.salaryDocStatus.textContent = 'Optional - boosts approval';

    // Hide customer card
    elements.customerDataCard.style.display = 'none';

    // Hide documents step
    elements.documentsStep.classList.remove('active');

    // Show step 1
    showStep(1);

    // Refresh UI
    refreshUI();

    // Update session ID
    const state = getCurrentState();
    elements.sessionId.textContent = state.sessionId;
  }
}

// ============================================================
// REFRESH UI
// ============================================================
function refreshUI() {
  const state = getCurrentState();

  // Decision state
  elements.decisionState.textContent = state.decisionState;
  elements.decisionState.setAttribute('data-state', state.decisionState);

  // Active agent
  const agentIcons = {
    'Sales Agent': 'fa-handshake',
    'Verification Agent': 'fa-shield-check',
    'Underwriting Agent': 'fa-scale-balanced',
    'Sanction Generator': 'fa-file-contract',
    'Master Agent': 'fa-robot'
  };
  const agentIcon = agentIcons[state.activeAgent] || 'fa-clock';
  elements.activeAgent.innerHTML = `<i class="fas ${agentIcon}"></i> ${state.activeAgent || 'Awaiting'}`;

  // Risk status with rationale
  elements.riskStatus.innerHTML = `<i class="fas fa-shield"></i> ${state.riskStatus}`;
  elements.riskStatus.setAttribute('data-risk', state.riskStatus);
  
  // Update risk rationale if element exists
  if (elements.riskRationale && state.riskRationale) {
    elements.riskRationale.textContent = state.riskRationale;
    elements.riskRationale.style.display = 'block';
  } else if (elements.riskRationale) {
    elements.riskRationale.style.display = 'none';
  }

  // Overall confidence
  elements.overallConfidenceValue.textContent = `${state.overallConfidence}%`;
  elements.overallConfidenceBar.style.width = `${state.overallConfidence}%`;
  
  // Set color based on confidence level
  if (state.overallConfidence >= 90) {
    elements.overallConfidenceBar.setAttribute('data-level', 'approved');
  } else if (state.overallConfidence >= 70) {
    elements.overallConfidenceBar.setAttribute('data-level', 'review');
  } else if (state.overallConfidence >= 50) {
    elements.overallConfidenceBar.setAttribute('data-level', 'processing');
  } else {
    elements.overallConfidenceBar.setAttribute('data-level', 'pending');
  }

  // Confidence breakdown
  updateConfidenceBar('intent', state.intentConfidence);
  updateConfidenceBar('identity', state.identityConfidence);
  updateConfidenceBar('income', state.incomeConfidence);
  updateConfidenceBar('credit', state.creditConfidence);

  // Customer data
  if (state.verifiedData.customerProfile) {
    elements.customerName.textContent = state.customerData.name || '--';
    elements.customerPAN.textContent = state.customerData.panNumber || '--';
    elements.creditScoreDisplay.textContent = state.verifiedData.creditScore || '--';
    
    // Color code credit score
    const score = state.verifiedData.creditScore;
    if (score >= 750) {
      elements.creditScoreDisplay.className = 'customer-value credit-score excellent';
    } else if (score >= 700) {
      elements.creditScoreDisplay.className = 'customer-value credit-score good';
    } else if (score >= 650) {
      elements.creditScoreDisplay.className = 'customer-value credit-score fair';
    } else {
      elements.creditScoreDisplay.className = 'customer-value credit-score poor';
    }
  }

  // Display OCR-extracted income if available
  if (state.verifiedData.salarySlipData && elements.incomeRow) {
    const salaryData = state.verifiedData.salarySlipData;
    const declaredIncome = state.customerData.monthlyIncome || 0;
    const extractedNet = Math.round(salaryData.netSalary);
    
    let incomeText = `₹${extractedNet.toLocaleString()}`;
    
    // Add variance indicator if declared income exists
    if (declaredIncome > 0) {
      const variance = Math.abs(extractedNet - declaredIncome) / declaredIncome * 100;
      if (variance < 10) {
        incomeText += ` ✓`;
      } else if (variance < 25) {
        incomeText += ` (~${variance.toFixed(0)}% var)`;
      } else {
        incomeText += ` ⚠ ${variance.toFixed(0)}% var`;
      }
    }
    
    if (salaryData.ocrConfidence) {
      incomeText += ` (${salaryData.ocrConfidence}% OCR)`;
    }
    
    elements.verifiedIncomeDisplay.textContent = incomeText;
    elements.incomeRow.style.display = 'flex';
  }

  // Sanction button
  const canSanction = canGenerateSanctionLetter();
  elements.generateSanctionBtn.disabled = !canSanction;
  if (canSanction) {
    elements.generateSanctionBtn.classList.add('ready');
  } else {
    elements.generateSanctionBtn.classList.remove('ready');
  }

  // Update salary slip requirement label
  if (state.salarySlipRequired) {
    elements.salaryDocStatus.textContent = 'Required for approval';
    elements.salaryDocStatus.classList.add('required');
  }

  // Update activity log
  updateActivityLog(state.activityLog);

  // Update pipeline
  updatePipeline(state);
}

function updateConfidenceBar(type, value) {
  const bar = document.getElementById(`${type}ConfidenceBar`);
  const val = document.getElementById(`${type}ConfidenceValue`);
  
  if (bar && val) {
    bar.style.width = `${value}%`;
    val.textContent = `${value}%`;
    
    // Set color
    if (value >= 90) {
      bar.setAttribute('data-level', 'high');
    } else if (value >= 50) {
      bar.setAttribute('data-level', 'medium');
    } else {
      bar.setAttribute('data-level', 'low');
    }
  }
}

function updateActivityLog(log) {
  elements.activityLog.innerHTML = '';

  if (log.length === 0) {
    elements.activityLog.innerHTML = '<div class="activity-empty">No activity yet. Start by entering loan details.</div>';
    return;
  }

  // Show latest first
  const reversedLog = [...log].reverse();

  reversedLog.forEach(entry => {
    const entryDiv = document.createElement('div');
    entryDiv.className = `activity-entry ${entry.action.toLowerCase()}`;

    const actionIcons = {
      'INIT': 'fa-play',
      'READY': 'fa-check-circle',
      'TRIGGERED': 'fa-bolt',
      'CAPTURED': 'fa-keyboard',
      'VERIFIED': 'fa-shield-check',
      'CONFIDENCE_UPDATE': 'fa-chart-simple',
      'EVALUATE': 'fa-magnifying-glass-chart',
      'ANALYSIS': 'fa-brain',
      'DECISION': 'fa-gavel',
      'STATE_CHANGE': 'fa-toggle-on',
      'ORCHESTRATE': 'fa-diagram-project',
      'COMPLETE': 'fa-flag-checkered',
      'APPROVED': 'fa-circle-check',
      'REJECTED': 'fa-circle-xmark',
      'CREDIT_SCORE': 'fa-credit-card',
      'API_CALL': 'fa-server',
      'GENERATED': 'fa-file-signature',
      'DTI_ANALYSIS': 'fa-calculator',
      'SALARY_VERIFIED': 'fa-money-check-dollar',
      'RESET': 'fa-rotate'
    };

    const icon = actionIcons[entry.action] || 'fa-circle-dot';

    entryDiv.innerHTML = `
      <div class="activity-time">${entry.displayTime}</div>
      <div class="activity-icon"><i class="fas ${icon}"></i></div>
      <div class="activity-content">
        <div class="activity-agent">${entry.agent}</div>
        <div class="activity-action">${entry.action}</div>
        <div class="activity-details">${entry.details}</div>
        ${entry.impact ? `<div class="activity-impact">${entry.impact}</div>` : ''}
      </div>
    `;

    elements.activityLog.appendChild(entryDiv);
  });
}

function updatePipeline(state) {
  // Reset all
  document.querySelectorAll('.pipeline-item').forEach(item => {
    item.classList.remove('active', 'complete', 'locked');
    item.querySelector('.pipeline-status').textContent = 'Idle';
  });

  // Sales Agent
  if (state.intentConfidence > 0) {
    elements.pipelineSales.classList.add(state.intentConfidence >= 75 ? 'complete' : 'active');
    elements.pipelineSales.querySelector('.pipeline-status').textContent = 
      state.intentConfidence >= 75 ? 'Complete' : 'Active';
  }

  // Verification Agent
  if (state.identityConfidence > 0) {
    elements.pipelineVerification.classList.add(state.identityConfidence >= 100 ? 'complete' : 'active');
    elements.pipelineVerification.querySelector('.pipeline-status').textContent = 
      state.identityConfidence >= 100 ? 'Complete' : 'Active';
  }

  // Underwriting Agent
  if (state.incomeConfidence > 0 || state.creditConfidence > 0) {
    const underwritingComplete = state.incomeConfidence >= 70 && state.creditConfidence >= 70;
    elements.pipelineUnderwriting.classList.add(underwritingComplete ? 'complete' : 'active');
    elements.pipelineUnderwriting.querySelector('.pipeline-status').textContent = 
      underwritingComplete ? 'Complete' : 'Active';
  }

  // Sanction
  if (state.overallConfidence >= 90) {
    elements.pipelineSanction.classList.add('complete');
    elements.pipelineSanction.querySelector('.pipeline-status').textContent = 'Ready';
  } else {
    elements.pipelineSanction.classList.add('locked');
    elements.pipelineSanction.querySelector('.pipeline-status').textContent = 
      `Locked (${90 - state.overallConfidence}% needed)`;
  }

  // Highlight current active agent
  const agentPipelineMap = {
    'Sales Agent': elements.pipelineSales,
    'Verification Agent': elements.pipelineVerification,
    'Underwriting Agent': elements.pipelineUnderwriting,
    'Sanction Generator': elements.pipelineSanction
  };

  if (state.activeAgent && agentPipelineMap[state.activeAgent]) {
    agentPipelineMap[state.activeAgent].classList.add('active');
  }
}
